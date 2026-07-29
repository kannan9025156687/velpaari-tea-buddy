/**
 * =============================================================
 * filters.js
 * -------------------------------------------------------------
 * Pure filtering logic over an already-fetched orders array. No
 * DOM, no fetching — ordersPage.js fetches once (or per broad
 * filter change) and calls filterOrders() on every keystroke/
 * filter-chip tap for instant, no-refetch refinement.
 *
 * Filter shape matches docs/API_CONTRACT.md §3, so the same
 * filter object could equally be handed to
 * shared/services/storage.js's query() once a real adapter exists
 * — this module and server-side filtering are not in conflict,
 * just two layers of the same contract.
 * =============================================================
 */

/**
 * @typedef {Object} OrderFilters
 * @property {string|null} [status] - exact ORDER_STATUS match, or null/undefined for "all"
 * @property {string} [search] - matches order id or customer name, case-insensitive
 * @property {string} [dateFrom] - ISO date string, inclusive
 * @property {string} [dateTo] - ISO date string, inclusive
 */

/**
 * @param {Array<Object>} orders
 * @param {OrderFilters} [filters]
 * @returns {Array<Object>}
 */
export function filterOrders(orders, filters = {}) {
  const { status, search, dateFrom, dateTo } = filters;
  let result = Array.isArray(orders) ? orders.slice() : [];

  if (status) {
    result = result.filter((order) => order.status === status);
  }

  if (search && search.trim()) {
    const query = search.trim().toLowerCase();
    result = result.filter((order) =>
      (order.orderId || '').toLowerCase().includes(query) ||
      (order.customer || '').toLowerCase().includes(query)
    );
  }

  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    result = result.filter((order) => order.createdAt && new Date(order.createdAt).getTime() >= fromTime);
  }

  if (dateTo) {
    const toTime = new Date(dateTo).getTime();
    result = result.filter((order) => order.createdAt && new Date(order.createdAt).getTime() <= toTime);
  }

  return result;
}
