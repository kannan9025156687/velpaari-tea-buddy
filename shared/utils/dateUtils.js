/**
 * =============================================================
 * dateUtils.js
 * -------------------------------------------------------------
 * Pure date/time formatting helpers, used by both apps (chat
 * bubble timestamps, admin order timestamps, order-ID date
 * stamps). No business logic — nothing here knows what an
 * "order" is.
 * =============================================================
 */

/**
 * Return a Date as a compact "YYYYMMDD" string, used e.g. for
 * daily order-ID sequencing and daily storage-counter keys.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function toCompactDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Return a Date as an ISO-8601 "YYYY-MM-DD" string.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function toISODateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date as a friendly 12-hour time string, e.g. "9:41 AM".
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

/**
 * Format a Date as a friendly date string, e.g. "25 Jul 2026".
 * @param {Date} [date=new Date()]
 * @param {string} [locale='en-IN']
 * @returns {string}
 */
export function formatDate(date = new Date(), locale = 'en-IN') {
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format a Date as a combined date + time string, e.g.
 * "25 Jul 2026, 9:41 AM".
 * @param {Date} [date=new Date()]
 * @param {string} [locale='en-IN']
 * @returns {string}
 */
export function formatDateTime(date = new Date(), locale = 'en-IN') {
  return `${formatDate(date, locale)}, ${formatTime(date)}`;
}

/**
 * Human-friendly relative time string for a past Date, e.g.
 * "Just now", "2 min ago", "3 hr ago", "Yesterday", or a plain
 * date once it's more than a week old. Used by the admin order
 * card's timestamp footer (docs/DESIGN_SYSTEM.md §12).
 *
 * @param {Date} date
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function getRelativeTime(date, now = new Date()) {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec} sec ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(date);
}
