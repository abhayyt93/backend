const mongoose = require('mongoose');
const uri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico';
async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const recentOrders = await db.collection('orders').find().sort({createdAt: -1}).limit(5).toArray();
  console.log("Recent Orders:", JSON.stringify(recentOrders, null, 2));
  
  const recentUsers = await db.collection('users').find({email: 'abhayyt93@gmail.com'}).toArray();
  console.log("User:", JSON.stringify(recentUsers, null, 2));

  mongoose.disconnect();
}
test();
