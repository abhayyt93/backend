import { checkCourierServiceability } from '../services/shiprocketService.js';

// @desc    Get Expected Delivery Date
// @route   POST /api/shiprocket/estimate-delivery
// @access  Public
export const getExpectedDeliveryDate = async (req, res, next) => {
  try {
    const { deliveryPincode, weight, paymentMethod } = req.body;

    if (!deliveryPincode) {
      res.status(400);
      throw new Error('Delivery pincode is required');
    }

    // Default weight is 0.5kg. If paymentMethod is COD, cod parameter is 1, else 0
    const itemWeight = weight || 0.5;
    const isCod = paymentMethod === 'COD' ? 1 : 0;

    const result = await checkCourierServiceability(deliveryPincode, itemWeight, isCod);

    if (result.success) {
      // 1. Online (Prepaid) is always FREE
      // 2. For COD, Shiprocket returns full shipping + COD charge (which can be very high).
      // We will set a standard flat COD charge (e.g. ₹50) to make it affordable for customers.
      let finalDeliveryFee = 0;
      if (paymentMethod === 'COD') {
        finalDeliveryFee = 50; // You can change this flat COD fee to whatever you want
      }

      res.status(200).json({
        success: true,
        estimatedDeliveryDate: result.estimated_delivery_date,
        courierName: result.courier_name,
        deliveryFee: finalDeliveryFee
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Delivery not available for this pincode'
      });
    }
  } catch (error) {
    console.error("Expected Delivery Check Error:", error);
    next(error);
  }
};
