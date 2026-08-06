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
      // Use the actual delivery fee calculated by Shiprocket API and add 18% GST only for COD
      let finalDeliveryFee = 0;
      if (paymentMethod === 'COD') {
        let baseDeliveryFee = result.delivery_fee || 0;
        finalDeliveryFee = Math.round(baseDeliveryFee * 1.18);
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
