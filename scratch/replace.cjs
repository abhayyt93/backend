const fs = require('fs');
let file = fs.readFileSync('src/controllers/paymentController.js', 'utf8');

file = file.replace(/paymentMethod: 'COD',\r?\n\s*paymentStatus: 'Pending',\r?\n\s*upfrontAmount: upfrontAmount,\r?\n\s*upfrontPaymentStatus: 'Pending',\r?\n\s*razorpayOrderId: razorpayOrder.id,\r?\n\s*isDeliveryFeeRefundable: false,/g,
      `paymentMethod: 'PART_COD',
      paymentStatus: 'Pending',
      upfrontAmount: upfrontAmount,
      upfrontPaymentStatus: 'Pending',
      razorpayOrderId: razorpayOrder.id,
      isDeliveryFeeRefundable: false,
      isCodUpfront: true,
      paidAmount: 0,
      balanceAmount: amount - upfrontAmount,
      shiprocketCodAmount: amount - upfrontAmount,`
);

file = file.replace(/order.upfrontPaymentStatus = 'Paid';\r?\n\s*order.razorpayPaymentId = razorpay_payment_id;\r?\n\s*await order.save\(\);/g,
      `order.upfrontPaymentStatus = 'Paid';
      order.razorpayPaymentId = razorpay_payment_id;
      order.paidAmount = order.upfrontAmount;
      await order.save();`
);

file = file.replace(/const order = await Order.findOne\(\{ razorpayPaymentId: paymentId \}\);\r?\n\s*if \(order\) \{\r?\n\s*\/\/ Update order status if it's fully refunded\r?\n\s*order.orderStatus = 'Cancelled';\r?\n\s*await order.save\(\);/g,
      `const order = await Order.findOne({ razorpayPaymentId: paymentId });
      if (order) {
        // Update order status if it's fully refunded
        order.orderStatus = 'Cancelled';
        order.refundId = refundId;
        order.refundAmount = refundAmount;
        await order.save();`
);

fs.writeFileSync('src/controllers/paymentController.js', file);
console.log('Replaced successfully');
