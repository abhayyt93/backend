import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware.js';

import productRoutes from './routes/productRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

// Load env variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Maintenance Middleware (Intercepts user requests)
app.use(maintenanceMiddleware);

// Make uploads folder static so images can be accessed
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kosmico Auth API is running' });
});

// Error middleware
app.use(errorHandler);

// Port configuration
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle port already in use error gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`💡 Fix: Run this command first → npx kill-port ${PORT}`);
    console.error(`   Then run: npm run dev`);
    process.exit(1);
  }
  throw err;
});
