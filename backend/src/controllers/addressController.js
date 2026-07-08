import Saveaddress from '../models/Saveaddress.js';

// @desc    Add new address
// @route   POST /api/address
// @access  Private
const addAddress = async (req, res, next) => {
  try {
    const { addressLabel, fullName, streetAddress, city, pincode, phoneNumber } = req.body;

    if (!addressLabel || !fullName || !streetAddress || !city || !pincode || !phoneNumber) {
      res.status(400);
      throw new Error('Please provide all address fields');
    }

    // Check if the user already has an address with this label
    let address = await Saveaddress.findOne({ user: req.user.id, addressLabel });

    if (address) {
      // Update the existing address instead of creating a new one
      address.fullName = fullName;
      address.streetAddress = streetAddress;
      address.city = city;
      address.pincode = pincode;
      address.phoneNumber = phoneNumber;
      await address.save();

      return res.status(200).json({
        message: 'Address updated successfully',
        address
      });
    }

    // If it doesn't exist, create a new one
    address = await Saveaddress.create({
      user: req.user.id,
      addressLabel,
      fullName,
      streetAddress,
      city,
      pincode,
      phoneNumber
    });

    res.status(201).json({
      message: 'Address saved successfully',
      address
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user addresses
// @route   GET /api/address
// @access  Private
const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Saveaddress.find({ user: req.user.id });
    res.status(200).json(addresses);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an address
// @route   PUT /api/address/:id
// @access  Private
const updateAddress = async (req, res, next) => {
  try {
    const address = await Saveaddress.findById(req.params.id);

    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }

    // Make sure the logged-in user matches the address user
    if (address.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to update this address');
    }

    const updatedAddress = await Saveaddress.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: 'Address updated successfully',
      address: updatedAddress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an address
// @route   DELETE /api/address/:id
// @access  Private
const deleteAddress = async (req, res, next) => {
  try {
    const address = await Saveaddress.findById(req.params.id);

    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }

    // Make sure the logged-in user matches the address user
    if (address.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to delete this address');
    }

    await address.deleteOne();

    res.status(200).json({
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export { addAddress, getAddresses, updateAddress, deleteAddress };
