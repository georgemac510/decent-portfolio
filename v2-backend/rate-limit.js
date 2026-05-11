// In-memory rate limiter. Keys are per-IP, per-endpoint-category.
// Sliding window: tracks request timestamps and rejects when count exceeds
// the limit within the window. Cleans up old buckets periodically.
//
// Trusts Cloudflare's `cf-connecting-ip` header (and falls back to
// `x-forwarded-for` and `req.ip`) so we rate-limit by real client IP, not
// by Cloudflare's tunnel address.

const buckets = new Map(); // key -> array of timestamps

// Periodic cleanup so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const filtered = timestamps.filter((t) => now - t < 5 * 60 * 1000);
    if (filtered.length === 0) buckets.delete(key);
    else buckets.set(key, filtered);
  }
}, 60_000).unref();

function getClientIp(req) {
  // Cloudflare sets this on tunnel-routed requests.
  return (
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    'unknown'
  );
}

/**
 * Creates a rate-limit middleware.
 *
 * @param {object} opts
 * @param {string} opts.category - bucket name (e.g., 'prices', 'writes', 'default')
 * @param {number} opts.windowMs - window length in ms
 * @param {number} opts.max     - max requests in window
 */
export function rateLimit({ category, windowMs, max }) {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const key = `${category}:${ip}`;
    const now = Date.now();

    const timestamps = (buckets.get(key) || []).filter(
      (t) => now - t < windowMs
    );
    if (timestamps.length >= max) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'rate limit exceeded',
        retryAfter,
      });
    }
    timestamps.push(now);
    buckets.set(key, timestamps);
    next();
  };
}
