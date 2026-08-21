import express from 'express';
import {
  createPost,
  getFeed,
  getUserPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  addFriend
} from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Routes
router.post('/', protect, upload.any(), createPost);
router.get('/feed', protect, getFeed);
router.get('/user/:userId', protect, getUserPosts);
router.get('/:id', protect, getPostById);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

// Interactions
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comments', protect, addComment);

// Testing route to add friends
router.post('/friend/:id', protect, addFriend);

export default router;
