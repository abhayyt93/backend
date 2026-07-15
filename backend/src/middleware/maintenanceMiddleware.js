import { isMaintenanceMode } from '../config/maintenanceState.js';

export const maintenanceMiddleware = (req, res, next) => {
  // Allow admin and system routes to always pass through
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/system')) {
    return next();
  }

  // Allow health check to pass through
  if (req.path === '/health') {
    return next();
  }

  // Block all other requests if maintenance mode is ON
  if (isMaintenanceMode) {
    return res.status(503).json({
      success: false,
      message: 'App is under process/maintenance. Please try again later.'
    });
  }

  // Otherwise continue normally
  next();
};
