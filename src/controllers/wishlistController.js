import User from '../models/User.js';
import Product from '../models/Product.js';

// @desc    Add product to wishlist
// @route   POST /api/wishlist/add
// @access  Private
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      count: user.wishlist.length,
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/remove
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if product in wishlist
    if (!user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, message: 'Product not found in wishlist' });
    }

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString());
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
