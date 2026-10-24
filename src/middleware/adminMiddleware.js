import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import User from '../models/User.js';

export const protectAdmin = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader) {
    if (/^bearer\s+/i.test(authHeader)) {
      token = authHeader.replace(/^bearer\s+/i, '').trim();
    } else {
      token = authHeader.trim();
    }
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.headers['token']) {
    token = req.headers['token'];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      if (typeof token === 'string') {
        token = token.replace(/^["']|["']$/g, '').trim();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check Admin collection
      const admin = await Admin.findById(decoded.id).select('-password');
      if (admin) {
        req.user = admin;
        return next();
      }

      // Check User collection in case admin account was registered as a User
      const user = await User.findById(decoded.id).select('-password');
      if (user && (user.isAdmin || user.role === 'admin' || user.email === 'admin@kosmico.com')) {
        req.user = user;
        return next();
      }

      res.status(401);
      return next(new Error('Not authorized as an admin'));
    } catch (error) {
      console.error('Admin Auth Error:', error.message);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  res.status(401);
  return next(new Error('Not authorized, no token'));
};
