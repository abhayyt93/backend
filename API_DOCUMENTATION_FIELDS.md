# Kosmico Backend API Endpoints & Fields

This document lists all major API endpoints along with their expected request body (`req.body`) text fields. 

> **Base URL:** `http://<server-ip>:5000/api`
> **Content-Type:** Usually `application/json` (except where `multipart/form-data` is mentioned for image uploads).

---

## 1. Authentication & Users (`/api/auth`)

### `POST /auth/register`
- **Description:** Send OTP to email for new user registration.
- **Body Fields:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

### `POST /auth/signup-verify`
- **Description:** Verify OTP and create user account.
- **Body Fields:**
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```

### `POST /auth/login`
- **Description:** Send OTP for login.
- **Body Fields:**
  ```json
  {
    "email": "john@example.com"
  }
  ```

### `POST /auth/login-verify`
- **Description:** Verify OTP to login and receive JWT token.
- **Body Fields:**
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```

### `POST /auth/resend-otp`
- **Description:** Resend OTP to user.
- **Body Fields:**
  ```json
  {
    "email": "john@example.com",
    "purpose": "register" // or "login"
  }
  ```

### `PUT /auth/profile`
- **Description:** Update user profile details.
- **Body Fields:**
  ```json
  {
    "name": "John Doe Updated",
    "phoneNumber": "9876543210"
  }
  ```
*(Can also accept `profilePicture` URL as text, or form-data for direct upload)*

---

## 2. Products (`/api/products` & `/api/admin/products`)

### `POST /products/:id/reviews`
- **Description:** Add a review to a product.
- **Body Fields:**
  ```json
  {
    "rating": 5,
    "comment": "Amazing product!"
  }
  ```

### `POST /admin/products/add-product` & `PUT /admin/products/update-product/:id`
- **Description:** Add or update a product.
- **Type:** `multipart/form-data` (if uploading `imageFile`) or `application/json`
- **Body Fields:**
  ```json
  {
    "name": "Vitamin C Serum",
    "price": 499,
    "originalPrice": 899,
    "description": "Best serum for glowing skin",
    "category": "Skincare",
    "countInStock": 50,
    "stock": 50,
    "visibility": "true",
    "keyBenefits": "Glowing skin, anti-aging",
    "ingredients": "Vitamin C, Hyaluronic Acid",
    "highlights": "No parabens",
    "brand": "Kosmico",
    "sku": "KOS-001",
    "shelfLife": "24 Months",
    "madeIn": "India"
  }
  ```

### `POST /admin/products/extract-url`
- **Description:** Scrape product details from a URL.
- **Body Fields:**
  ```json
  {
    "productUrl": "https://example.com/product-page"
  }
  ```

---

## 3. Payments & Orders (`/api/payment`)

### `POST /payment/razorpay/create` (Also for `/payment/cod`)
- **Description:** Create a new order (Razorpay or COD).
- **Body Fields:**
  ```json
  {
    "amount": 999,
    "deliveryAddressId": "60d5ec49c...", 
    "items": [
      {
        "product": "60d5ec49c...",
        "name": "Vitamin C Serum",
        "qty": 2,
        "price": 499
      }
    ],
    "couponCode": "WELCOME10",
    "discountAmount": 100,
    "deliveryFee": 50
  }
  ```

### `POST /payment/razorpay/verify`
- **Description:** Verify the payment after Razorpay success.
- **Body Fields:**
  ```json
  {
    "razorpay_order_id": "order_H...",
    "razorpay_payment_id": "pay_H...",
    "razorpay_signature": "abcdef123..."
  }
  ```

---

## 4. Wishlist (`/api/wishlist`)

### `POST /wishlist/add` & `DELETE /wishlist/remove`
- **Description:** Add or remove a product from the wishlist.
- **Body Fields:**
  ```json
  {
    "productId": "60d5ec49c..."
  }
  ```

---

## 5. Shiprocket Logistics (`/api/shiprocket`)

### `POST /shiprocket/estimate-delivery`
- **Description:** Get Estimated Delivery Date and Fee.
- **Body Fields:**
  ```json
  {
    "deliveryPincode": "110001",
    "weight": 0.5,
    "paymentMethod": "COD",
    "amount": 999,
    "declaredValue": 999
  }
  ```

---

## 6. Returns & Refunds (`/api/return` & `/api/refund`)

### `POST /return/request` & `POST /refund/request`
- **Description:** Request a return or refund for an order.
- **Body Fields:**
  ```json
  {
    "orderId": "60d5ec49c...",
    "reason": "Product was damaged"
  }
  ```

### `PUT /admin/return/:id/status` & `PUT /admin/refund/:id/status` (Admin)
- **Description:** Update status of return/refund.
- **Body Fields:**
  ```json
  {
    "status": "Approved",
    "adminComment": "Pickup arranged",
    "refundTransactionId": "txn_123" // Only for refunds if done manually
  }
  ```

---

## 7. Coupons (`/api/coupons` & `/api/admin/coupons`)

### `POST /coupons/verify`
- **Description:** Check if a coupon is valid for a cart.
- **Body Fields:**
  ```json
  {
    "code": "WELCOME10",
    "orderAmount": 1500
  }
  ```

### `POST /admin/coupons/add-coupon` (Admin)
- **Description:** Create a new discount coupon.
- **Body Fields:**
  ```json
  {
    "code": "FESTIVAL20",
    "description": "20% off on all products",
    "discountType": "percentage", // or "fixed"
    "discountValue": 20,
    "minOrderAmount": 1000,
    "maxDiscountAmount": 500,
    "expiryDate": "2026-12-31T00:00:00.000Z",
    "usageLimit": 100,
    "isActive": true
  }
  ```

---

## 8. Admin APIs (`/api/admin`)

### `POST /admin/signup` & `POST /admin/login`
- **Description:** Admin authentication.
- **Body Fields:**
  ```json
  {
    "email": "admin@kosmico.com",
    "password": "securepassword123"
  }
  ```

### `PUT /admin/orders/:id/status`
- **Description:** Update order status.
- **Body Fields:**
  ```json
  {
    "status": "Shipped",
    "paymentStatus": "Paid"
  }
  ```

### `POST /admin/notifications`
- **Description:** Send Push Notifications.
- **Body Fields:**
  ```json
  {
    "user": "all", // or a specific user ID
    "title": "Big Sale!",
    "message": "Get 50% off on everything today.",
    "type": "promo",
    "imageUrl": "https://example.com/banner.jpg"
  }
  ```
