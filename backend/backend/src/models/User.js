import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    isBlocked: {
      type: Boolean,
      default: false
    },
    password: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

// Method to match entered password with hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

const User = mongoose.model('User', userSchema);

export default User;
