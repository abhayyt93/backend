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
  addFriend,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequests
} from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Routes
router.post('/', protect, upload.any(), createPost);
router.get('/feed', protect, getFeed);
router.get('/user/:userId', protect, getUserPosts);
router.get('/:id', protect, getPostById);
router.put('/:id', protect, upload.any(), updatePost);
router.delete('/:id', protect, deletePost);

// Interactions
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comments', protect, addComment);

// Friend Request System
router.post('/friend-request/send/:userId', protect, sendFriendRequest);
router.post('/friend-request/accept/:requestId', protect, acceptFriendRequest);
router.post('/friend-request/reject/:requestId', protect, rejectFriendRequest);
router.get('/friend-request/pending', protect, getPendingRequests);

export default router;
