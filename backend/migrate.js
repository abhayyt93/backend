import mongoose from 'mongoose';

const oldUri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/';
const newUri = 'mongodb+srv://KosmicoWellness:KosmicoWellness@cluster0.67auck3.mongodb.net/kosmico';

async function migrate() {
  console.log('Connecting to old database (test)...');
  const oldConn = await mongoose.createConnection(oldUri).asPromise();
  
  console.log('Connecting to new database (kosmico)...');
  const newConn = await mongoose.createConnection(newUri).asPromise();
  
  try {
    // Migrate users
    const oldUsers = await oldConn.collection('users').find({}).toArray();
    console.log(`Found ${oldUsers.length} users in test db.`);
    
    if (oldUsers.length > 0) {
      // Find existing users in kosmico to avoid duplicate key errors on email
      const existingEmails = (await newConn.collection('users').find({}, { projection: { email: 1 } }).toArray()).map(u => u.email);
      const newUsers = oldUsers.filter(u => !existingEmails.includes(u.email));
      
      if (newUsers.length > 0) {
         const result = await newConn.collection('users').insertMany(newUsers);
         console.log(`Inserted ${result.insertedCount} users into kosmico db.`);
      } else {
         console.log('No new users to insert (all exist in kosmico).');
      }
    }
    
    // Drop test database
    console.log('Dropping test database...');
    await oldConn.dropDatabase();
    console.log('Test database dropped successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await oldConn.close();
    await newConn.close();
    console.log('Migration complete. You can delete this script.');
  }
}

migrate();
