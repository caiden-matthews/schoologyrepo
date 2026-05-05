// netlify/functions/_oauth.js
// Shared OAuth helpers for token processing and user identification

const crypto = require('crypto');

/**
 * Extract a deterministic user_id from a Schoology OAuth access token.
 *
 * OAuth tokens serve as the user identifier for custom events in Supabase.
 * We hash the token using SHA256 to create a deterministic user_id that:
 * - Is unique per user (same token → same hash every time)
 * - Never exposes the raw token in database logs or errors
 * - Can be queried consistently across sessions/browsers
 *
 * @param {string} accessToken - Schoology OAuth access token
 * @returns {string} - Deterministic user_id hash (SHA256, truncated to 32 chars)
 */
function extractUserId(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Invalid access token: must be a non-empty string');
  }
  const hash = crypto.createHash('sha256').update(accessToken).digest('hex');
  // Truncate to 32 chars for brevity in logs/UI
  return hash.substring(0, 32);
}

module.exports = {
  extractUserId,
};
