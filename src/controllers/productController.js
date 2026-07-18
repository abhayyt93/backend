import Product from '../models/Product.js';
import Category from '../models/Category.js';
import * as cheerio from 'cheerio';

// @desc    Fetch all products with filters
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, rating } = req.query;
    let query = { visibility: { $ne: false } }; // Only show visible products

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
    const product = await Product.findOne({ _id: req.params.id, visibility: { $ne: false } });
    if (product) {
      res.json(product);
    } else {
      res.status(404);
      throw new Error('Product not found or hidden');
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
    const categoryDocs = await Category.find({}).sort({ createdAt: -1 });
    const categoryNames = categoryDocs.map(c => c.name);
    
    const productCategories = await Product.distinct('category');
    
    const allCategories = [...new Set([...categoryNames, ...productCategories])];
    
    res.json(allCategories);
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch bestseller products
// @route   GET /api/products/bestsellers
// @access  Public
const getBestsellerProducts = async (req, res, next) => {
  try {
    // Top 5 visible products sorted by rating and numReviews
    const products = await Product.find({ visibility: { $ne: false } }).sort({ rating: -1, numReviews: -1 }).limit(5);
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
    let { name, description, price, originalPrice, image, category, countInStock, productUrl } = req.body;

    // Auto-extract data from URL if provided
    if (productUrl) {
      try {
        const response = await fetch(productUrl);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Fallback extraction from meta tags
        const scrapedName = $('meta[property="og:title"]').attr('content') || $('title').text();
        const scrapedDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const scrapedImage = $('meta[property="og:image"]').attr('content');
        
        // Extract price from common tags
        let scrapedPrice = $('meta[property="product:price:amount"]').attr('content') || 
                           $('meta[property="og:price:amount"]').attr('content');
        
    // Use scraped data if not manually provided
        if (!name && scrapedName) name = scrapedName.trim();
        if (!description && scrapedDesc) description = scrapedDesc.trim();
        if (!image && scrapedImage) image = scrapedImage;
        if (!price && scrapedPrice && !isNaN(Number(scrapedPrice))) price = Number(scrapedPrice);

      } catch (err) {
        console.error("Error scraping product URL:", err.message);
        // We continue with manual data even if scraping fails
      }
    }

    if (!name || !price || !category) {
      res.status(400);
      throw new Error('Please provide name, price, and category');
    }

    const product = new Product({
      name,
      price,
      originalPrice: originalPrice || 0,
      description: description || '',
      image: image || '/images/sample.jpg',
      category,
      countInStock: countInStock || 0,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Extract data from a product URL
// @route   POST /api/products/admin/extract-url
// @access  Private/Admin
const extractProductData = async (req, res, next) => {
  try {
    const { productUrl } = req.body;
    if (!productUrl) {
      res.status(400);
      throw new Error('Product URL is required');
    }

    // Add User-Agent header to avoid bot blocking (like 403 Forbidden)
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      res.status(400);
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const scrapedName = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const scrapedDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const scrapedImage = $('meta[property="og:image"]').attr('content') || '';
    const scrapedPriceRaw = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content') || '0';
    
    let price = 0;
    if (scrapedPriceRaw && !isNaN(Number(scrapedPriceRaw))) {
      price = Number(scrapedPriceRaw);
    }

    res.json({
      name: scrapedName.trim(),
      description: scrapedDesc.trim(),
      image: scrapedImage,
      price: price
    });
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

// @desc    Update a product
// @route   PUT /api/products/admin/:id
// @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    const { name, price, originalPrice, description, image, category, countInStock, visibility } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      if (name !== undefined) product.name = name;
      if (price !== undefined) product.price = price;
      if (originalPrice !== undefined) product.originalPrice = originalPrice;
      if (description !== undefined) product.description = description;
      if (image !== undefined) product.image = image;
      if (category !== undefined) product.category = category;
      if (countInStock !== undefined) product.countInStock = countInStock;
      if (visibility !== undefined) product.visibility = visibility;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/admin/:id
// @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: product._id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch all products for admin
// @route   GET /api/products/admin/list
// @access  Private/Admin
const getAdminProducts = async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  extractProductData,
  getProductCategories,
  getBestsellerProducts,
  getProductReviews,
  createProductReview,
  updateProduct,
  deleteProduct,
  getAdminProducts
};
