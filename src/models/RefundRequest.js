import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'PickedUp', 'QCPassed', 'Refunded', 'Rejected'],
      default: 'Pending',
    },
    adminComment: {
      type: String,
    },
    shiprocketReturnOrderId: {
      type: String,
    },
    shiprocketReturnShipmentId: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    refundTransactionId: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

const RefundRequest = mongoose.model('RefundRequest', refundRequestSchema);

export default RefundRequest;
