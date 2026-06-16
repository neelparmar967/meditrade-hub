import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, roles } from './config.js';
import { dbState, memoryStore } from './store.js';
import { models } from './models.js';

export function signToken(user) {
  return jwt.sign({ id: user.id || user._id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: '8h' });
}

export async function findUserByEmail(email) {
  const normalizedEmail = String(email || '').toLowerCase();
  if (dbState.connected) return models.User.findOne({ email: normalizedEmail, passwordHash: { $exists: true, $ne: null } }).lean();
  return memoryStore.findOne('users', (user) => String(user.email || '').toLowerCase() === normalizedEmail && Boolean(user.passwordHash));
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function permit(...allowedRoles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role) || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    return next();
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
