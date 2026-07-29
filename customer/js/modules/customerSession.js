/**
 * =============================================================
 * customerSession.js
 * -------------------------------------------------------------
 * The smallest possible piece of shared client-side state: the
 * name the customer typed on namePage, needed by chatPage for its
 * greeting. This is NOT persistence (nothing is written to
 * localStorage or any backend — it lives only in memory for the
 * current page load) and it is NOT business logic — it exists
 * purely so namePage.js and chatPage.js don't need to import each
 * other or reach into router internals to pass one string along.
 *
 * Per Phase 5's rules, customer pages must not access storage.js
 * or backend services directly — this module doesn't either; it
 * has no persistence of any kind.
 * =============================================================
 */

let customerName = '';

/**
 * @param {string} name
 */
export function setCustomerName(name) {
  customerName = (name || '').trim();
}

/**
 * @returns {string}
 */
export function getCustomerName() {
  return customerName;
}
