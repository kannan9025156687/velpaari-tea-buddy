/**
 * =============================================================
 * sessionCartService.js
 * -------------------------------------------------------------
 * The customer app's persistence door for session + cart data
 * (order persistence itself is a later phase's concern, once
 * checkout is un-stubbed — see chatEngine.js's header comment).
 * This is the ONLY customer-side file that imports
 * shared/services/storage.js for these two concerns — main.js and
 * chatPage.js call these functions, never storage.js directly,
 * matching the rule established in Phase 5 ("customer pages must
 * not access storage.js or backend services directly") and
 * extended here to the composition root as well.
 *
 * Both collections are "singleton" records — always read/written
 * at the fixed id 'current', since there is exactly one active
 * session and one active cart per browser. localStorageAdapter.js's
 * update() upserts, so saveX() below works whether or not a record
 * already exists yet.
 * =============================================================
 */

import * as storage from '/shared/services/storage.js';
import { COLLECTIONS } from '/config/constants.js';

const SESSION_RECORD_ID = 'current';
const CART_RECORD_ID = 'current';

/**
 * Persist the customer's name.
 * @param {string} name
 * @returns {Promise<{success:boolean, data:*, error:Object|null}>}
 */
export async function saveCustomerSession(name) {
  return storage.update(COLLECTIONS.SESSION, SESSION_RECORD_ID, { customerName: name });
}

/**
 * Load the previously-saved customer name, if any.
 * @returns {Promise<string>} the saved name, or '' if none is stored (or storage is unavailable)
 */
export async function loadCustomerSession() {
  const result = await storage.read(COLLECTIONS.SESSION, SESSION_RECORD_ID);
  if (result.success && result.data && typeof result.data.customerName === 'string') {
    return result.data.customerName;
  }
  return '';
}

/**
 * Persist the cart's current contents.
 * @param {Array<{id:string, qty:number}>} items - minimal shape only (id + qty);
 *   price/name/emoji are deliberately NOT stored here, since those come from
 *   config/businessConfig.js and should always be resolved fresh (a price
 *   change shouldn't require a data migration for saved carts).
 * @returns {Promise<{success:boolean, data:*, error:Object|null}>}
 */
export async function saveCartItems(items) {
  const minimalItems = (items || []).map((item) => ({ id: item.id, qty: item.qty }));
  return storage.update(COLLECTIONS.CART, CART_RECORD_ID, { items: minimalItems });
}

/**
 * Load the previously-saved cart contents, if any.
 * @returns {Promise<Array<{id:string, qty:number}>>} an array, empty if nothing is stored
 */
export async function loadCartItems() {
  const result = await storage.read(COLLECTIONS.CART, CART_RECORD_ID);
  if (result.success && result.data && Array.isArray(result.data.items)) {
    return result.data.items;
  }
  return [];
}

/**
 * Clear the persisted cart (e.g. once a real "start new order" flow
 * exists in a later phase).
 * @returns {Promise<{success:boolean, data:*, error:Object|null}>}
 */
export async function clearCartItems() {
  return storage.update(COLLECTIONS.CART, CART_RECORD_ID, { items: [] });
}
