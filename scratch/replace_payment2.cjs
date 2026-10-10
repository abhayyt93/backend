const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/controllers/paymentController.js');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /order\.paymentStatus = 'Paid';\s+order\.razorpayPaymentId = razorpay_payment_id;\s+await order\.save\(\);/g,
  `order.paymentStatus = 'Paid';
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      // If the user made a 1 rupee payment, activate the subscription
      if (order.amount === 1 || order.amount === 149 || order.amount === 99) {
        // User model is already imported at the top of the file: import User from '../models/User.js';
        const subUser = await User.findById(order.user);
        if (subUser) {
          subUser.isSubscribed = true;
          subUser.subscriptionActivatedAt = new Date();
          subUser.subscriptionPaymentId = razorpay_payment_id;
          subUser.subscriptionDetails = {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            subscribedAt: new Date()
          };
          await subUser.save();
        }
      }`
);
fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
