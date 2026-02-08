/**
 * Utility for anonymizing bidder names in auction contexts
 * Format: J***n D*e (partial obfuscation)
 */

// In-memory cache for consistent obfuscation during auction session
const bidderNameCache = new Map();

/**
 * Obfuscate a bidder's name for display in public auction contexts
 * @param {string} firstName - Bidder's first name
 * @param {string} lastName - Bidder's last name
 * @param {string} bidderId - Unique bidder ID for consistent obfuscation
 * @returns {string} - Obfuscated name (e.g., "J***n D*e")
 */
function obfuscateName(firstName, lastName, bidderId) {
  // Check cache for consistency
  const cacheKey = `${bidderId}`;
  if (bidderNameCache.has(cacheKey)) {
    return bidderNameCache.get(cacheKey);
  }

  // Normalize names
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first && !last) {
    return 'Anonymous';
  }

  // Obfuscate first name: show first letter + asterisks + last letter
  const obfuscateWord = (word) => {
    if (!word || word.length === 0) return '';
    if (word.length === 1) return word[0] + '*';
    if (word.length === 2) return word[0] + '*';
    
    const firstChar = word[0];
    const lastChar = word[word.length - 1];
    const middleLength = Math.min(word.length - 2, 3); // Max 3 asterisks
    const asterisks = '*'.repeat(middleLength);
    
    return `${firstChar}${asterisks}${lastChar}`;
  };

  const obfuscatedFirst = obfuscateWord(first);
  const obfuscatedLast = obfuscateWord(last);

  let result;
  if (obfuscatedFirst && obfuscatedLast) {
    result = `${obfuscatedFirst} ${obfuscatedLast}`;
  } else if (obfuscatedFirst) {
    result = obfuscatedFirst;
  } else {
    result = obfuscatedLast;
  }

  // Cache the result
  bidderNameCache.set(cacheKey, result);

  return result;
}

/**
 * Check if a user should see full bidder names (seller, admin)
 * @param {string} requesterId - ID of the user making the request
 * @param {string} sellerId - ID of the auction seller
 * @param {string} requesterRole - Role of the requester ('admin', 'client', etc.)
 * @returns {boolean} - True if user can see full names
 */
function canSeeFullNames(requesterId, sellerId, requesterRole) {
  // Admins can always see full names
  if (requesterRole === 'admin') {
    return true;
  }

  // Sellers can see full names for their own auctions
  if (requesterId === sellerId) {
    return true;
  }

  return false;
}

/**
 * Format bidder display name based on viewer permissions
 * @param {Object} bidder - Bidder info { id, firstName, lastName }
 * @param {string} viewerId - ID of viewing user
 * @param {string} viewerRole - Role of viewing user
 * @param {string} sellerId - ID of auction seller
 * @param {boolean} isCurrentUser - True if bidder is the current user
 * @returns {string} - Display name
 */
function formatBidderName(bidder, viewerId, viewerRole, sellerId, isCurrentUser = false) {
  // User always sees their own name
  if (isCurrentUser) {
    return 'You';
  }

  // Check if viewer has permission to see full names
  if (canSeeFullNames(viewerId, sellerId, viewerRole)) {
    return `${bidder.firstName} ${bidder.lastName}`.trim() || 'Bidder';
  }

  // Return obfuscated name
  return obfuscateName(bidder.firstName, bidder.lastName, bidder.id);
}

/**
 * Clear the bidder name cache (useful for testing or memory management)
 * @param {string} bidderId - Optional specific bidder ID to clear
 */
function clearCache(bidderId = null) {
  if (bidderId) {
    bidderNameCache.delete(bidderId);
  } else {
    bidderNameCache.clear();
  }
}

/**
 * Get cache statistics (for monitoring)
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  return {
    size: bidderNameCache.size,
    keys: Array.from(bidderNameCache.keys())
  };
}

module.exports = {
  obfuscateName,
  canSeeFullNames,
  formatBidderName,
  clearCache,
  getCacheStats
};
