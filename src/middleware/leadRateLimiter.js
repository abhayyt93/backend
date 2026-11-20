// In-memory sliding window rate limiter for Lead Capture API
// Prevents spam submissions without needing external dependencies

const leadRequestMap = new Map();

// Configuration: max 5 requests per 10 minutes per IP
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

// Periodically clean up entries older than WINDOW_MS every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of leadRequestMap.entries()) {
    if (now - data.firstRequestTime > WINDOW_MS) {
      leadRequestMap.delete(ip);
    }
  }
}, 15 * 60 * 1000).unref(); // unref so it won't keep process alive on exit

export const leadRateLimiter = (req, res, next) => {
  try {
    // Get client IP address
    const clientIp = 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
      req.ip || 
      req.socket?.remoteAddress || 
      'unknown-ip';

    const now = Date.now();
    const entry = leadRequestMap.get(clientIp);

    if (!entry) {
      leadRequestMap.set(clientIp, {
        count: 1,
        firstRequestTime: now
      });
      return next();
    }

    // Check if the current window has expired
    if (now - entry.firstRequestTime > WINDOW_MS) {
      // Reset window
      leadRequestMap.set(clientIp, {
        count: 1,
        firstRequestTime: now
      });
      return next();
    }

    // Increment count within the window
    entry.count += 1;

    if (entry.count > MAX_REQUESTS) {
      const remainingSeconds = Math.ceil((WINDOW_MS - (now - entry.firstRequestTime)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many submissions from this IP. Please try again after ${Math.ceil(remainingSeconds / 60)} minute(s).`,
        retryAfterSeconds: remainingSeconds
      });
    }

    next();
  } catch (error) {
    console.error('Lead rate limiter error:', error);
    next(); // Fail open so valid users aren't blocked on unexpected error
  }
};
