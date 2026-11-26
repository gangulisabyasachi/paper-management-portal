// 🤖 Edge-Compatible Bot Detection
// This file has NO dependencies to ensure it runs fast in Next.js Middleware.
//
// IMPORTANT: Legitimate search engine crawlers (Googlebot, Bingbot, etc.) must
// NEVER be blocked — doing so causes 403 errors in Google Search Console and
// prevents the sitemap from being indexed.

/** Legitimate search engine crawlers — always allow through */
const SEARCH_ENGINE_CRAWLERS = [
  'googlebot',
  'adsbot-google',
  'apis-google',
  'google-inspectiontool',
  'bingbot',
  'slurp',           // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'yandex',
  'ia_archiver',     // Wayback Machine
  'archive.org_bot',
  'facebookexternalhit',
  'linkedinbot',
  'twitterbot',
  'whatsapp',
  'telegrambot',
];

/** Malicious scrapers / SEO harvesters — block these */
const MALICIOUS_BOTS = [
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'blexbot',
  'petalbot',
  'bytespider',
  'gptbot',
  'ccbot',
  'claudebot',
  'anthropic-ai',
];

/**
 * Returns true only for MALICIOUS bots that should be blocked.
 * Legitimate search engine crawlers always return false (i.e., not blocked).
 */
export function isRobot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();

  // Always allow legitimate search engines, even if they match a generic pattern
  if (SEARCH_ENGINE_CRAWLERS.some((kw) => ua.includes(kw))) return false;

  // Block known malicious scrapers
  return MALICIOUS_BOTS.some((kw) => ua.includes(kw));
}
