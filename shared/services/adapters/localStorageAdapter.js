/**
 * =============================================================
 * localStorageAdapter.js
 * -------------------------------------------------------------
 * The first real storage adapter. Implements the exact interface
 * shared/services/storage.js expects from any adapter — create,
 * read, update, query, remove — backed by the browser's
 * localStorage. Nothing outside shared/services/storage.js and
 * this file ever touches `window.localStorage` directly (see
 * docs/DESIGN rule: "no page or module may access localStorage
 * directly" — enforced by convention + the static audit in
 * verify_phase8_localstorage.py, not by a runtime lock).
 *
 * STORAGE SHAPE
 * ------------------------------------------------------------
 * One localStorage key per collection: `teabuddy_store_<collection>`,
 * holding:
 *   { version: <schema version>, records: { [id]: <record> } }
 *
 * Versioning (rule 6): every stored blob carries the schema
 * version it was written with (config/constants.js's
 * STORAGE_SCHEMA_VERSION). migrateStore() is the single place a
 * future version bump adds a migration step — none exist yet
 * because this is the first schema version, but the seam is here
 * on purpose rather than being retrofitted later.
 *
 * CORRUPTION SAFETY (rule 7): every read of localStorage is
 * wrapped in try/catch. Anything unparseable, or parseable but not
 * shaped like `{ version, records:{} }`, is treated as corrupted:
 * logged with console.warn and replaced with a fresh empty store
 * — the app never crashes because of bad localStorage content, and
 * a corrupted collection degrades to "empty," not to a thrown
 * error.
 *
 * FUTURE-ADAPTER COMPATIBILITY (rule 8): the exported shape below
 * — an object with async create/read/update/query/remove methods,
 * each returning the same {success,data,error} envelope as every
 * other adapter — is exactly what appsScriptAdapter.js and
 * firebaseAdapter.js (built in later phases) will also implement.
 * storage.js never needs to change to support them. The one
 * adapter-specific behavior documented here — update() upserts
 * (creates the record if it doesn't exist) — is a convention
 * future adapters should also follow, since sessionCartService.js
 * already relies on it for the singleton session/cart records.
 * =============================================================
 */

import { COLLECTIONS, STORAGE_SCHEMA_VERSION, ERROR_CODES, STORAGE_KEYS } from '/config/constants.js';
import { generateUUID, generateSequentialId } from '/shared/utils/idGenerator.js';
import { toCompactDateString } from '/shared/utils/dateUtils.js';

const KEY_PREFIX = 'teabuddy_store_';
const ORDER_ID_PREFIX = 'TB';

/**
 * Build the localStorage key for a given collection.
 * @param {string} collection
 * @returns {string}
 */
function storeKey(collection) {
  return `${KEY_PREFIX}${collection}`;
}

/** @returns {{success:true,data:*,error:null}} */
function ok(data) {
  return { success: true, data, error: null };
}

/** @returns {{success:false,data:null,error:{code:string,message:string}}} */
function fail(code, message) {
  return { success: false, data: null, error: { code, message } };
}

/**
 * Defensive availability check — some environments (private
 * browsing in certain older browsers, storage quota exceeded,
 * embedded webviews with storage disabled) throw on any
 * localStorage access at all. Checked once per call rather than
 * cached, since availability can change mid-session (e.g. quota
 * fills up).
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    const testKey = '__teabuddy_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Migration hook. No-op today (schema version 1 is the only one
 * that has ever existed) — this is where a future version bump
 * would transform an older `{version, records}` shape into the
 * current one before the adapter uses it.
 * @param {{version:number, records:Object}} store
 * @returns {{version:number, records:Object}}
 */
function migrateStore(store) {
  if (store.version === STORAGE_SCHEMA_VERSION) return store;
  // Future migrations would branch on store.version here, e.g.:
  //   if (store.version === 1) { store = migrateV1ToV2(store); }
  console.warn(`[localStorageAdapter] Store version ${store.version} has no migration path to ${STORAGE_SCHEMA_VERSION} yet — using as-is.`);
  return { ...store, version: STORAGE_SCHEMA_VERSION };
}

/**
 * Read a collection's store, safely. Corrupted/malformed data is
 * logged and replaced with a fresh empty store rather than thrown.
 * @param {string} collection
 * @returns {{version:number, records:Object<string,Object>}}
 */
function readStore(collection) {
  const key = storeKey(collection);
  const fresh = { version: STORAGE_SCHEMA_VERSION, records: {} };

  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`[localStorageAdapter] Could not read "${key}" — treating as empty. (${err.message})`);
    return fresh;
  }

  if (!raw) return fresh;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`[localStorageAdapter] Corrupted JSON for "${key}" — resetting to empty. (${err.message})`);
    writeStore(collection, fresh);
    return fresh;
  }

  if (!parsed || typeof parsed !== 'object' || typeof parsed.records !== 'object' || parsed.records === null) {
    console.warn(`[localStorageAdapter] Malformed store shape for "${key}" — resetting to empty.`);
    writeStore(collection, fresh);
    return fresh;
  }

  return migrateStore({ version: typeof parsed.version === 'number' ? parsed.version : 0, records: parsed.records });
}

/**
 * Write a collection's store. Failures (quota exceeded, storage
 * disabled) are logged, not thrown.
 * @param {string} collection
 * @param {{version:number, records:Object}} store
 * @returns {boolean} whether the write succeeded
 */
function writeStore(collection, store) {
  try {
    window.localStorage.setItem(storeKey(collection), JSON.stringify(store));
    return true;
  } catch (err) {
    console.error(`[localStorageAdapter] Failed to write collection "${collection}": ${err.message}`);
    return false;
  }
}

/**
 * Generate the next sequential order ID (TB-YYYYMMDD-0001), using
 * a small counter also kept in localStorage under
 * STORAGE_KEYS.ORDER_SEQUENCE. Resets automatically on a new day.
 * Corrupted counter data is treated the same as "no counter yet."
 * @returns {string}
 */
function generateOrderId() {
  const dateStr = toCompactDateString(new Date());
  let counter = null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ORDER_SEQUENCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.seq === 'number' && typeof parsed.date === 'string') {
        counter = parsed;
      }
    }
  } catch (err) {
    counter = null; // corrupted counter — fall through to a fresh one
  }

  if (!counter || counter.date !== dateStr) {
    counter = { date: dateStr, seq: 0 };
  }
  counter.seq += 1;

  try {
    window.localStorage.setItem(STORAGE_KEYS.ORDER_SEQUENCE, JSON.stringify(counter));
  } catch (err) {
    console.error(`[localStorageAdapter] Failed to persist order-id counter: ${err.message}`);
  }

  return generateSequentialId({ prefix: ORDER_ID_PREFIX, sequence: counter.seq, date: new Date(), padLength: 4 });
}

/**
 * Pick an id-generation strategy appropriate to the collection.
 * Orders get the human-readable sequential TB-... format; every
 * other collection gets a UUID (session/cart don't actually use
 * this path in practice — sessionCartService.js always passes an
 * explicit 'current' id — but it's here so create() never fails
 * to produce SOME id for a collection this adapter doesn't know
 * about yet).
 * @param {string} collection
 * @returns {string}
 */
function generateIdFor(collection) {
  return collection === COLLECTIONS.ORDERS ? generateOrderId() : generateUUID();
}

/**
 * @param {string} collection
 * @param {Object} data
 * @param {string} [id]
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
async function create(collection, data, id) {
  if (!isLocalStorageAvailable()) {
    return fail(ERROR_CODES.STORAGE_UNAVAILABLE, 'localStorage is not available in this browser/context.');
  }

  const store = readStore(collection);
  const recordId = id || generateIdFor(collection);
  const now = new Date().toISOString();

  const record = collection === COLLECTIONS.ORDERS
    ? { ...data, orderId: recordId, createdAt: data.createdAt || now }
    : { ...data };

  store.records[recordId] = record;
  writeStore(collection, store);

  return ok(record);
}

/**
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
async function read(collection, id) {
  if (!isLocalStorageAvailable()) {
    return fail(ERROR_CODES.STORAGE_UNAVAILABLE, 'localStorage is not available in this browser/context.');
  }

  const store = readStore(collection);
  const record = store.records[id];
  if (!record) {
    return fail(ERROR_CODES.NOT_FOUND, `No record "${id}" in collection "${collection}".`);
  }
  return ok(record);
}

/**
 * Update a record. UPSERTS: if `id` doesn't exist yet, it is
 * created with `patch` as its full contents. This is what lets
 * sessionCartService.js call update(SESSION,'current',{...}) /
 * update(CART,'current',{...}) without a separate "does it exist
 * yet" check — the very first save just creates the singleton
 * record. Future adapters (Apps Script, Firebase) should implement
 * the same upsert behavior for consistency (rule 8).
 * @param {string} collection
 * @param {string} id
 * @param {Object} patch
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
async function update(collection, id, patch) {
  if (!isLocalStorageAvailable()) {
    return fail(ERROR_CODES.STORAGE_UNAVAILABLE, 'localStorage is not available in this browser/context.');
  }

  const store = readStore(collection);
  const existing = store.records[id];
  const now = new Date().toISOString();

  const nextRecord = existing
    ? { ...existing, ...patch, updatedAt: now }
    : { ...patch, ...(collection === COLLECTIONS.ORDERS ? { orderId: id, createdAt: now } : {}) };

  store.records[id] = nextRecord;
  writeStore(collection, store);

  return ok(nextRecord);
}

/**
 * Query records matching filters, per docs/API_CONTRACT.md §3's
 * standard filter/option shapes.
 * @param {string} collection
 * @param {Object} [filters]
 * @param {Object} [options]
 * @returns {Promise<{success:boolean,data:Array,error:Object|null}>}
 */
async function query(collection, filters = {}, options = {}) {
  if (!isLocalStorageAvailable()) {
    return fail(ERROR_CODES.STORAGE_UNAVAILABLE, 'localStorage is not available in this browser/context.');
  }

  const store = readStore(collection);
  let list = Object.values(store.records);

  if (filters.status) {
    list = list.filter((record) => record.status === filters.status);
  }
  if (filters.search) {
    const query = String(filters.search).toLowerCase();
    list = list.filter((record) =>
      (record.orderId || '').toLowerCase().includes(query) ||
      (record.customer || '').toLowerCase().includes(query)
    );
  }
  if (filters.dateFrom) {
    const fromTime = new Date(filters.dateFrom).getTime();
    list = list.filter((record) => record.createdAt && new Date(record.createdAt).getTime() >= fromTime);
  }
  if (filters.dateTo) {
    const toTime = new Date(filters.dateTo).getTime();
    list = list.filter((record) => record.createdAt && new Date(record.createdAt).getTime() <= toTime);
  }

  if (options.sort === 'createdAt_desc') {
    list = list.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } else if (options.sort === 'createdAt_asc') {
    list = list.slice().sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  if (typeof options.limit === 'number' && options.limit >= 0) {
    list = list.slice(0, options.limit);
  }

  return ok(list);
}

/**
 * @param {string} collection
 * @param {string} id
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
async function remove(collection, id) {
  if (!isLocalStorageAvailable()) {
    return fail(ERROR_CODES.STORAGE_UNAVAILABLE, 'localStorage is not available in this browser/context.');
  }

  const store = readStore(collection);
  if (!(id in store.records)) {
    return fail(ERROR_CODES.NOT_FOUND, `No record "${id}" in collection "${collection}".`);
  }
  delete store.records[id];
  writeStore(collection, store);

  return ok(null);
}

/**
 * The adapter object registered with shared/services/storage.js
 * via setAdapter(). Matches the interface documented at the top
 * of storage.js exactly.
 */
export const localStorageAdapter = { create, read, update, query, remove };
