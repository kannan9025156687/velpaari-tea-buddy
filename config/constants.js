/**
 * =============================================================
 * constants.js
 * -------------------------------------------------------------
 * Shared, environment-independent constant values used across
 * customer/, admin/, and shared/. Nothing in this file changes
 * between environments (dev/prod) or between businesses reusing
 * this platform — for those, see appConfig.js and
 * businessConfig.js respectively.
 *
 * This file defines vocabulary, not behavior:
 *   - the exact strings a valid order status can be
 *   - the exact strings storage.js's collections are named
 *   - the exact error codes the storage/API envelope can return
 *   - the exact localStorage keys any adapter/module may use
 *
 * These values are referenced by docs/API_CONTRACT.md and
 * docs/SHEET_SCHEMA.md — if a value here changes, those documents
 * must be updated first (per the locked-architecture contract).
 * =============================================================
 */

/**
 * The full lifecycle of an order, in order.
 * NEW → PREPARING → READY → COMPLETED
 * No other string is a valid order status anywhere in this app.
 * @readonly
 * @enum {string}
 */
export const ORDER_STATUS = Object.freeze({
  NEW: 'NEW',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED'
});

/**
 * Ordered list of statuses, useful for "what's the next status"
 * logic (e.g. the admin order card's single next-action button).
 * @readonly
 * @type {string[]}
 */
export const ORDER_STATUS_SEQUENCE = Object.freeze([
  ORDER_STATUS.NEW,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.COMPLETED
]);

/**
 * The three storage backends shared/services/storage.js can be
 * configured to use. See appConfig.js's STORAGE_MODE, which must
 * be one of these values.
 * @readonly
 * @enum {string}
 */
export const STORAGE_MODES = Object.freeze({
  LOCAL: 'localStorage',
  APPS_SCRIPT: 'appsScript',
  FIREBASE: 'firebase'
});

/**
 * Named "collections" storage.js operates on.
 * @readonly
 * @enum {string}
 */
export const COLLECTIONS = Object.freeze({
  ORDERS: 'orders',
  /** Singleton-style: always accessed via a fixed record id ('current'). */
  SESSION: 'session',
  /** Singleton-style: always accessed via a fixed record id ('current'). */
  CART: 'cart'
});

/**
 * The schema version written into every stored collection blob, so
 * a future adapter (or a future version of localStorageAdapter.js)
 * can detect and migrate older data instead of guessing its shape.
 * Bump this — and add a migration step in the adapter — whenever a
 * stored record's shape changes in a breaking way.
 * @readonly
 * @type {number}
 */
export const STORAGE_SCHEMA_VERSION = 1;

/**
 * Standard error codes returned inside the storage/API response
 * envelope: { success, data, error: { code, message } }.
 * Defined in full in docs/API_CONTRACT.md §1.
 * @readonly
 * @enum {string}
 */
export const ERROR_CODES = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
});

/**
 * localStorage key names. Centralized here so no two modules
 * ever accidentally pick different key names for the same data.
 * @readonly
 * @enum {string}
 */
export const STORAGE_KEYS = Object.freeze({
  THEME: 'teabuddy_theme',
  ORDERS: 'teabuddy_orders',
  ORDER_SEQUENCE: 'teabuddy_order_seq'
});
