import express from 'express';
import {
  createLead,
  getAdminLeads,
  exportAdminLeads,
  getLeadById,
  updateAdminLead,
  deleteAdminLead
} from '../controllers/leadController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';
import { leadRateLimiter } from '../middleware/leadRateLimiter.js';

const router = express.Router();

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------
// POST /api/leads - User/Visitor submits Lead (Protected by Rate Limiter)
router.post('/', leadRateLimiter, createLead);

// ----------------------------------------------------
// Admin Protected Endpoints (Direct mounting)
// ----------------------------------------------------
// GET /api/leads/export or /api/admin/leads/export - CSV download
router.get('/export', protectAdmin, exportAdminLeads);

// GET /api/leads or /api/admin/leads - List leads with search & pagination
router.get('/', protectAdmin, getAdminLeads);

// Single Lead CRUD for Admin
router.get('/:id', protectAdmin, getLeadById);
router.put('/:id', protectAdmin, updateAdminLead);
router.patch('/:id', protectAdmin, updateAdminLead);
router.delete('/:id', protectAdmin, deleteAdminLead);

export default router;
