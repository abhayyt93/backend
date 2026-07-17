import Product from '../models/Product.js';

// @desc    Fetch all products with filters
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, rating } = req.query;
    let query = {};

    // Search by name (keyword)
    if (q) {
      query.name = {
        $regex: q,
        $options: 'i',
      };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by rating
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch product categories
// @route   GET /api/products/categories
// @access  Public
const getProductCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch bestseller products
// @route   GET /api/products/bestsellers
// @access  Public
const getBestsellerProducts = async (req, res, next) => {
  try {
    // Top 5 products sorted by rating and numReviews
    const products = await Product.find({}).sort({ rating: -1, numReviews: -1 }).limit(5);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, originalPrice, image, category, countInStock } = req.body;

    const product = new Product({
      name: name || 'Sample name',
      price: price || 0,
      originalPrice: originalPrice || 0,
      description: description || 'Sample description',
      image: image || '/images/sample.jpg',
      category: category || 'Sample category',
      countInStock: countInStock || 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product.reviews);
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        res.status(400);
        throw new Error('Product already reviewed');
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  getProductCategories,
  getBestsellerProducts,
  getProductReviews,
  createProductReview
};
