/**
 * =============================================================
 * storage.js
 * -------------------------------------------------------------
 * The storage abstraction described in docs/ARCHITECTURE.md §4
 * and docs/API_CONTRACT.md §1. Business logic in customer/ and
 * admin/ (orderService.js, orderAdminService.js, etc.) calls ONLY
 * the five methods exported here — never localStorage, never
 * fetch, never an adapter directly.
 *
 * THIS FILE DOES NOT IMPLEMENT STORAGE ITSELF. It holds a
 * reference to a currently-active "adapter" object and delegates
 * every call to it. An adapter is any object implementing:
 *
 *   { create(collection, data), read(collection, id),
 *     update(collection, id, patch), query(collection, filters, options),
 *     remove(collection, id) }
 *
 * No concrete adapter (localStorageAdapter.js, appsScriptAdapter.js,
 * firebaseAdapter.js) exists yet as of this foundation phase — those
 * are built starting Phase 4/8/10 respectively, per the locked
 * build order. Until setAdapter() is called by that later
 * bootstrap code, every method below resolves to a clean
 * STORAGE_UNAVAILABLE error via the standard response envelope,
 * rather than throwing an unhandled exception or silently doing
 * nothing — calling code can rely on the envelope shape always
 * being present, exactly per docs/API_CONTRACT.md §1.
 * =============================================================
 */

import { ERROR_CODES } from '/config/constants.js';

/** @type {Object|null} the currently active storage adapter, if any */
let activeAdapter = null;

/**
 * Register the adapter that all storage.js calls should delegate
 * to. Called once during app bootstrap by later-phase code that
 * decides (based on config/appConfig.js's STORAGE_MODE) which
 * concrete adapter to instantiate.
 *
 * Using dependency injection here (rather than storage.js
 * importing a specific adapter file by name) keeps this file
 * completely decoupled from adapters that don't exist yet, and
 * from Apps Script/Firebase specifics it should never need to
 * know about.
 *
 * @param {Object} adapter - an object implementing the adapter interface described above
 */
export function setAdapter(adapter) {
  activeAdapter = adapter;
}

/**
 * Returns the currently active adapter, or null if none has been
 * registered yet. Exposed mainly for diagnostics/testing.
 * @returns {Object|null}
 */
export function getAdapter() {
  return activeAdapter;
}

/**
 * Build a successful response envelope.
 * @param {*} data
 * @returns {{success:true, data:*, error:null}}
 */
function ok(data) {
  return { success: true, data, error: null };
}

/**
 * Build a failed response envelope.
 * @param {string} code - one of ERROR_CODES
 * @param {string} message
 * @returns {{success:false, data:null, error:{code:string,message:string}}}
 */
function fail(code, message) {
  return { success: false, data: null, error: { code, message } };
}

/**
 * Guard used by every method below: confirms an adapter is
 * registered before attempting to delegate to it.
 * @returns {{success:false,data:null,error:Object}|null} an error envelope if unavailable, otherwise null
 */
function guardAdapter() {
  if (!activeAdapter) {
    return fail(
      ERROR_CODES.STORAGE_UNAVAILABLE,
      'No storage adapter has been registered yet. Call setAdapter() during app bootstrap before using storage.js.'
    );
  }
  return null;
}

/**
 * Wrap an adapter call so that any thrown/rejected error is
 * normalized into the standard envelope instead of propagating
 * as an unhandled promise rejection to calling UI code.
 * @param {() => Promise<*>} fn
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
async function safelyDelegate(fn) {
  try {
    return await fn();
  } catch (err) {
    return fail(
      ERROR_CODES.UNKNOWN_ERROR,
      err && err.message ? err.message : 'An unexpected storage error occurred.'
    );
  }
}

/**
 * Create a new record in the given collection.
 *
 * @param {string} collection - one of config/constants.js's COLLECTIONS values
 * @param {Object} data
 * @param {string} [id] - an explicit record id. Omit for adapter-generated ids
 *   (e.g. orders, where the adapter mints a sequential order ID). Pass one
 *   explicitly for singleton-style collections (e.g. COLLECTIONS.SESSION,
 *   COLLECTIONS.CART) that are always accessed by a fixed known id. This
 *   parameter was added in the localStorage-adapter phase; existing calls
 *   that omit it are unaffected.
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export async function create(collection, data, id) {
  const guardResult = guardAdapter();
  if (guardResult) return guardResult;
  return safelyDelegate(() => activeAdapter.create(collection, data, id));
}

/**
 * Read a single record by ID.
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export async function read(collection, id) {
  const guardResult = guardAdapter();
  if (guardResult) return guardResult;
  return safelyDelegate(() => activeAdapter.read(collection, id));
}

/**
 * Apply a partial update to a record by ID.
 * @param {string} collection
 * @param {string} id
 * @param {Object} patch
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export async function update(collection, id, patch) {
  const guardResult = guardAdapter();
  if (guardResult) return guardResult;
  return safelyDelegate(() => activeAdapter.update(collection, id, patch));
}

/**
 * Query records matching filters. See docs/API_CONTRACT.md §3 for
 * the standard filter/option shapes every adapter must support.
 * @param {string} collection
 * @param {Object} [filters]
 * @param {Object} [options]
 * @returns {Promise<{success:boolean,data:Array,error:Object|null}>}
 */
export async function query(collection, filters = {}, options = {}) {
  const guardResult = guardAdapter();
  if (guardResult) return guardResult;
  return safelyDelegate(() => activeAdapter.query(collection, filters, options));
}

/**
 * Remove a record by ID.
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export async function remove(collection, id) {
  const guardResult = guardAdapter();
  if (guardResult) return guardResult;
  return safelyDelegate(() => activeAdapter.remove(collection, id));
}
