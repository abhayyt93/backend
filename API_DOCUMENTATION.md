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
- `POST /products/:id/notify-me` : Subscribe user to be alerted when a Notify-mode product becomes available. **(Protected)**

### Admin Endpoints (Protected by Admin token)
- `POST /products/admin/extract-url` : Scrape product data from external URL.
- `POST /products/admin/upload-image` or `POST /products/admin/upload-images` : Upload product image(s). Supports single or multiple file uploads (`image`, `images`, `imageFile`). Returns `{ imageUrl, images: [urls] }`.
- `POST /products/admin/add-product` : Create a new product. Supports multiple images (`images`), and `notify` (ON/OFF boolean). If `notify: true`, product cannot be bought (users see Notify).
- `GET /products/admin/list` : List all products for admin dashboard (returns `images` array, `image`, `notify`, `notifyStatus`, `canBuy`, and `stockStatus` for each product).
- `PUT /products/admin/update-product/:id` : Edit product details. Supports multiple images, and `notify` (ON/OFF boolean).
- `PUT /products/admin/toggle-visibility/:id` : Toggle product visibility ON/OFF.
- `PUT /products/admin/toggle-notify/:id` : Toggle product notify mode ON/OFF (ON = user cannot buy & sees Notify; OFF = product is buyable & subscribers alerted).
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

## 5. Order & Payment APIs (`/api/payment` & `/api/order`)
- `POST /order/place/razorpay` (or `/order/create/razorpay`) : Create a new Razorpay order. **(Protected)**
- `POST /payment/verify` (or `/order/verify`) : Verify payment signature from Razorpay. **(Protected)**
- `GET /order/my-orders` : Get list of all orders made by user. **(Protected)**
- `GET /order/:id` : Get single order details. **(Protected)**
- `PUT /order/cancel/:id` : Cancel order by customer. **(Protected)**
- `POST /payment/webhook` : Razorpay webhook endpoint.

---

## 6. Return & Refund APIs (`/api/return` & `/api/refund`)
- `POST /return/request` : Request a return for an order. **(Protected)**
- `POST /refund/request` : Request a refund. **(Protected)**
- `GET /return/user` : Get user's return requests. **(Protected)**
- `GET /refund/user` : Get user's refund requests. **(Protected)**
- `GET /admin/returns` : Get all return requests. **(Admin)**
- `GET /admin/refunds` : Get all refund requests. **(Admin)**
- `PUT /admin/return/:id/status` : Update status of return. **(Admin)**
- `PUT /admin/refund/:id/status` : Update status of refund. **(Admin)**

---

## 7. Coupon APIs (`/api/coupons` & `/api/admin/coupons`)
- `POST /coupons/verify` : Check and apply coupon code. **(Protected)**
- `GET /coupons/` : Get active coupons for user.
- `POST /admin/coupons/add-coupon` : Create new coupon. **(Admin)**
- `GET /admin/coupons/list` : Get all coupons list. **(Admin)**
- `DELETE /admin/coupons/:id` : Delete a coupon. **(Admin)**

---

## 8. Shiprocket Courier APIs (`/api/shiprocket`)
- `POST /shiprocket/check-serviceability` : Check delivery pincode serviceability and estimated delivery date.
- `POST /shiprocket/generate-awb` : Generate AWB tracking number. **(Admin)**
- `POST /shiprocket/request-pickup` : Request courier pickup. **(Admin)**
- `POST /shiprocket/cancel-shipment` : Cancel order shipment. **(Admin)**
- `GET /shiprocket/track/:orderId` : Track order delivery status. **(Protected)**

---

## 9. Gluco Monitoring APIs (`/api/gluco`)
- `POST /gluco/reading` : Log a glucose level reading. **(Protected)**
- `GET /gluco/history` : Get list of previous glucose readings. **(Protected)**
- `GET /gluco/analytics` : Get analytical metrics on glucose trends. **(Protected)**

---

## 10. Clinical Lab Reports APIs (`/api/reports` or `/api/report`)
- `POST /reports/upload` : Upload PDF/Image lab test report. **(Protected)**
- `GET /reports/my-reports` : Get list of all uploaded reports for user. **(Protected)**
- `GET /reports/:id` : Get single report details. **(Protected)**
- `DELETE /reports/:id` : Delete a report. **(Protected)**

---

## 11. Emergency SOS APIs (`/api/emergency`)
- `POST /emergency/contacts` : Add emergency contact. **(Protected)**
- `GET /emergency/contacts` : Get list of emergency contacts. **(Protected)**
- `POST /emergency/sos` : Trigger SOS alert (sends SMS/Email to contacts). **(Protected)**

---

## 12. Community & Feed APIs (`/api/posts`)
- `POST /posts/` : Create a community post. **(Protected)**
- `GET /posts/` : Get community posts feed.
- `POST /posts/:id/like` : Like/unlike a post. **(Protected)**
- `POST /posts/:id/comments` : Add a comment to a post. **(Protected)**
- `POST /posts/friend-request/send/:userId` : Send a friend request to a user. **(Protected)**
- `POST /posts/friend-request/accept/:requestId` : Accept a pending friend request. **(Protected)**
- `POST /posts/friend-request/reject/:requestId` : Reject a pending friend request. **(Protected)**
- `GET /posts/friend-request/pending` : Get all pending incoming friend requests for the user. **(Protected)**

## Payment APIs (/api/payment)
- `POST /payment/cod-upfront/create` : Create COD order with upfront payment.
- `POST /payment/cod-upfront/verify` : Verify upfront Razorpay payment.
- `POST /payment/subscription/create` : Create a ₹149 subscription Razorpay order (Deprecated in favor of new /api/subscription). **(Protected)**
- `POST /payment/subscription/verify` : Verify Razorpay subscription payment and unlock features (Deprecated in favor of new /api/subscription). **(Protected)**

---

## 14. Subscription APIs (`/api/subscription`)
- `POST /subscription/create-order` : Create a fixed ₹149 subscription Razorpay order. **(Protected)**
- `POST /subscription/verify` : Verify subscription payment, unlock features, and set `isSubscribed: true`. **(Protected)**
- `POST /subscription/trial/consume` : Atomic counter for trial features. Max 2 trials per feature. **(Protected)**
- `GET /subscription/status` : Get subscription status (`isSubscribed`) and trial usage counts. **(Protected)**

---

## 15. Webhook APIs (`/api/webhooks`)
- `POST /webhooks/razorpay` : Razorpay webhook endpoint for `payment.captured`, `refund.created`, and `refund.processed`. Auto-activates/revokes subscriptions if user drops off.

---

## 13. Cart APIs (`/api/cart`)
- `GET /cart/` : Get user's current cart items. **(Protected)**
- `POST /cart/add` : Add item to cart or update quantity. **(Protected)**
- `DELETE /cart/remove/:productId` : Remove a specific product from cart. **(Protected)**
- `DELETE /cart/clear` : Clear the entire cart. **(Protected)**

---

## 16. Footsteps & Activity APIs (`/api/steps` or `/api/footsteps` or `/api/scans/steps`)
- `POST /steps/log` (or `POST /steps`, `POST /steps/add`) : Log footsteps (Quick add e.g. +500, +1000, or sensor sync). **(Protected)**
  - Body: `{ "steps": 1000, "action": "add" | "set", "goal": 10000, "source": "manual" | "sensor" }`
- `GET /steps/history` (or `GET /steps/week`) : Get 1-Week (7 continuous days) history ending today with daily steps, distance (km), calories (kcal), active minutes, goal, and completion percentage. **(Protected)**
- `GET /steps/today` : Get today's total steps, distance, calories, and goal status. **(Protected)**
- `PUT /steps/goal` : Update daily step goal (e.g. 5000, 7500, 10000, 12500, 15000). **(Protected)**
  - Body: `{ "goal": 10000 }`
- `POST /steps/sync` : Batch sync multiple days of steps from phone pedometer or smartwatch. **(Protected)**
  - Body: `{ "records": [{ "date": "2026-10-19", "steps": 6500 }] }`

---

## 17. Smart Notifications & Push APIs (`/api/notifications` or `/api/admin/notifications`)
- `GET /notifications` : Get user's active in-app notifications. **(Protected)**
- `PUT /notifications/:id/read` : Mark an in-app notification as read. **(Protected)**
- `DELETE /notifications/:id` : Delete an in-app notification. **(Protected)**
- `DELETE /notifications/clear` : Clear all in-app notifications. **(Protected)**
- `POST /notifications/fcm-token` (or `/notifications/token`) : Register or update user device FCM token for push notifications. **(Protected)**
- `POST /notifications/send` (or `/admin/notifications/send`) : Send a push + in-app notification to a specific user. **(Protected/Admin)**
- `POST /notifications/broadcast` (or `/admin/notifications/broadcast`) : Broadcast push + in-app notification to all active device tokens. **(Protected/Admin)**
- `POST /notifications/test` : Send a test push notification to the logged-in user device. **(Protected)**

---

## 18. Notification Preferences APIs (`/api/notification-preferences` or `/api/admin/notification-preferences`)
*Supports User Token & Admin Token, as well as optional `userId` in query/body for admin management.*
- `GET /notification-preferences` (or `/admin/notification-preferences`) : Get notification preferences, quiet hours settings, and category toggles. Auto-creates default preferences if not configured. **(Protected)**
- `PUT /notification-preferences` (or `/admin/notification-preferences` / `POST`) : Update notification preferences (categories, quietHours, channels). **(Protected)**
- `PUT /notification-preferences/quiet-hours` (or `/admin/notification-preferences/quiet-hours`) : Update quiet hours config (`enabled`, `start` e.g. "22:00", `end` e.g. "07:00", `timezone`). **(Protected)**
- `PUT /notification-preferences/category/:category` (or `/admin/notification-preferences/category/:category`) : Toggle specific category ON/OFF (e.g. hydration, inactivity, glucoseAlerts, bpAlerts, stepGoals, waterGoals, dailySummary, morningMotivation, medication, weeklyReport, healthTips, promotions). **(Protected)**

---

## 19. AI Health Analysis APIs (`/api/notification-analysis` or `/api/admin/notification-analysis`)
*Supports User Token & Admin Token, as well as optional `userId` in query/body for admin inspection.*
- `POST /notification-analysis/trigger` (or `/admin/notification-analysis/trigger`) : Trigger manual on-demand AI health analysis, calculate health scores, evaluate trends, generate recommendations and save `AnalysisResult`. **(Protected)**
- `GET /notification-analysis/latest` (or `/admin/notification-analysis/latest`) : Get the latest AI health analysis report with scores, trends, insights, and recommendations. **(Protected)**
- `GET /notification-analysis/history` (or `/admin/notification-analysis/history`) : Get analysis history with pagination (`page`, `limit`) and optional `type` filter. **(Protected)**
- `GET /notification-analysis/scores` (or `/admin/notification-analysis/scores`) : Get last 7 analysis health score trends. **(Protected)**
- `GET /notification-analysis/:id` (or `/admin/notification-analysis/:id`) : Get single detailed analysis report by ID. **(Protected)**

---

## 20. Notification History APIs (`/api/notification-history` or `/api/admin/notification-history`)
*Supports User Token & Admin Token, as well as optional `userId` in query/body for admin lookup.*
- `GET /notification-history` (or `/admin/notification-history`) : Get notification audit history with pagination (`page`, `limit`), and filter by `category`, `isRead`, or `status`. Returns `total`, `unreadCount`, and `history`. **(Protected)**
- `GET /notification-history/unread-count` (or `/admin/notification-history/unread-count`) : Get count of unread notifications for client badge counter. **(Protected)**
- `PUT /notification-history/:id/read` (or `/admin/notification-history/:id/read`) : Mark a notification history record as read. **(Protected)**
- `PUT /notification-history/mark-all-read` (or `/admin/notification-history/mark-all-read`) : Mark all notification history records for user as read. **(Protected)**
- `POST /notification-history/bulk-read` (or `/admin/notification-history/bulk-read`) : Mark multiple notifications as read by providing an array of IDs `{ "ids": [...] }`. **(Protected)**
- `DELETE /notification-history/:id` (or `/admin/notification-history/:id`) : Delete a single notification history record. **(Protected)**
- `DELETE /notification-history/clear-all` (or `/admin/notification-history/clear-all`) : Clear all notification history for user. **(Protected)**

---

## 21. Blog APIs (`/api/blogs` & `/api/admin/blogs`)
- `GET /blogs` : List published blogs. Supports `page`, `limit` (maximum 100), `category`, and `search` query parameters.
- `GET /blogs/:id` : Get a single published blog.
- `POST /admin/blogs` : Create and publish a blog immediately; optionally set `status` to `draft`. **(Admin)**
- `GET /admin/blogs` : List all blogs; optional `status=draft|published`, `page`, and `limit` filters. **(Admin)**
- `GET /admin/blogs/:id` : Get a blog, including drafts. **(Admin)**
- `PUT /admin/blogs/:id` or `PATCH /admin/blogs/:id` : Update blog fields or change its status between `draft` and `published`. **(Admin)**
- `DELETE /admin/blogs/:id` : Delete a blog. **(Admin)**
