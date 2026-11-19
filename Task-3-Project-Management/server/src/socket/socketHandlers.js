import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { isProjectMember } from '../utils/permissions.js';
import config from '../config/env.js';

const getHandshakeToken = (handshake) => {
  const authHeader = handshake?.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const authToken = handshake?.auth?.token;
  return typeof authToken === 'string' ? authToken : undefined;
};

// Track authenticated user sockets for immediate access revocation.
// Key: userId (string) -> Value: Set of socketIds
const userSockets = new Map();

export const getUserSockets = (userId) => {
  const key = userId.toString();
  return userSockets.get(key) || new Set();
};

export const trackSocket = (userId, socketId) => {
  const key = userId.toString();
  if (!userSockets.has(key)) userSockets.set(key, new Set());
  userSockets.get(key).add(socketId);
};

export const untrackSocket = (userId, socketId) => {
  const key = userId.toString();
  const set = userSockets.get(key);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) userSockets.delete(key);
  }
};

export const kickUserFromProject = (io, userId, projectId) => {
  const sockets = getUserSockets(userId);
  sockets.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(`project:${projectId}`);
      socket.emit('project:access_revoked', { projectId });
    }
  });
};

export const registerSocketHandlers = (io) => {
  // Authenticate every socket connection before it can join rooms.
  io.use(async (socket, next) => {
    try {
      const token = getHandshakeToken(socket.handshake);
      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (!decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
        return next(new Error('Authentication failed.'));
      }

      const user = await User.findById(decoded.id).select('_id name email role');
      if (!user) return next(new Error('Authentication failed.'));

      socket.user = user;
      return next();
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        return next(new Error('Token expired.'));
      }
      return next(new Error('Authentication failed.'));
    }
  });

  io.on('connection', (socket) => {
    trackSocket(socket.user._id, socket.id);

    // Join a project room only after verifying membership.
    socket.on('join:project', async (projectId, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};

      try {
        if (typeof projectId !== 'string' || !mongoose.isValidObjectId(projectId)) {
          return respond({ ok: false, message: 'Invalid project ID.' });
        }

        const project = await Project.findById(projectId).select('owner members');
        if (!project) return respond({ ok: false, message: 'Project not found.' });

        if (!isProjectMember(project, socket.user?._id)) {
          return respond({ ok: false, message: 'Access denied.' });
        }

        socket.join(`project:${projectId}`);
        return respond({ ok: true });
      } catch (err) {
        console.error('Socket join error:', err?.message || err);
        return respond({ ok: false, message: 'Unable to join project.' });
      }
    });

    socket.on('leave:project', (projectId) => {
      if (typeof projectId === 'string' && mongoose.isValidObjectId(projectId)) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('disconnect', () => {
      untrackSocket(socket.user._id, socket.id);
    });
  });
};