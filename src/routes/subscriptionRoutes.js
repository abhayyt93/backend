import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    createSubscriptionOrder, 
    verifySubscriptionPayment,
    consumeTrialFeature,
    getSubscriptionStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/create-order', protect, createSubscriptionOrder);
router.post('/verify', protect, verifySubscriptionPayment);
router.post('/trial/consume', protect, consumeTrialFeature);
router.get('/status', protect, getSubscriptionStatus);

export default router;
