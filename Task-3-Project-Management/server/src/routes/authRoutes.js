import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ensureDB, protect } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { isValidEmail, isValidPassword, normalizeEmail } from '../utils/validators.js';
import config from '../config/env.js';

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, config.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', registerLimiter, ensureDB, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'Password must be between 6 and 128 characters.' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create({ name, email, password });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid registration data.' });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, ensureDB, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', ensureDB, protect, async (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users  — search users to add to projects
router.get('/users', ensureDB, protect, async (req, res) => {
  try {
    const keyword =
      typeof req.query.keyword === 'string' ? req.query.keyword.trim().slice(0, 100) : '';
    const search = keyword
      ? {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { email: { $regex: keyword, $options: 'i' } },
          ],
        }
      : {};
    const users = await User.find({ ...search, _id: { $ne: req.user._id } })
      .select('_id name email')
      .limit(20);
    res.json(users);
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ message: 'Unable to search users.' });
  }
});

export default router;