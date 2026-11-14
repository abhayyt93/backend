import express from 'express';
import { 
  getSubscriptionAmount, 
  updateSubscriptionAmount,
  getAdminSubscriptions,
  saveAdminSubscriptionPlan
} from '../controllers/settingController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/subscription-amount', getSubscriptionAmount);
router.put('/subscription-amount', protectAdmin, updateSubscriptionAmount);
router.post('/subscription-amount', protectAdmin, updateSubscriptionAmount);

// Admin Subscriptions Aliases
router.get('/subscriptions', protectAdmin, getAdminSubscriptions);
router.post('/subscriptions', protectAdmin, saveAdminSubscriptionPlan);
router.put('/subscriptions', protectAdmin, saveAdminSubscriptionPlan);
router.put('/subscriptions/:id', protectAdmin, saveAdminSubscriptionPlan);
router.post('/subscriptions/:id', protectAdmin, saveAdminSubscriptionPlan);

export default router;
