// Simple in-memory cache for invite data
// This stores the invite temporarily when opened via deep link
// so Welcome screen can display it immediately

let inviteCache = null;

/**
 * Store invite in cache
 * @param {Object} invite - The invite data
 */
export function setInviteCache(invite) {
  console.log('💾 Storing invite in cache:', invite?.id);
  inviteCache = invite;
}

/**
 * Get invite from cache
 * @returns {Object|null} - The cached invite or null
 */
export function getInviteCache() {
  console.log('📦 Getting invite from cache:', inviteCache?.id || 'empty');
  return inviteCache;
}

/**
 * Clear invite cache
 */
export function clearInviteCache() {
  console.log('🗑️ Clearing invite cache');
  inviteCache = null;
}

/**
 * Check if there's a cached invite
 * @returns {boolean}
 */
export function hasInviteCache() {
  return inviteCache !== null;
}

