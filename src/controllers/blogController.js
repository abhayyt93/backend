import mongoose from 'mongoose';
import Blog from '../models/Blog.js';

const isValidId = (id) => mongoose.isValidObjectId(id);
const editableFields = ['title', 'content', 'excerpt', 'coverImage', 'category', 'tags', 'authorName'];

const getPagination = (query) => {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 100)
    : 20;

  return { page, limit, skip: (page - 1) * limit };
};

const validateBlogFields = (fields, { requireContent = false } = {}) => {
  if (requireContent || fields.title !== undefined) {
    if (typeof fields.title !== 'string' || !fields.title.trim()) {
      return 'Title is required';
    }
    if (fields.title.trim().length > 200) {
      return 'Title cannot exceed 200 characters';
    }
  }

  if (requireContent || fields.content !== undefined) {
    if (typeof fields.content !== 'string' || !fields.content.trim()) {
      return 'Content is required';
    }
  }

  for (const field of ['excerpt', 'coverImage', 'category', 'authorName']) {
    if (fields[field] !== undefined && typeof fields[field] !== 'string') {
      return `${field} must be a string`;
    }
  }
  if (fields.excerpt && fields.excerpt.length > 500) {
    return 'Excerpt cannot exceed 500 characters';
  }
  if (fields.tags !== undefined &&
      (!Array.isArray(fields.tags) || fields.tags.length > 100 ||
       !fields.tags.every(tag => typeof tag === 'string'))) {
    return 'Tags must be an array of up to 100 strings';
  }
  if (fields.status !== undefined && !['draft', 'published'].includes(fields.status)) {
    return 'Status must be draft or published';
  }

  return null;
};

export const createBlog = async (req, res, next) => {
  try {
    const error = validateBlogFields(req.body, { requireContent: true });
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const blogFields = {};
    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        blogFields[field] = req.body[field];
      }
    }

    const blog = await Blog.create({
      ...blogFields,
      status: req.body.status || 'published',
      publishedAt: req.body.status === 'draft' ? null : new Date()
    });

    return res.status(201).json({
      success: true,
      message: blog.status === 'published' ? 'Blog published successfully' : 'Blog saved as draft',
      blog
    });
  } catch (error) {
    return next(error);
  }
};

export const getPublicBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { status: 'published' };

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
      Blog.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
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

    const blog = await Blog.findOne({ _id: req.params.id, status: 'published' });
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    return res.json({ success: true, blog });
  } catch (error) {
    return next(error);
  }
};

export const getAdminBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.status !== undefined) {
      if (!['draft', 'published'].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Status must be draft or published' });
      }
      filter.status = req.query.status;
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
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

export const getAdminBlogById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    return res.json({ success: true, blog });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminBlog = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID' });
    }
    const error = validateBlogFields(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    }
    if (req.body.status !== undefined) {
      blog.status = req.body.status;
      blog.publishedAt = req.body.status === 'published'
        ? (blog.publishedAt || new Date())
        : null;
    }

    await blog.save();
    return res.json({ success: true, message: 'Blog updated successfully', blog });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminBlog = async (req, res, next) => {
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
