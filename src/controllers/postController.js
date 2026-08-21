import Post from '../models/Post.js';
import User from '../models/User.js';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { content, mediaUrls, privacyLevel, tags, location } = req.body;

    const newPost = new Post({
      user: req.user._id,
      content,
      mediaUrls,
      privacyLevel,
      tags,
      location
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
};

// @desc    Get Feed (Public + Friends + Own Posts)
// @route   GET /api/posts/feed
// @access  Private
export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const friendIds = currentUser.friends || [];
    const blockedIds = currentUser.blockedUsers || [];

    const query = {
      visibility: 'published',
      user: { $nin: blockedIds }, // exclude blocked users
      $or: [
        { privacyLevel: 'public' },
        { user: req.user._id },
        { privacyLevel: 'friends', user: { $in: friendIds } }
      ]
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name profilePicture');

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed', error: error.message });
  }
};

// @desc    Get all posts by a specific user
// @route   GET /api/posts/user/:userId
// @access  Private
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Determine which posts of this user the current user is allowed to see
    const isSelf = userId === req.user._id.toString();
    const currentUser = await User.findById(req.user._id);
    const isFriend = currentUser.friends && currentUser.friends.includes(userId);

    const orConditions = [{ privacyLevel: 'public' }];
    if (isSelf) {
      orConditions.push({ privacyLevel: 'private' }, { privacyLevel: 'friends' });
    } else if (isFriend) {
      orConditions.push({ privacyLevel: 'friends' });
    }

    const query = {
      user: userId,
      visibility: 'published', // We might want self to see drafts, but keeping simple
      $or: orConditions
    };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'name profilePicture');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user posts', error: error.message });
  }
};

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Private
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'name profilePicture');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Access check
    const isSelf = post.user._id.toString() === req.user._id.toString();
    const currentUser = await User.findById(req.user._id);
    const isFriend = currentUser.friends && currentUser.friends.includes(post.user._id);

    if (post.privacyLevel === 'private' && !isSelf) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }
    if (post.privacyLevel === 'friends' && !isSelf && !isFriend) {
      return res.status(403).json({ message: 'Not authorized to view this post' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post', error: error.message });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to update this post' });
    }

    const { content, mediaUrls, privacyLevel, tags, location, visibility } = req.body;

    if (content) post.content = content;
    if (mediaUrls) post.mediaUrls = mediaUrls;
    if (privacyLevel) post.privacyLevel = privacyLevel;
    if (tags) post.tags = tags;
    if (location) post.location = location;
    if (visibility) post.visibility = visibility;
    
    post.isEdited = true;

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this post' });
    }

    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
};

// @desc    Like or Unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked the post
    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(userId => userId.toString() !== req.user._id.toString());
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();
    res.json({ likes: post.likes, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like', error: error.message });
  }
};

// @desc    Add a comment
// @route   POST /api/posts/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.user._id,
      text
    };

    post.comments.push(comment);
    await post.save();

    res.status(201).json(post.comments);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

// @desc    Add a friend (For Testing)
// @route   POST /api/posts/friend/:id
// @access  Private
export const addFriend = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const friendId = req.params.id;

    if (!user.friends) {
      user.friends = [];
    }

    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }

    res.json({ message: 'Friend added', friends: user.friends });
  } catch (error) {
    res.status(500).json({ message: 'Error adding friend', error: error.message });
  }
};
