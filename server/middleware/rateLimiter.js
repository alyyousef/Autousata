/**
 * Rate Limiter Middleware
 * Prevents spam bidding by limiting bids per user per second
 * Uses in-memory store (can be upgraded to Redis for production scaling)
 */

// In-memory store: Map<userId, lastBidTimestamp>
const userBidTimestamps = new Map();

// Configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const MAX_BIDS_PER_WINDOW = 1;

/**
 * Rate limiter for Express routes
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
function rateLimitBid(req, res, next) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  const now = Date.now();
  const lastBidTime = userBidTimestamps.get(userId);

  if (lastBidTime) {
    const timeSinceLastBid = now - lastBidTime;

    if (timeSinceLastBid < RATE_LIMIT_WINDOW_MS) {
      const waitTimeMs = RATE_LIMIT_WINDOW_MS - timeSinceLastBid;
      const waitTimeSec = (waitTimeMs / 1000).toFixed(1);

      return res.status(429).json({
        msg: `Rate limit exceeded. Please wait ${waitTimeSec} seconds before bidding again.`,
        retryAfter: waitTimeSec
      });
    }
  }

  // Update timestamp
  userBidTimestamps.set(userId, now);

  // Clean up old entries (older than 5 minutes)
  if (userBidTimestamps.size > 1000) {
    cleanupOldEntries();
  }

  next();
}

/**
 * Rate limiter for Socket.IO events
 * @param {string} userId - User ID
 * @returns {Object} - { allowed: boolean, retryAfter: number }
 */
function checkSocketRateLimit(userId) {
  const now = Date.now();
  const lastBidTime = userBidTimestamps.get(userId);

  if (lastBidTime) {
    const timeSinceLastBid = now - lastBidTime;

    if (timeSinceLastBid < RATE_LIMIT_WINDOW_MS) {
      const waitTimeMs = RATE_LIMIT_WINDOW_MS - timeSinceLastBid;
      const waitTimeSec = (waitTimeMs / 1000).toFixed(1);

      return {
        allowed: false,
        retryAfter: waitTimeSec,
        message: `Rate limit exceeded. Please wait ${waitTimeSec} seconds before bidding again.`
      };
    }
  }

  // Update timestamp
  userBidTimestamps.set(userId, now);

  // Clean up old entries
  if (userBidTimestamps.size > 1000) {
    cleanupOldEntries();
  }

  return { allowed: true };
}

/**
 * Clean up old entries from the rate limiter store
 * Removes entries older than 5 minutes
 */
function cleanupOldEntries() {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  for (const [userId, timestamp] of userBidTimestamps.entries()) {
    if (timestamp < fiveMinutesAgo) {
      userBidTimestamps.delete(userId);
    }
  }
}

/**
 * Clear rate limit for a specific user (for testing)
 * @param {string} userId - User ID
 */
function clearUserRateLimit(userId) {
  userBidTimestamps.delete(userId);
}

/**
 * Clear all rate limits (for testing)
 */
function clearAllRateLimits() {
  userBidTimestamps.clear();
}

/**
 * Get rate limit statistics
 * @returns {Object} - { totalUsers: number, oldestEntry: number }
 */
function getRateLimitStats() {
  const now = Date.now();
  let oldestTimestamp = now;

  for (const timestamp of userBidTimestamps.values()) {
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
    }
  }

  return {
    totalUsers: userBidTimestamps.size,
    oldestEntry: oldestTimestamp ? (now - oldestTimestamp) / 1000 : 0
  };
}

// Periodically clean up old entries (every 5 minutes)
setInterval(cleanupOldEntries, 5 * 60 * 1000);

module.exports = {
  rateLimitBid,
  checkSocketRateLimit,
  clearUserRateLimit,
  clearAllRateLimits,
  getRateLimitStats
};
