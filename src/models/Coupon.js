import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true 
  }, // e.g., KOSMICO20, WELLNESS500
  title: {
    type: String,
    required: true
  }, // e.g., "20% OFF", "₹500 OFF", "FREE GIFT"
  description: { 
    type: String, 
    required: true 
  }, // e.g., "Valid on all Ayurvedic Oils and Hair Care products."
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed', 'free_gift'], 
    required: true 
  }, 
  discountValue: { 
    type: Number, 
    default: 0 
  }, // e.g., 20 (for percentage) or 500 (for fixed amount)
  minOrderAmount: { 
    type: Number, 
    default: 0 
  }, // e.g., 2499 for "Flat discount on orders above ₹2,499."
  validUntil: { 
    type: Date, 
    required: true 
  }, // e.g., 30 Oct, 2023
  usageLimitPerUser: { 
    type: Number, 
    default: 0 
  }, // e.g., 1 for "One time use only", 0 for unlimited
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { 
  timestamps: true 
});

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
