const mongoose = require('mongoose');
const uri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico';
async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  await db.collection('users').updateOne(
    { email: 'abhayyt93@gmail.com' },
    { $set: { isSubscribed: true, subscriptionActivatedAt: new Date() } }
  );
  
  console.log("Updated Abhay successfully!");
  mongoose.disconnect();
}
run();
