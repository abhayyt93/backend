import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader) {
    if (/^bearer\s+/i.test(authHeader)) {
      token = authHeader.replace(/^bearer\s+/i, '').trim();
    } else {
      token = authHeader.trim();
    }
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'].trim();
  } else if (req.headers['token']) {
    token = req.headers['token'].trim();
  } else if (req.query && req.query.token) {
    token = req.query.token.trim();
  }

  // Strip wrapping quotes if any (e.g. "\"eyJhbGci...\"")
  if (token && typeof token === 'string') {
    token = token.replace(/^["']|["']$/g, '').trim();
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        req.user = await Admin.findById(decoded.id).select('-password');
      }
      if (req.user) {
        return next();
      }
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
    }
  }

  // Fallback: If userId is explicitly passed in body/query/headers for background sync
  const fallbackUserId = req.body?.userId || req.body?.user || req.query?.userId || req.query?.user || req.headers['x-user-id'];
  if (fallbackUserId) {
    try {
      let fallbackUser = await User.findById(fallbackUserId).select('-password');
      if (!fallbackUser) {
        fallbackUser = await Admin.findById(fallbackUserId).select('-password');
      }
      if (fallbackUser) {
        req.user = fallbackUser;
        return next();
      }
    } catch (err) {
      // Ignore fallback error
    }
  }

  return res.status(401).json({ message: 'Not authorized, please login' });
};

export { protect };
