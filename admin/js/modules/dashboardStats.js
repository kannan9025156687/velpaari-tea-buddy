/**
 * =============================================================
 * dashboardStats.js
 * -------------------------------------------------------------
 * Pure business logic for the dashboard: turning a raw orders
 * array into aggregate numbers, and — critically — the WIDGET
 * REGISTRY that makes the dashboard configurable rather than a
 * fixed layout (Phase 6 rules 1 and 3).
 *
 * dashboardPage.js never hardcodes "4 stat cards" — it loops over
 * DASHBOARD_WIDGETS and calls each widget's formatValue(stats).
 * Adding, removing, or reordering a widget is a change to the
 * array below, with ZERO changes to dashboardPage.js or
 * statWidget.js (the generic rendering component). That is what
 * "supports adding/removing widgets without changing the page
 * architecture" means concretely in this codebase.
 *
 * No DOM access here — statWidget.js (also in this folder) is the
 * separate presentation component that turns a widget definition
 * + a value into an actual DOM element.
 * =============================================================
 */

import { ORDER_STATUS } from '/config/constants.js';
import { formatCurrency } from '/shared/utils/formatCurrency.js';
import { BUSINESS_CONFIG } from '/config/businessConfig.js';

/**
 * @typedef {Object} DashboardStats
 * @property {number} ordersCount
 * @property {number} revenue
 * @property {number} pending
 * @property {number} completed
 */

/**
 * Compute dashboard aggregate stats from a raw orders array. Pure
 * function — no fetching, no DOM. The caller (orderAdminService.js)
 * is responsible for supplying the orders; this module only knows
 * how to turn them into numbers.
 *
 * @param {Array<{total:number, status:string}>} orders
 * @returns {DashboardStats}
 */
export function computeDashboardStats(orders) {
  const list = Array.isArray(orders) ? orders : [];

  return {
    ordersCount: list.length,
    revenue: list.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    pending: list.filter((order) => order.status === ORDER_STATUS.NEW || order.status === ORDER_STATUS.PREPARING).length,
    completed: list.filter((order) => order.status === ORDER_STATUS.COMPLETED).length
  };
}

/**
 * @typedef {Object} DashboardWidgetDef
 * @property {string} id - stable identifier
 * @property {string} label
 * @property {string} icon - single emoji, per docs/DESIGN_SYSTEM.md §7
 * @property {(stats:DashboardStats) => string} formatValue
 */

/**
 * The dashboard's widget registry. This is the "configurable
 * flow/layout definition" for the dashboard — the direct analog
 * of chatEngine.js's flow table for the customer app. To add a
 * 5th widget: add an entry here (and a matching field in
 * computeDashboardStats() if it needs a new number). Nothing else
 * in the codebase changes.
 * @type {DashboardWidgetDef[]}
 */
export const DASHBOARD_WIDGETS = Object.freeze([
  {
    id: 'ordersCount',
    label: "Today's Orders",
    icon: '🧾',
    formatValue: (stats) => String(stats.ordersCount)
  },
  {
    id: 'revenue',
    label: "Today's Revenue",
    icon: '💰',
    formatValue: (stats) => formatCurrency(stats.revenue, { symbol: BUSINESS_CONFIG.currency })
  },
  {
    id: 'pending',
    label: 'Pending Orders',
    icon: '⏳',
    formatValue: (stats) => String(stats.pending)
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: '✅',
    formatValue: (stats) => String(stats.completed)
  }
]);
