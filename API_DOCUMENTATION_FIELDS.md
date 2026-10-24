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
- **Type:** `multipart/form-data` (uploading multiple files under `images` or `image`) or `application/json`
- **Body Fields:**
  ```json
  {
    "name": "Vitamin C Serum",
    "price": 499,
    "originalPrice": 899,
    "description": "Best serum for glowing skin",
    "image": "https://example.com/main-image.jpg",
    "images": [
      "https://example.com/main-image.jpg",
      "https://example.com/side-view.jpg",
      "https://example.com/ingredients-view.jpg"
    ],
    "category": "Skincare",
    "countInStock": 50,
    "stock": 50,
    "visibility": true,
    "notify": true,
    "keyBenefits": "Glowing skin, anti-aging",
    "ingredients": "Vitamin C, Hyaluronic Acid",
    "highlights": "No parabens",
    "brand": "Kosmico",
    "sku": "KOS-001",
    "shelfLife": "24 Months",
    "madeIn": "India"
  }
  ```
- **Note on Multiple Images & Notify:**
  - **Notify (ON / OFF):** Pass `"notify": true` or `"notify": false` (or in FormData `"true"`/`"false"`). If `true`, a push notification + in-app notification is automatically dispatched to active users.
  - **Multipart Upload:** You can attach multiple files in FormData using field name `images` (or `image`).
  - **JSON / String URLs:** You can pass `images` as an array of URLs or JSON string: `["url1", "url2"]`.
  - **Updating:** When updating with `PUT`, you can also pass `existingImages` (array of existing image URLs to keep) along with newly uploaded image files.
  - The first image in `images` is automatically assigned to `image` for 100% backward compatibility with single-image consumers.

### `PUT /admin/products/toggle-notify/:id`
- **Description:** Toggle product notification ON / OFF. When toggled ON, it automatically sends a push notification to users.
- **Headers:** `Authorization: Bearer <ADMIN_TOKEN>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Product notification turned ON",
    "notify": true,
    "product": { ... }
  }
  ```

### `PUT /admin/products/toggle-visibility/:id`
- **Description:** Toggle product visibility ON / OFF.
- **Headers:** `Authorization: Bearer <ADMIN_TOKEN>`

### `POST /admin/products/extract-url`
- **Description:** Scrape product details from a URL.
- **Body Fields:**
  ```json
  {
    "productUrl": "https://example.com/product-page"
  }
  ```

---

## 3. Payments & Orders (`/api/payment` & `/api/order`)

### `POST /order/place/razorpay` (or `/order/place/cod`)
- **Description:** Create a new order (Razorpay or COD). You can also use `/order/create/razorpay`.
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

---

## 9. Emergency APIs (`/api/emergency`)

### `POST /emergency/generate-message`
- **Description:** Generate emergency shareable message with live location link.
- **Body Fields:**
  ```json
  {
    "latitude": 28.7041,
    "longitude": 77.1025
  }
  ```

---

## 10. Post APIs (`/api/posts`)

### `POST /posts/`
- **Description:** Create a new post.
- **Body Fields:**
  ```json
  {
    "content": "Hello friends, ye mera pehla post hai!",
    "mediaUrls": ["image1.jpg", "video.mp4"],
    "privacyLevel": "friends", 
    "tags": ["firstpost", "chilling"],
    "location": "Mumbai"
  }
  ```

### `PUT /posts/:id`
- **Description:** Edit an existing post.
- **Body Fields:**
  ```json
  {
    "content": "Updated caption",
    "privacyLevel": "public"
  }
  ```

### `POST /posts/:id/comments`
- **Description:** Add a comment to a post.
- **Body Fields:**
  ```json
  {
    "text": "Nice post!"
  }
  ```

### `POST /posts/friend-request/send/:userId`
- **Description:** Send a friend request to a user.
- **Body Fields:** None. Parameter `userId` is in the URL.

### `POST /posts/friend-request/accept/:requestId` & `POST /posts/friend-request/reject/:requestId`
- **Description:** Accept or reject a friend request.
- **Body Fields:** None. Parameter `requestId` is in the URL.

### `GET /posts/friend-request/pending`
- **Description:** List pending friend requests.
- **Body Fields:** None.

### `POST /admin/updates`
- **Description**: Publish app updates dynamically.
- **Body Fields**:
  ```json
  {
    "title": "New Update",
    "version": "1.0.0",
    "type": "FEATURE",
    "releaseNotes": "Bug fixes",
    "playStoreUrl": "https://play.google.com/store/apps/..."
  }
  ```

### `GET /admin/app-config`
- **Description**: Get app version configurations for all platforms.
- **Body Fields**: None

### `PUT /admin/app-config`
- **Description**: Create or update app version configuration.
- **Body Fields**:
  ```json
  {
    "platform": "android",
    "latest_version": "2.3.0",
    "min_required_version": "2.1.0",
    "force_update": true,
    "playstore_url": "https://play.google.com/store/apps/details?id=com.kosmico.wellness"
  }
  ```
## Payment (/api/payment)

### `POST /payment/cod-upfront/create`
- **Description:** Create COD order with upfront delivery fee via Razorpay.
- **Body Fields:**
  ```json
  {
    "amount": 1500,
    "upfrontAmount": 150,
    "deliveryAddressId": "your_address_id",
    "items": [ { "product": "prod_id", "qty": 1, "price": 1500 } ]
  }
  ```

### `POST /payment/cod-upfront/verify`
- **Description:** Verify the upfront Razorpay payment for COD.
- **Body Fields:**
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "..."
  }
  ```

### `POST /payment/subscription/create`
- **Description:** Create a ₹99 subscription Razorpay order.
- **Body Fields:** None

### `POST /payment/subscription/verify`
- **Description:** Verify the subscription Razorpay payment and unlock features.
- **Body Fields:**
  ```json
  {
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "..."
  }
  ```

---

## 13. Cart APIs (`/api/cart`)

### `GET /cart/`
- **Description:** Get user's current cart items.
- **Body Fields:** None

### `POST /cart/add`
- **Description:** Add an item to the cart or update its quantity.
- **Body Fields:**
  ```json
  {
    "productId": "650a2b3c4d5...",
    "quantity": 1
  }
  ```

### `DELETE /cart/remove/:productId`
- **Description:** Remove a specific product from the cart completely.
- **Body Fields:** None. Parameter `productId` is in the URL.

### `DELETE /cart/clear`
- **Description:** Clear the entire cart for the user.
- **Body Fields:** None

---

## 14. Footsteps & Activity APIs (`/api/steps` or `/api/footsteps` or `/api/scans/steps`)

### `POST /steps/log` or `POST /steps/add` or `POST /steps`
- **Description:** Log footsteps (Quick Add e.g. +500, +1000, or Sensor Sync).
- **Body Fields:**
  ```json
  {
    "steps": 1000,
    "action": "add", // "add" to increment, "set" to replace, "auto" to keep max
    "goal": 10000,
    "source": "manual", // or "sensor", "smartwatch"
    "date": "2026-10-21" // optional (defaults to current date in IST)
  }
  ```

### `GET /steps/history` or `GET /steps/week`
- **Description:** Get 1-Week (7 days continuous) history ending today. Returns past dates, today's summary, and weekly totals.
- **Query Params:** `?days=7` (optional, default 7), `?steps=...` (optional auto-sync)
- **Body Fields:** None

### `GET /steps/today`
- **Description:** Get today's total footsteps, distance, calories, active minutes, and goal status.
- **Body Fields:** None

### `PUT /steps/goal` or `POST /steps/goal`
- **Description:** Update daily step goal.
- **Body Fields:**
  ```json
  {
    "goal": 10000
  }
  ```

### `POST /steps/sync`
- **Description:** Batch sync multiple days of steps from phone pedometer or wearable.
- **Body Fields:**
  ```json
  {
    "records": [
      { "date": "2026-10-20", "steps": 5100 },
      { "date": "2026-10-21", "steps": 7200 }
    ]
  }
  ```

---

## 15. FCM Cloud Messaging & Push Notifications (`/api/notifications`)

### `POST /notifications/fcm-token` or `POST /notifications/token`
- **Description:** Register or update device FCM token for receiving system tray notifications when app is closed.
- **Headers:** `Authorization: Bearer <token>`
- **Body Fields:**
  ```json
  {
    "fcmToken": "c1a2B3...d4e5F6",
    "platform": "android" // or "ios", "web"
  }
  ```

### `POST /notifications/test`
- **Description:** Trigger an immediate test push notification to the logged-in user's device.
- **Headers:** `Authorization: Bearer <token>`
- **Body Fields:**
  ```json
  {
    "title": "Kosmico Wellness 🎉",
    "body": "Your test notification arrived successfully!",
    "imageUrl": "https://api.kosmicowellness.com/uploads/banner.jpg"
  }
  ```

### `POST /admin/notifications/broadcast` or `POST /notifications/broadcast`
- **Description:** Send push notification to ALL registered app users (Flipkart style broadcast for offers, news, health alerts).
- **Headers:** `Authorization: Bearer <admin-or-user-token>`
- **Body Fields:**
  ```json
  {
    "title": "🎉 Big Sale Live on Kosmico!",
    "body": "Flat 40% off on all wellness supplements today. Tap to shop!",
    "imageUrl": "https://api.kosmicowellness.com/uploads/banner.jpg",
    "data": {
      "screen": "offers",
      "category": "supplements"
    }
  }
  ```

### `POST /admin/notifications/send` or `POST /notifications/send`
- **Description:** Send push notification to a specific user.
- **Headers:** `Authorization: Bearer <token>`
- **Body Fields:**
  ```json
  {
    "userId": "6ad85bbcfe537b1224b95f18",
    "title": "Order Shipped 🚚",
    "body": "Your order #10874 has been dispatched!",
    "data": {
      "screen": "order_details",
      "orderId": "10874"
    }
  }
  ```

### `GET /admin/notifications`
- **Description:** Get all notifications list for admin panel.
- **Headers:** `Authorization: Bearer <admin-token>`
- **Response:** `{ success: true, count: 50, notifications: [...] }`

### `GET /admin/users`
- **Description:** Get all users list for admin panel.
- **Headers:** `Authorization: Bearer <admin-token>`
- **Response:** `{ success: true, count: 120, users: [...] }`

### `GET /admin/payments`
- **Description:** Get all payments/orders for admin panel.
- **Headers:** `Authorization: Bearer <admin-token>`
- **Response:** `{ success: true, count: 35, payments: [...] }`

### `DELETE /notifications/clear` or `DELETE /notifications`
- **Description:** Clear all in-app notifications for the logged-in user.
- **Headers:** `Authorization: Bearer <user-token>`
- **Response:** `{ success: true, message: "All notifications cleared" }`



