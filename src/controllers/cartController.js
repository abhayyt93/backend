import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add item to cart or update quantity
// @route   POST /api/cart/add
// @access  Private
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const qty = Number(quantity) || 1;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      if (qty > 0) {
        cart = await Cart.create({
          user: req.user._id,
          items: [{ product: productId, quantity: qty }],
        });
      } else {
        cart = await Cart.create({
          user: req.user._id,
          items: [],
        });
      }
    } else {
      // Check if product is already in the cart
      const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
      
      if (itemIndex > -1) {
        // If product exists in cart, update the quantity
        cart.items[itemIndex].quantity += qty;

        // If quantity drops to 0 or below, remove the item
        if (cart.items[itemIndex].quantity <= 0) {
          cart.items.splice(itemIndex, 1);
        }
      } else {
        // If product does not exist, add it to items array only if qty > 0
        if (qty > 0) {
          cart.items.push({ product: productId, quantity: qty });
        }
      }
      await cart.save();
    }
    
    // Populate product details before returning
    cart = await cart.populate('items.product');

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(p => p.product.toString() !== productId);
    
    await cart.save();
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Clear user cart
// @route   DELETE /api/cart/clear
// @access  Private
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    res.json({ message: 'Cart cleared successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
