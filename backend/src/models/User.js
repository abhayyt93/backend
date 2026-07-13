import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    savedPaymentMethods: [
      {
        type: {
          type: String,
          enum: ['UPI', 'BANK_ACCOUNT'],
          required: true,
        },
        // For UPI
        upiId: { type: String },
        displayName: { type: String },
        
        // For Bank Account
        accountHolderName: { type: String },
        bankName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        
        isDefault: { type: Boolean, default: false }
      }
    ],
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
