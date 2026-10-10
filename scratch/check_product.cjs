const mongoose = require('mongoose');
const uri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico';
async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const product = await db.collection('products').findOne({ _id: new mongoose.Types.ObjectId('6ab0e364a4055d1ffd6a9f68') });
  console.log("Product:", JSON.stringify(product, null, 2));
  mongoose.disconnect();
}
test();
