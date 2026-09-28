import mongoose from 'mongoose';
import User from '../src/models/User.js';

async function run() {
  await mongoose.connect('mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico');
  const users = await User.find({ name: { $in: ['Abhay', 'Shubham'] } });
  console.log(users);
  process.exit(0);
}
run();
