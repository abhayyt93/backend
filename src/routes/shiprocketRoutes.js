import express from 'express';
import { getExpectedDeliveryDate } from '../controllers/shiprocketController.js';

const router = express.Router();

router.post('/estimate-delivery', getExpectedDeliveryDate);

export default router;
