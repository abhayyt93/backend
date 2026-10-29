import express from 'express';
import {
  getBlogById,
  getPublicBlogs
} from '../controllers/blogController.js';

const router = express.Router();

router.get('/', getPublicBlogs);
router.get('/:id', getBlogById);

export default router;
