import mongoose from 'mongoose';

const saveaddressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    addressLabel: {
      type: String,
      required: [true, 'Please add an address label (e.g., Home, Office)'],
    },
    fullName: {
      type: String,
      required: [true, 'Please add a full name'],
    },
    streetAddress: {
      type: String,
      required: [true, 'Please add a street address'],
    },
    city: {
      type: String,
      required: [true, 'Please add a city'],
    },
    pincode: {
      type: String,
      required: [true, 'Please add a pincode'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
  },
  {
    timestamps: true,
  }
);

const Saveaddress = mongoose.model('Saveaddress', saveaddressSchema);

export default Saveaddress;
 