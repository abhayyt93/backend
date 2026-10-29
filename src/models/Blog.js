import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    authorName: {
      type: String,
      trim: true,
      default: 'Kosmico Wellness'
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
      enum: ['draft', 'published'],
      default: 'published'
    },
    publishedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ publishedAt: -1 });

const Blog = mongoose.model('Blog', blogSchema, 'Blog');

export default Blog;
