const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/controllers/paymentController.js');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /user\.isSubscribed = true;\s+user\.subscriptionDetails = \{\s+orderId: razorpay_order_id,\s+paymentId: razorpay_payment_id,\s+signature: razorpay_signature,\s+subscribedAt: new Date\(\)\s+\};\s+await user\.save\(\);/g,
  `user.isSubscribed = true;\n      user.subscriptionActivatedAt = new Date();\n      user.subscriptionPaymentId = razorpay_payment_id;\n      user.subscriptionDetails = {\n        orderId: razorpay_order_id,\n        paymentId: razorpay_payment_id,\n        signature: razorpay_signature,\n        subscribedAt: new Date()\n      };\n      await user.save();`
);
fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
