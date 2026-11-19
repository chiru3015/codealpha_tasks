import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidObjectId = (id) =>
  typeof id === 'string' && mongoose.isValidObjectId(id);

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
};

export const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 6 && password.length <= 128;

export const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';