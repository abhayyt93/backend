const mongoose = require('mongoose');
const uri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico';
async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'abhayyt93@gmail.com' });
  console.log("User:", JSON.stringify(user, null, 2));
  
  // Also check orders just in case
  const orders = await db.collection('orders').find({ userEmail: 'abhayyt93@gmail.com', amount: 1 }).toArray();
  console.log("Orders:", JSON.stringify(orders, null, 2));

  mongoose.disconnect();
}
test();
