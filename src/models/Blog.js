import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    coverImage: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ author: 1, createdAt: -1 });

const Blog = mongoose.model('Blog', blogSchema, 'Blog');

export default Blog;
