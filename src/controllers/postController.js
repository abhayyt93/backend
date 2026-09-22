import Post from '../models/Post.js';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { content, text, caption, mediaUrls, imageUrl, images, privacyLevel, tags, location } = req.body;

    let finalMediaUrls = [];
    if (mediaUrls) finalMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
    
    if (finalMediaUrls.length === 0) {
      if (imageUrl) finalMediaUrls = [imageUrl];
      else if (images) finalMediaUrls = Array.isArray(images) ? images : [images];
    }

    // Process files if uploaded via multipart/form-data
    if (req.files && req.files.length > 0) {
      const reqHost = req.get('host');
        const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${reqProtocol}://${reqHost}`;
      req.files.forEach(file => {
        finalMediaUrls.push(`${baseUrl}/uploads/${file.filename}`);
      });
    }

    const newPost = new Post({
      user: req.user._id,
      content: content || text || caption || '',
      mediaUrls: finalMediaUrls,
      privacyLevel: privacyLevel || 'public',
      tags: tags || [],
      location
    });

    const savedPost = await newPost.save();
    
    // Add aliases for the frontend
    const postResponse = savedPost.toJSON();
    postResponse.imageUrl = postResponse.mediaUrls.length > 0 ? postResponse.mediaUrls[0] : null;
    postResponse.text = postResponse.content;

    res.status(201).json(postResponse);
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
    const limit = parseInt(req.query.limit) || 20; // Increased limit
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const friendIds = currentUser.friends || [];
    const blockedIds = currentUser.blockedUsers || [];

    const query = {
      visibility: 'published',
      $or: [
        { privacyLevel: 'public' },
        { user: req.user._id },
        { privacyLevel: 'friends', user: { $in: friendIds } }
      ]
    };

    if (blockedIds && blockedIds.length > 0) {
      query.user = { $nin: blockedIds };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name profilePicture');

    const total = await Post.countDocuments(query);

    // Some frontends expect a direct array, some expect pagination object. 
    // If the frontend expects just an array, it might be failing. 
    // Sending just posts if page and limit aren't specified in query? 
    // Let's stick to the object but this is a common issue.
    const formattedPosts = posts.map(p => {
      const post = p.toJSON();
      post.imageUrl = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : null;
      post.text = post.content;
      return post;
    });

    res.json({
      posts: formattedPosts,
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

    const formattedPosts = posts.map(p => {
      const post = p.toJSON();
      post.imageUrl = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : null;
      post.text = post.content;
      return post;
    });

    res.json(formattedPosts);
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

    const { content, text, caption, mediaUrls, imageUrl, images, privacyLevel, tags, location, visibility } = req.body;

    const finalContent = content || text || caption;
    if (finalContent) post.content = finalContent;

    let finalMediaUrls = mediaUrls;
    if (!finalMediaUrls) {
      if (imageUrl) finalMediaUrls = [imageUrl];
      else if (images) finalMediaUrls = Array.isArray(images) ? images : [images];
    }

    // Process files if uploaded via multipart/form-data
    if (req.files && req.files.length > 0) {
      finalMediaUrls = finalMediaUrls || [];
      const reqHost = req.get('host');
        const reqProtocol = reqHost.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${reqProtocol}://${reqHost}`;
      req.files.forEach(file => {
        finalMediaUrls.push(`${baseUrl}/uploads/${file.filename}`);
      });
    }

    if (finalMediaUrls) post.mediaUrls = finalMediaUrls;
    if (privacyLevel) post.privacyLevel = privacyLevel;
    if (tags) post.tags = tags;
    if (location) post.location = location;
    if (visibility) post.visibility = visibility;
    
    post.isEdited = true;

    const updatedPost = await post.save();

    // Add aliases for the frontend
    const postResponse = updatedPost.toJSON();
    postResponse.imageUrl = postResponse.mediaUrls.length > 0 ? postResponse.mediaUrls[0] : null;
    postResponse.text = postResponse.content;

    res.json(postResponse);
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

// @desc    Send Friend Request
// @route   POST /api/posts/friend-request/send/:userId
// @access  Private
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check if they are already friends
    const sender = await User.findById(senderId);
    if (sender.friends && sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'You are already friends' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const newRequest = new FriendRequest({
      sender: senderId,
      receiver: receiverId
    });

    await newRequest.save();

    res.status(201).json({ message: 'Friend request sent', request: newRequest });
  } catch (error) {
    res.status(500).json({ message: 'Error sending friend request', error: error.message });
  }
};

// @desc    Accept Friend Request
// @route   POST /api/posts/friend-request/accept/:requestId
// @access  Private
export const acceptFriendRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    request.status = 'accepted';
    await request.save();

    // Add to each other's friends list
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting friend request', error: error.message });
  }
};

// @desc    Reject Friend Request
// @route   POST /api/posts/friend-request/reject/:requestId
// @access  Private
export const rejectFriendRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting friend request', error: error.message });
  }
};

// @desc    Get Pending Friend Requests
// @route   GET /api/posts/friend-request/pending
// @access  Private
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    }).populate('sender', 'name profilePicture');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending requests', error: error.message });
  }
};
