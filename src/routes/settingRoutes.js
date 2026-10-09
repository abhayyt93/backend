import express from 'express';
import { getSubscriptionAmount, updateSubscriptionAmount } from '../controllers/settingController.js';
import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/subscription-amount', getSubscriptionAmount);
router.put('/subscription-amount', protectAdmin, updateSubscriptionAmount);

export default router;
