/**
 * =============================================================
 * cart.js
 * -------------------------------------------------------------
 * Pure cart state module. No DOM access, no chat flow knowledge,
 * no storage/backend access — this is the "model" layer the
 * chat page renders and reacts to, per the separation required
 * for Phase 5:
 *   - presentation (pages) never computes totals or mutates cart
 *     state directly; it calls this module's methods
 *   - business/data rules about pricing come only from
 *     config/businessConfig.js, never hardcoded here or in a page
 *
 * Built as a factory (createCart()) rather than a singleton so
 * a test can create a fresh, isolated cart instance with no DOM
 * and no other module involved — e.g.:
 *
 *   const cart = createCart();
 *   cart.addItem('tea', 2);
 *   assert(cart.getSnapshot().total === 158);
 * =============================================================
 */

import { BUSINESS_CONFIG } from '/config/businessConfig.js';

/** @type {Object<string, Object>} fast id → item lookup, built once from menu + addons */
const ITEM_MAP = Object.freeze(
  [...BUSINESS_CONFIG.menu, ...BUSINESS_CONFIG.addons].reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

/**
 * Look up a menu/addon item's full definition (name, price, emoji,
 * category, etc.) by id. Returns null for an unknown id.
 * @param {string} id
 * @returns {Object|null}
 */
export function getMenuItem(id) {
  return ITEM_MAP[id] || null;
}

/**
 * @typedef {Object} CartSnapshot
 * @property {Array<{id:string, qty:number, name:string, price:number, emoji:string, category:string}>} items
 * @property {number} count - total quantity across all items
 * @property {number} total - total price in ₹ (or businessConfig.currency's unit)
 */

/**
 * Create a new, independent cart instance.
 * @returns {{
 *   addItem: (id:string, qty?:number) => void,
 *   updateQty: (id:string, qty:number) => void,
 *   removeItem: (id:string) => void,
 *   clear: () => void,
 *   has: (id:string) => boolean,
 *   subscribe: (listener:(snapshot:CartSnapshot)=>void) => (() => void),
 *   getSnapshot: () => CartSnapshot
 * }}
 */
export function createCart() {
  /** @type {{id:string, qty:number}[]} */
  let items = [];

  /** @type {Set<(snapshot:CartSnapshot)=>void>} */
  const listeners = new Set();

  /** @returns {CartSnapshot} */
  function getSnapshot() {
    const resolved = items
      .map((entry) => {
        const item = getMenuItem(entry.id);
        return item ? { id: entry.id, qty: entry.qty, ...item } : null;
      })
      .filter(Boolean);

    return {
      items: resolved,
      count: resolved.reduce((sum, item) => sum + item.qty, 0),
      total: resolved.reduce((sum, item) => sum + item.qty * item.price, 0)
    };
  }

  function notify() {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  }

  /**
   * Add a quantity of an item to the cart. Unknown item ids or
   * non-positive quantities are silently ignored (defensive —
   * callers are expected to only pass ids that exist in
   * businessConfig.js).
   * @param {string} id
   * @param {number} [qty=1]
   */
  function addItem(id, qty = 1) {
    if (!getMenuItem(id) || !Number.isFinite(qty) || qty <= 0) return;
    const existing = items.find((entry) => entry.id === id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id, qty });
    }
    notify();
  }

  /**
   * Set an item's quantity directly (e.g. from a +/- stepper).
   * A qty of 0 or less removes the item.
   * @param {string} id
   * @param {number} qty
   */
  function updateQty(id, qty) {
    if (!Number.isFinite(qty) || qty <= 0) {
      removeItem(id);
      return;
    }
    const existing = items.find((entry) => entry.id === id);
    if (existing) {
      existing.qty = qty;
      notify();
    }
  }

  /**
   * Remove an item entirely, regardless of its quantity.
   * @param {string} id
   */
  function removeItem(id) {
    const before = items.length;
    items = items.filter((entry) => entry.id !== id);
    if (items.length !== before) notify();
  }

  /** Empty the cart completely (e.g. after starting a new order). */
  function clear() {
    if (items.length === 0) return;
    items = [];
    notify();
  }

  /**
   * @param {string} id
   * @returns {boolean} whether the item is currently in the cart
   */
  function has(id) {
    return items.some((entry) => entry.id === id);
  }

  /**
   * Subscribe to cart changes. The listener is called immediately
   * with the current snapshot, then again on every change.
   * @param {(snapshot:CartSnapshot) => void} listener
   * @returns {() => void} unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    listener(getSnapshot());
    return () => listeners.delete(listener);
  }

  return { addItem, updateQty, removeItem, clear, has, subscribe, getSnapshot };
}
