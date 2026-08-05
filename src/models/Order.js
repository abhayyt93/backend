import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
  },
  userEmail: {
    type: String,
  },
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Saveaddress',
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      qty: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      }
    }
  ],
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['RAZORPAY', 'COD'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  orderStatus: {
    type: String,
    enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Placed',
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  couponCode: {
    type: String,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  shiprocketOrderId: {
    type: String,
  },
  shiprocketShipmentId: {
    type: String,
  },
  deliveryFee: {
    type: Number,
    default: 0,
  },
  isDeliveryFeeRefundable: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
