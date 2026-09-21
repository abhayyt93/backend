import { checkCourierServiceability } from '../services/shiprocketService.js';

// @desc    Get Expected Delivery Date
// @route   POST /api/shiprocket/estimate-delivery
// @access  Public
export const getExpectedDeliveryDate = async (req, res, next) => {
  try {
    const { deliveryPincode, weight, paymentMethod, amount, declaredValue } = req.body;

    if (!deliveryPincode) {
      res.status(400);
      throw new Error('Delivery pincode is required');
    }

    // If frontend sends totalItems, use it. Otherwise compute from items array if provided.
    let calculatedTotalItems = req.body.totalItems || 1;
    if (!req.body.totalItems && req.body.items && Array.isArray(req.body.items)) {
      calculatedTotalItems = req.body.items.reduce((acc, item) => acc + (item.qty || 1), 0);
    }
    
    // Weight is fixed at 0.5kg regardless of total items for flat delivery charge
    const itemWeight = weight || 0.5;
    const isCod = paymentMethod === 'COD' ? 1 : 0;
    const shipmentValue = amount || declaredValue || 0;

    const result = await checkCourierServiceability(deliveryPincode, itemWeight, isCod, shipmentValue);

    if (result.success) {
      // Shiprocket rate usually includes GST. Extract base and GST for COD.
      let finalDeliveryFee = 0;
      let gstCharge = 0;
      if (paymentMethod === 'COD') {
        let totalRate = result.delivery_fee || 0;
        finalDeliveryFee = Math.round(totalRate / 1.18);
        gstCharge = Math.round(totalRate - finalDeliveryFee);
      }

      res.status(200).json({
        success: true,
        estimatedDeliveryDate: result.estimated_delivery_date,
        courierName: result.courier_name,
        deliveryFee: finalDeliveryFee,
        gstCharge: gstCharge
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
