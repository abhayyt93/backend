import mongoose from 'mongoose';
import Blog from '../models/Blog.js';

const isValidId = (id) => mongoose.isValidObjectId(id);

const getPagination = (query) => {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 100)
    : 20;

  return { page, limit, skip: (page - 1) * limit };
};

export const createBlog = async (req, res, next) => {
  try {
    const { title, content, excerpt, coverImage, category, tags } = req.body;

    if (typeof title !== 'string' || !title.trim() ||
        typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Title cannot exceed 200 characters' });
    }

    if (excerpt !== undefined && (typeof excerpt !== 'string' || excerpt.length > 500)) {
      return res.status(400).json({ success: false, message: 'Excerpt must be a string of at most 500 characters' });
    }

    for (const field of ['coverImage', 'category']) {
      if (req.body[field] !== undefined && typeof req.body[field] !== 'string') {
        return res.status(400).json({ success: false, message: `${field} must be a string` });
      }
    }
    if (tags !== undefined &&
        (!Array.isArray(tags) || tags.length > 100 || !tags.every(tag => typeof tag === 'string'))) {
      return res.status(400).json({ success: false, message: 'Tags must be an array of up to 100 strings' });
    }

    const blog = await Blog.create({
      author: req.user._id,
      title: title.trim(),
      content: content.trim(),
      excerpt,
      coverImage,
      category,
      tags,
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Blog submitted for admin approval',
      blog
    });
  } catch (error) {
    return next(error);
  }
};

export const getPublicBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { status: 'approved' };

    if (typeof req.query.search === 'string' && req.query.search.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Search cannot exceed 100 characters' });
    }
    if (typeof req.query.category === 'string' && req.query.category.trim()) {
      filter.category = req.query.category.trim();
    }
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { content: { $regex: escapedSearch, $options: 'i' } },
        { excerpt: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-reviewNote')
        .populate('author', 'name profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      blogs,
      page,
      limit,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { author: req.user._id };
    const [blogs, total] = await Promise.all([
      Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      blogs,
      page,
      limit,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    return next(error);
  }
};

export const getBlogById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }

    const blog = await Blog.findOne({ _id: req.params.id, status: 'approved' })
      .select('-reviewNote')
      .populate('author', 'name profilePicture');
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    return res.json({ success: true, blog });
  } catch (error) {
    return next(error);
  }
};

export const updateMyBlog = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own blogs' });
    }

    const fields = ['title', 'content', 'excerpt', 'coverImage', 'category', 'tags'];
    for (const field of ['title', 'content', 'excerpt', 'coverImage', 'category']) {
      if (req.body[field] !== undefined && typeof req.body[field] !== 'string') {
        return res.status(400).json({ success: false, message: `${field} must be a string` });
      }
    }
    if (req.body.tags !== undefined &&
        (!Array.isArray(req.body.tags) || req.body.tags.length > 100 ||
         !req.body.tags.every(tag => typeof tag === 'string'))) {
      return res.status(400).json({ success: false, message: 'Tags must be an array of up to 100 strings' });
    }
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    }
    if (typeof blog.title !== 'string' || !blog.title.trim() ||
        typeof blog.content !== 'string' || !blog.content.trim()) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    if (blog.title.trim().length > 200 ||
        (blog.excerpt && blog.excerpt.length > 500) ||
        blog.tags.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid blog fields' });
    }

    blog.title = blog.title.trim();
    blog.content = blog.content.trim();
    blog.status = 'pending';
    blog.reviewNote = '';
    const updatedBlog = await blog.save();

    return res.json({
      success: true,
      message: 'Blog updated and submitted for admin approval',
      blog: updatedBlog
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteMyBlog = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own blogs' });
    }

    await blog.deleteOne();
    return res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

export const getAdminBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Status must be pending, approved, or rejected' });
      }
      filter.status = req.query.status;
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name email profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      blogs,
      page,
      limit,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    return next(error);
  }
};

export const updateBlogStatus = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }
    if (reviewNote !== undefined && typeof reviewNote !== 'string') {
      return res.status(400).json({ success: false, message: 'Review note must be a string' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.status = status;
    blog.reviewNote = reviewNote?.trim() || '';
    await blog.save();

    return res.json({ success: true, message: `Blog ${status}`, blog });
  } catch (error) {
    return next(error);
  }
};

export const deleteBlogAsAdmin = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }

    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    return res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
