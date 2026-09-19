# Complete API Documentation (User & Backend/Admin)

This document provides a comprehensive and detailed overview of all API endpoints available in the Kosmico platform, categorized by **User Side** and **Backend (Admin) Side**.

> **Base URL:** `http://<server-ip>:5000/api`
> **Content-Type:** Usually `application/json` (unless `multipart/form-data` is mentioned).

---

# 📱 User Side APIs

These endpoints are used by the mobile app or user-facing web application.

## 1. Authentication (`/api/auth` & `/api/users`)
- **`POST /auth/register`**: Send OTP to email for new user registration.
  - **Body**: `{ "name": "John Doe", "email": "john@example.com" }`
- **`POST /auth/signup-verify`**: Verify OTP and create user account.
  - **Body**: `{ "email": "john@example.com", "otp": "123456" }`
- **`POST /auth/login`**: Send OTP for login.
  - **Body**: `{ "email": "john@example.com" }`
- **`POST /auth/login-verify`**: Verify OTP to login and receive JWT token.
  - **Body**: `{ "email": "john@example.com", "otp": "123456" }`
- **`POST /auth/resend-otp`**: Resend OTP to user.
  - **Body**: `{ "email": "john@example.com", "purpose": "register" }` *(purpose can be `register` or `login`)*
- **`GET /users/profile`**: Get logged-in user profile. *(Protected)*
- **`PUT /users/profile`**: Update user profile details. *(Protected)*
  - **Body**: `{ "name": "John Doe Updated", "phoneNumber": "9876543210" }` *(Can also accept `profilePicture`)*

## 2. Products & Categories
- **`GET /products/`**: Get all active products with filters.
- **`GET /products/user/list`**: Get products for user list.
- **`GET /products/categories`**: Get distinct product categories.
- **`GET /products/bestsellers`**: Get bestseller products.
- **`GET /products/:id`**: Get details of a single product.
- **`GET /products/:id/reviews`**: Get reviews for a product.
- **`POST /products/:id/reviews`**: Add a review to a product. *(Protected)*
  - **Body**: `{ "rating": 5, "comment": "Amazing product!" }`
- **`GET /categories/`**: Get all categories.
- **`GET /categories/user/list`**: Get user-facing categories list.

## 3. Payments, Orders & Cart (`/api/payment`)
- **`POST /payment/razorpay/create`**: Create a new order via Razorpay. *(Protected)*
  - **Body**: 
    ```json
    {
      "amount": 999,
      "deliveryAddressId": "60d5ec49c...", 
      "items": [{ "product": "60d5ec49c...", "name": "Vitamin C Serum", "qty": 2, "price": 499 }],
      "couponCode": "WELCOME10",
      "discountAmount": 100,
      "deliveryFee": 50
    }
    ```
- **`POST /payment/razorpay/verify`**: Verify Razorpay payment. *(Protected)*
  - **Body**: `{ "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "..." }`
- **`POST /payment/cod`**: Create Cash on Delivery order. *(Protected)*
- **`POST /payment/cod-upfront/create`**: Create COD order with upfront payment. *(Protected)*
  - **Body**: `{ "amount": 1500, "upfrontAmount": 150, "deliveryAddressId": "...", "items": [...] }`
- **`POST /payment/cod-upfront/verify`**: Verify upfront Razorpay payment. *(Protected)*
- **`GET /payments/myorders`**: Get all past orders for the logged-in user. *(Protected)*

## 4. Wishlist (`/api/wishlist`)
- **`GET /wishlist/`**: Get user's wishlist. *(Protected)*
- **`POST /wishlist/add`**: Add product to wishlist. *(Protected)*
  - **Body**: `{ "productId": "60d5ec49c..." }`
- **`DELETE /wishlist/remove`**: Remove product from wishlist. *(Protected)*
  - **Body**: `{ "productId": "60d5ec49c..." }`

## 5. Addresses (`/api/addresses`)
- Complete CRUD API endpoints for managing User Delivery Addresses. *(Protected)*

## 6. Returns & Refunds
- **`POST /return/request`**: Request a return for an order.
  - **Body**: `{ "orderId": "60d5ec49c...", "reason": "Product was damaged" }`
- **`POST /refund/request`**: Request a refund.
  - **Body**: `{ "orderId": "60d5ec49c...", "reason": "Did not like the product" }`

## 7. Posts & Social (`/api/posts`)
- **`GET /posts/feed`**: Get post feed. *(Protected)*
- **`GET /posts/user/:userId`**: Get posts for a specific user. *(Protected)*
- **`GET /posts/:id`**: Get details of a single post. *(Protected)*
- **`POST /posts/`**: Create a new post. *(Protected)*
  - **Body**: `{ "content": "Hello friends!", "mediaUrls": ["image1.jpg"], "privacyLevel": "friends", "tags": ["chilling"], "location": "Mumbai" }`
- **`PUT /posts/:id`**: Edit a post. *(Protected)*
  - **Body**: `{ "content": "Updated caption", "privacyLevel": "public" }`
- **`DELETE /posts/:id`**: Delete a post. *(Protected)*
- **`POST /posts/:id/like`**: Like/unlike a post. *(Protected)*
- **`POST /posts/:id/comments`**: Add a comment. *(Protected)*
  - **Body**: `{ "text": "Nice post!" }`
- **`POST /posts/friend-request/send/:userId`**: Send a friend request. *(Protected)*
- **`POST /posts/friend-request/accept/:requestId`**: Accept request. *(Protected)*
- **`POST /posts/friend-request/reject/:requestId`**: Reject request. *(Protected)*
- **`GET /posts/friend-request/pending`**: List pending requests. *(Protected)*

## 8. Coupons (`/api/coupons`)
- **`POST /coupons/verify`**: Check if a coupon is valid for a cart.
  - **Body**: `{ "code": "WELCOME10", "orderAmount": 1500 }`

## 9. Emergency APIs
- **`POST /emergency/generate-message`**: Generate emergency shareable message.
  - **Body**: `{ "latitude": 28.7041, "longitude": 77.1025 }`

---

# 🛠️ Backend (Admin) Side APIs

These endpoints are protected and used by the admin panel dashboard.

## 1. Admin Authentication (`/api/admin`)
- **`POST /admin/signup`**: Register an admin account.
  - **Body**: `{ "email": "admin@kosmico.com", "password": "securepassword123" }`
- **`POST /admin/signup-verify`**: Verify admin OTP.
- **`POST /admin/login`**: Login as admin.
  - **Body**: `{ "email": "admin@kosmico.com", "password": "securepassword123" }`
- **`POST /admin/forgot-password`**: Request password reset.
- **`POST /admin/verify-otp`**: Verify OTP for password reset.
- **`POST /admin/reset-password`**: Set new password.

## 2. Product Management
- **`GET /products/admin/list`**: List all products for admin dashboard.
- **`POST /admin/products/add-product`**: Create a new product (supports `multipart/form-data`).
  - **Body**: 
    ```json
    {
      "name": "Vitamin C Serum",
      "price": 499,
      "originalPrice": 899,
      "description": "Best serum",
      "category": "Skincare",
      "countInStock": 50,
      "stock": 50,
      "visibility": "true",
      "brand": "Kosmico"
    }
    ```
- **`PUT /admin/products/update-product/:id`**: Edit product details.
- **`PUT /products/admin/toggle-visibility/:id`**: Toggle product visibility.
- **`DELETE /products/admin/delete-product/:id`**: Delete a product.
- **`POST /admin/products/extract-url`**: Scrape product data from external URL.
  - **Body**: `{ "productUrl": "https://example.com/product-page" }`

## 3. Order & Returns Management
- **`PUT /admin/orders/:id/status`**: Update order delivery status.
  - **Body**: `{ "status": "Shipped", "paymentStatus": "Paid" }`
- **`PUT /admin/return/:id/status`**: Update status of return.
  - **Body**: `{ "status": "Approved", "adminComment": "Pickup arranged" }`
- **`PUT /admin/refund/:id/status`**: Update status of refund.
  - **Body**: `{ "status": "Approved", "adminComment": "Processed", "refundTransactionId": "txn_123" }`

## 4. User & Category Management
- **`DELETE /admin/users/:id`**: Delete a user account.
- **`PUT /admin/users/:id/block`**: Block/Unblock a user.
- **`POST /categories/admin/add-category`**: Create a new category.
- **`DELETE /categories/admin/delete-category/:id`**: Delete a category.

## 5. Coupon Management
- **`POST /admin/coupons/add-coupon`**: Create a new discount coupon.
  - **Body**: 
    ```json
    {
      "code": "FESTIVAL20",
      "description": "20% off",
      "discountType": "percentage",
      "discountValue": 20,
      "minOrderAmount": 1000,
      "isActive": true
    }
    ```

## 6. App Configuration & System
- **`GET /admin/dashboard`**: Get analytics/metrics for dashboard.
- **`GET /admin/app-config`**: Get app version configurations for all platforms.
- **`PUT /admin/app-config`**: Create or update app version configuration.
  - **Body**: `{ "platform": "android", "latest_version": "2.3.0", "force_update": true, "playstore_url": "..." }`
- **`POST /admin/updates`**: Publish app updates dynamically.
- **`GET /system/status`**: Check system status and versions.

## 7. Notifications (`/api/admin/notifications`)
- **`POST /admin/notifications`**: Broadcast a push notification.
  - **Body**: `{ "user": "all", "title": "Big Sale!", "message": "Get 50% off", "type": "promo" }`
- **`DELETE /admin/notifications/:id`**: Delete a broadcast notification.

## 8. Logistics (`/api/shiprocket`)
- **`POST /shiprocket/estimate-delivery`**: Get Estimated Delivery Date and Fee.
  - **Body**: `{ "deliveryPincode": "110001", "weight": 0.5, "paymentMethod": "COD", "amount": 999 }`
