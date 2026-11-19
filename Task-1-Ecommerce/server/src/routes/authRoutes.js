import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, protect, admin } from '../middleware/auth.js';
import { dbStore } from '../config/dbStore.js';

const router = express.Router();

// Helper to check DB readiness
const ensureDB = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  if (process.env.ENABLE_IN_MEMORY_FALLBACK === 'true') return true;

  res.status(503).json({
    message: 'Database Unavailable: Real MongoDB Atlas connection is not established (readyState !== 1).',
    readyState: mongoose.connection.readyState,
  });
  return false;
};

// @route   POST /api/auth/register
// @desc    Register a new customer
// @access  Public
router.post('/register', async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: 'customer',
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }

    // Explicit fallback only
    const existing = await dbStore.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const newUser = await dbStore.createUser({ name, email, password, role: 'customer' });
    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token: generateToken(newUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }

    // Explicit fallback only
    const user = await dbStore.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt,
  });
});

// @route   GET /api/auth/users
// @desc    Get all users (for Admin dashboard stats)
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      return res.json(users);
    }

    const safeUsers = dbStore.users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
