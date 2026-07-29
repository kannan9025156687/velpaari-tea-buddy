/**
 * =============================================================
 * orderAdminService.js
 * -------------------------------------------------------------
 * THE dashboard/orders data provider interface (Phase 6 rule 4:
 * "all statistics must come through a dashboard data provider
 * interface"). Every number and every order shown anywhere in the
 * admin app is fetched through one of the three functions below —
 * never hardcoded, never read from storage.js directly by a page
 * or a module (rule 6).
 *
 * This is the ONLY file in admin/ that imports
 * shared/services/storage.js. It translates between the generic
 * collection-CRUD shape storage.js exposes and the order-domain
 * shape the rest of the admin app works with (composing
 * getDashboardStats() from getOrders() + dashboardStats.js's pure
 * computation, for example).
 *
 * NO BACKEND INTEGRATION EXISTS YET. storage.js currently has no
 * adapter registered (that happens in a later phase), so every
 * call below resolves to a clean STORAGE_UNAVAILABLE error via the
 * same envelope shape used everywhere else in this project
 * (docs/API_CONTRACT.md §1). Pages are expected to handle that
 * gracefully (skeletons → empty states / toasts) — see
 * dashboardPage.js, ordersPage.js, and orderDetailPage.js. Once a
 * real adapter is registered in a later phase, every function here
 * starts returning real data with ZERO changes to this file or to
 * any page that calls it.
 * =============================================================
 */

import * as storage from '/shared/services/storage.js';
import { COLLECTIONS } from '/config/constants.js';
import { computeDashboardStats } from '../modules/dashboardStats.js';

/**
 * Fetch orders matching the given filters/options.
 * @param {import('../modules/filters.js').OrderFilters} [filters]
 * @param {{sort?:string, limit?:number}} [options]
 * @returns {Promise<{success:boolean, data:Array|null, error:Object|null}>}
 */
export async function getOrders(filters = {}, options = {}) {
  return storage.query(COLLECTIONS.ORDERS, filters, options);
}

/**
 * Fetch a single order by its order ID.
 * @param {string} orderId
 * @returns {Promise<{success:boolean, data:Object|null, error:Object|null}>}
 */
export async function getOrderById(orderId) {
  return storage.read(COLLECTIONS.ORDERS, orderId);
}

/**
 * Fetch dashboard aggregate stats. Composed from getOrders() (data
 * access) + dashboardStats.computeDashboardStats() (pure business
 * logic) — pages call this ONE method rather than reimplementing
 * that composition themselves.
 * @returns {Promise<{success:boolean, data:import('../modules/dashboardStats.js').DashboardStats|null, error:Object|null}>}
 */
export async function getDashboardStats() {
  const ordersResult = await getOrders();
  if (!ordersResult.success) {
    return { success: false, data: null, error: ordersResult.error };
  }
  return { success: true, data: computeDashboardStats(ordersResult.data), error: null };
}

/**
 * Update an order's status.
 * @param {string} orderId
 * @param {string} status - one of config/constants.js's ORDER_STATUS values
 * @returns {Promise<{success:boolean, data:Object|null, error:Object|null}>}
 */
export async function updateOrderStatus(orderId, status) {
  return storage.update(COLLECTIONS.ORDERS, orderId, { status });
}
