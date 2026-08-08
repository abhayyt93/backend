import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    image: {
      type: String, // We'll store the URL or path to the image
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    visibility: {
      type: Boolean,
      default: true,
    },
    keyBenefits: [{
      type: String
    }],
    ingredients: {
      type: String
    },
    highlights: [{
      type: String
    }],
    brand: {
      type: String
    },
    sku: {
      type: String
    },
    shelfLife: {
      type: String
    },
    madeIn: {
      type: String
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('stock').get(function() {
  return this.countInStock;
});

productSchema.virtual('stockStatus').get(function() {
  if (this.countInStock > 0) {
    return `In Stock (${this.countInStock})`;
  }
  return 'Out of Stock';
});


const Product = mongoose.model('Product', productSchema);

export default Product;
