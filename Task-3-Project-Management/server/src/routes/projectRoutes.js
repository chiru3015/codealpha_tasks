import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { ensureDB, protect } from '../middleware/auth.js';
import { isValidObjectId } from '../utils/validators.js';
import { kickUserFromProject } from '../socket/socketHandlers.js';

const router = express.Router();

// Helper: extract string ID whether populated or unpopulated
const getEntityId = (entity) => {
  if (!entity) return null;
  if (entity._id) return entity._id.toString();
  return entity.toString();
};

// Helper: check if user is a member of a project
const isMember = (project, userId) => {
  const uid = userId.toString();
  if (getEntityId(project.owner) === uid) return true;
  return project.members.some((m) => getEntityId(m.user) === uid);
};

const isAdminOrOwner = (project, userId) => {
  const uid = userId.toString();
  if (getEntityId(project.owner) === uid) return true;
  const member = project.members.find((m) => getEntityId(m.user) === uid);
  return member && ['admin', 'owner'].includes(member.role);
};

const invalidId = (res) => res.status(400).json({ message: 'Invalid ID provided.' });

const handleError = (res, err) => {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid project data.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid project data.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Project already exists.' });
  }
  console.error('Project route error:', err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};

// GET /api/projects — get all projects for current user
router.get('/', ensureDB, protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/projects — create project
router.post('/', ensureDB, protect, async (req, res) => {
  try {
    const { name, description, color, dueDate } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      color: color || '#6366f1',
      dueDate,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    res.status(201).json(project);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/projects/:id
router.get('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    res.json(project);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/projects/:id
router.put('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isAdminOrOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only project admin or owner can edit.' });
    }

    const { name, description, color, dueDate, status } = req.body || {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Project name cannot be empty.' });
      }
      project.name = name.trim();
    }
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (dueDate !== undefined) project.dueDate = dueDate;
    if (status) project.status = status;

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    res.json(project);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project owner can delete it.' });
    }

    const pId = project._id.toString();

    // Notify connected project members before the room becomes unavailable.
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${pId}`).emit('project:deleted', { projectId: pId });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project and all its tasks deleted.' });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/projects/:id/members — add member
router.post('/:id/members', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const { userId, role } = req.body || {};
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'A valid user ID is required.' });
    }

    const memberRole = role || 'member';
    if (!['admin', 'member', 'viewer'].includes(memberRole)) {
      return res.status(400).json({ message: 'Role must be admin, member, or viewer.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isAdminOrOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only admin or owner can add members.' });
    }

    const targetUser = await User.findById(userId).select('_id name email');
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const already = project.members.some((m) => m.user.toString() === userId);
    if (already) return res.status(409).json({ message: 'User is already a member.' });

    project.members.push({ user: userId, role: memberRole });
    await project.save();
    await project.populate('members.user', 'name email');

    // Broadcast membership update to project room (non-sensitive data only).
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('member:added', {
        projectId: project._id.toString(),
        member: {
          userId: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: memberRole,
        },
      });
    }

    res.json(project);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.userId)) {
      return invalidId(res);
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isAdminOrOwner(project, req.user._id)) {
      return res.status(403).json({ message: 'Only admin or owner can remove members.' });
    }
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('members.user', 'name email');

    const removedUserId = req.params.userId;

    // Notify remaining authorized members about the membership change.
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('member:removed', {
        projectId: project._id.toString(),
        removedUserId,
      });

      // Immediately revoke the removed member's access to the project Socket room.
      kickUserFromProject(io, removedUserId, project._id.toString());
    }

    res.json(project);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;