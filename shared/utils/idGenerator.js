/**
 * =============================================================
 * idGenerator.js
 * -------------------------------------------------------------
 * Generic identifier-generation utilities. Contains no business
 * rule about what an order ID "means" — callers supply a prefix
 * and a sequence number; this module only handles the formatting
 * and the underlying random/unique-ID generation.
 *
 * Per docs/ARCHITECTURE.md §4, the localStorage adapter (Phase 4+)
 * will use generateSequentialId() the same way the eventual
 * backend does (see docs/SHEET_SCHEMA.md's OrderCounters sheet),
 * so mock and real order IDs are shaped identically.
 * =============================================================
 */

import { toCompactDateString } from '/shared/utils/dateUtils.js';

/**
 * Generate a RFC-4122-ish unique identifier. Uses the native
 * crypto.randomUUID() where available (all modern evergreen
 * browsers), falling back to a Math.random-based generator for
 * older environments — the fallback is not cryptographically
 * strong, which is acceptable since this is used only for
 * non-sensitive client-side identifiers, never security tokens.
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Build a human-readable sequential identifier in the form
 * `${prefix}-${YYYYMMDD}-${paddedSequence}`, e.g. "TB-20260725-0001".
 *
 * This function does not decide what the sequence number IS — it
 * only formats one supplied by the caller (e.g. a per-day counter
 * kept by an adapter). Keeping the increment logic outside this
 * function is what lets both the mock localStorage adapter and the
 * eventual Apps Script backend share the exact same ID shape while
 * each owning its own counter storage.
 *
 * @param {Object} options
 * @param {string} options.prefix - short business/app prefix, e.g. "TB"
 * @param {number} options.sequence - the sequence number for this date (1-based)
 * @param {Date} [options.date=new Date()] - date to stamp the ID with
 * @param {number} [options.padLength=4] - zero-padding width for the sequence
 * @returns {string}
 */
export function generateSequentialId({ prefix, sequence, date = new Date(), padLength = 4 }) {
  const dateStamp = toCompactDateString(date);
  const paddedSequence = String(sequence).padStart(padLength, '0');
  return `${prefix}-${dateStamp}-${paddedSequence}`;
}
