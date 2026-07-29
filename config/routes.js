/**
 * =============================================================
 * routes.js
 * -------------------------------------------------------------
 * Route path constants for both apps. Neither router.js (customer
 * or admin) hardcodes a path string — every path used anywhere in
 * either app is defined once, here.
 *
 * Page modules (Phase 5/6) will import these constants and call
 * router.register(ROUTE_CONSTANT, handler) — this file has no
 * knowledge of pages or handlers itself, only path strings.
 * =============================================================
 */

/**
 * Customer app route paths (hash-based, e.g. `#/welcome`).
 * @readonly
 * @enum {string}
 */
export const CUSTOMER_ROUTES = Object.freeze({
  WELCOME: '/welcome',
  NAME: '/name',
  CHAT: '/chat'
});

/**
 * The route the customer app lands on when no hash (or an
 * unrecognized hash) is present.
 * @type {string}
 */
export const CUSTOMER_DEFAULT_ROUTE = CUSTOMER_ROUTES.WELCOME;

/**
 * Admin app route paths. ORDER_DETAIL uses a `:id` dynamic
 * segment, which router.js's pattern matching resolves into a
 * route param (see customer/js/router.js and admin/js/router.js
 * for the matching implementation).
 * @readonly
 * @enum {string}
 */
export const ADMIN_ROUTES = Object.freeze({
  DASHBOARD: '/dashboard',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id'
});

/**
 * The route the admin app lands on when no hash (or an
 * unrecognized hash) is present.
 * @type {string}
 */
export const ADMIN_DEFAULT_ROUTE = ADMIN_ROUTES.DASHBOARD;
