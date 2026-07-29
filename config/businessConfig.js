/**
 * =============================================================
 * businessConfig.js
 * -------------------------------------------------------------
 * The single file a new business (or a menu/price change for
 * this one) needs to edit to reuse this platform, per
 * docs/ARCHITECTURE.md §3. No page, component, or service should
 * ever hardcode a price, item name, or business string outside
 * this file.
 *
 * This is business DATA, not business LOGIC — it describes what
 * is for sale and how it should be labeled/priced, but contains
 * no functions, no order processing, and no calculations.
 * =============================================================
 */

/**
 * @typedef {Object} MenuItem
 * @property {string} id       - stable identifier, used as the storage/DB key
 * @property {string} name     - customer-facing display name
 * @property {number} price    - price in the smallest whole currency unit (₹)
 * @property {number} [serves] - number of servings, if applicable (drinks only)
 * @property {string} emoji    - the item's icon, per docs/DESIGN_SYSTEM.md §7
 * @property {'drink'|'snack'} category
 */

export const BUSINESS_CONFIG = Object.freeze({
  /** @type {string} Public-facing business name */
  businessName: 'Velpaari Tea Buddy',

  /** @type {string} Brand tagline, shown on the welcome screen */
  tagline: 'Talk. Order. Enjoy.',

  /** @type {string} Logo icon shown on the welcome screen, per docs/DESIGN_SYSTEM.md §7 (emoji-first icon system) */
  logoEmoji: '☕',

  /** @type {string} Currency symbol used in all price displays */
  currency: '₹',

  /** @type {{min:number,max:number}} Default estimated preparation window, in minutes */
  estimatedPrepMinutes: Object.freeze({ min: 10, max: 15 }),

  /** @type {MenuItem[]} Primary drink menu */
  menu: Object.freeze([
    Object.freeze({ id: 'tea',          name: 'Tea Parcel',          price: 79, serves: 5, emoji: '☕', category: 'drink' }),
    Object.freeze({ id: 'coffee',       name: 'Coffee Parcel',       price: 99, serves: 5, emoji: '☕', category: 'drink' }),
    Object.freeze({ id: 'blacktea',     name: 'Black Tea Parcel',    price: 89, serves: 5, emoji: '🍵', category: 'drink' }),
    Object.freeze({ id: 'blackcoffee',  name: 'Black Coffee Parcel', price: 79, serves: 5, emoji: '🖤', category: 'drink' })
  ]),

  /** @type {MenuItem[]} Add-on / combo-suggestion snacks */
  addons: Object.freeze([
    Object.freeze({ id: 'biscuit', name: 'Biscuit', price: 10, emoji: '🍪', category: 'snack' }),
    Object.freeze({ id: 'rusk',    name: 'Rusk',    price: 10, emoji: '🥨', category: 'snack' }),
    Object.freeze({ id: 'mixture', name: 'Mixture', price: 30, emoji: '🥜', category: 'snack' }),
    Object.freeze({ id: 'murukku', name: 'Murukku', price: 10, emoji: '🥠', category: 'snack' })
  ]),

  /** @type {string} Shown wherever the service model needs stating (full menu card, etc.) */
  serviceNote: 'This is a Parcel-only service 📦 (No dine-in)'
});
