const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/controllers/webhookController.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const userId = paymentEntity\.notes\?\.user_id;\s+if \(userId\) {/,
  `let userId = paymentEntity.notes?.user_id;
                
                // If not in notes, check if it was a regular order (e.g. 1 rupee order)
                if (!userId) {
                    const Order = require('../models/Order.js').default || require('../models/Order.js');
                    const order = await Order.findOne({ razorpayOrderId: orderId });
                    if (order && order.user) {
                        userId = order.user;
                    }
                }

                if (userId) {`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Webhook replaced successfully');
