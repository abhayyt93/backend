import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token, exclude password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // Fallback: If userId is explicitly passed in body for background sync
  if (req.body && req.body.userId) {
    try {
      const fallbackUser = await User.findById(req.body.userId).select('-password');
      if (fallbackUser) {
        req.user = fallbackUser;
        return next();
      }
    } catch (err) {
      // Ignore fallback error
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

export { protect };
