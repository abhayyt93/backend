import express from 'express';
import { generateEmergencyMessage } from '../controllers/emergencyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate-message', protect, generateEmergencyMessage);

export default router;