# Kosmico Backend API Documentation

This document outlines all the REST APIs setup in the Kosmico Backend project.

> **Base URL:** `http://<server-ip>:5000/api`

---

## 1. Authentication & User APIs (`/api/users`)
- `POST /users/register` : Register a new user.
- `POST /users/signup-verify` : Verify user OTP for registration.
- `POST /users/login` : Login user with email/phone.
- `POST /users/login-verify` : Verify OTP for login.
- `POST /users/resend-otp` : Resend OTP to user.
- `GET /users/profile` : Get logged-in user profile. **(Protected)**
- `PUT /users/profile` : Update user profile (multipart/form-data for `profilePicture`). **(Protected)**
- `PUT /users/profile-picture` : Update only profile picture. **(Protected)**

---

## 2. Product APIs (`/api/products` or `/api/admin/products`)
### User Endpoints
- `GET /products/` : Get all active products with filters.
- `GET /products/user/list` : Get products for user list.
- `GET /products/categories` : Get distinct product categories.
- `GET /products/bestsellers` : Get bestseller products.
- `GET /products/:id` : Get details of a single product.
- `GET /products/:id/reviews` : Get reviews for a product.
- `POST /products/:id/reviews` : Submit a product review. **(Protected)**

### Admin Endpoints (Protected by Admin token)
- `POST /products/admin/extract-url` : Scrape product data from external URL.
- `POST /products/admin/upload-image` : Upload product image directly.
- `POST /products/admin/add-product` : Create a new product. Supports `imageFile` upload.
- `GET /products/admin/list` : List all products for admin dashboard.
- `PUT /products/admin/update-product/:id` : Edit product details. Supports `imageFile` upload.
- `PUT /products/admin/toggle-visibility/:id` : Toggle product visibility ON/OFF.
- `DELETE /products/admin/delete-product/:id` : Delete a product.

---

## 3. Category APIs (`/api/categories` or `/api/admin/categories`)
- `GET /categories/` : Get all categories.
- `GET /categories/user/list` : Get user-facing categories list.
- `POST /categories/admin/add-category` : Create a new category. **(Admin)**
- `DELETE /categories/admin/delete-category/:id` : Delete a category. **(Admin)**

---

## 4. Wishlist APIs (`/api/wishlist`)
- `POST /wishlist/add` : Add product to wishlist. **(Protected)**
- `GET /wishlist/` : Get user's wishlist. **(Protected)**
- `DELETE /wishlist/remove` : Remove product from wishlist. **(Protected)**

---

## 5. Order & Payment APIs (`/api/payments`)
- `POST /payments/razorpay/create` : Create a new Razorpay order. **(Protected)**
- `POST /payments/razorpay/verify` : Verify Razorpay payment signature. **(Protected)**
- `POST /payments/cod` : Create Cash on Delivery order. **(Protected)**
- `GET /payments/myorders` : Get all past orders for logged-in user. **(Protected)**
- `POST /payments/save-method` : Save a payment method for future use. **(Protected)**
- `GET /payments/saved-methods` : Get user's saved payment methods. **(Protected)**
- `PUT /payments/save-method/:methodId` : Update saved payment method. **(Protected)**
- `DELETE /payments/save-method/:methodId` : Remove saved payment method. **(Protected)**

---

## 6. Address APIs (`/api/addresses`)
- Complete CRUD API endpoints for managing User Delivery Addresses. **(Protected)**

---

## 7. Notification APIs (`/api/notifications`)
- `GET /notifications/` : Get user notifications. **(Protected)**
- `PUT /notifications/:id/read` : Mark notification as read. **(Protected)**
- `DELETE /notifications/:id` : Delete a notification. **(Protected)**

---

## 8. Admin Control APIs (`/api/admin`)
### Public Admin Auth
- `POST /admin/signup` : Register an admin account.
- `POST /admin/signup-verify` : Verify admin OTP.
- `POST /admin/login` : Login as admin.
- `POST /admin/forgot-password` : Request password reset.
- `POST /admin/verify-otp` : Verify OTP for password reset.
- `POST /admin/reset-password` : Set new password.

### Protected Admin Controls
- `GET /admin/dashboard` : Get analytics/metrics for dashboard.
- `DELETE /admin/users/:id` : Delete a user account.
- `PUT /admin/users/:id/block` : Block/Unblock a user.
- `PUT /admin/orders/:id/status` : Update order delivery status.
- `POST /admin/notifications` : Broadcast a push notification.
- `DELETE /admin/notifications/:id` : Delete a broadcast notification.
- `GET /admin/maintenance` : Get current maintenance mode status.
- `POST/PUT /admin/maintenance` : Toggle maintenance mode ON/OFF.
- `POST /admin/updates` : Publish app updates dynamically.

---

## 9. System APIs (`/api/system`)
- `GET /system/status` : Check system status and versions.
- `GET /system/updates/latest` : Get latest OTA update payload for frontend apps.

---

## 10. Global Upload APIs
- `POST /api/upload` : Fallback endpoint for generic image file uploads (expects `imageFile` form data field).

---

> **Note on File Uploads:** All image uploads support `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`, and `.bmp` formats. Maximum file size is typically limited to 5MB.
