import express from 'express';
import {
  createBlog,
  deleteMyBlog,
  getBlogById,
  getMyBlogs,
  getPublicBlogs,
  updateMyBlog
} from '../controllers/blogController.js';
import { protectUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getPublicBlogs);
router.post('/', protectUser, createBlog);
router.get('/mine', protectUser, getMyBlogs);
router.get('/:id', getBlogById);
router.put('/:id', protectUser, updateMyBlog);
router.patch('/:id', protectUser, updateMyBlog);
router.delete('/:id', protectUser, deleteMyBlog);

export default router;
