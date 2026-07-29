/**
 * =============================================================
 * dashboardPage.js
 * -------------------------------------------------------------
 * PRESENTATION ONLY. Renders the stat widget grid and a recent-
 * orders glance. Contains no stats math (dashboardStats.js), no
 * data fetching logic (orderAdminService.js), and no order-card
 * anatomy (orderCard.js) — this file only orchestrates: ask the
 * data provider for stats/orders, hand them to the reusable
 * rendering components, mount the results.
 *
 * Per Phase 6 rules 1/3: the stat grid is built by looping over
 * DASHBOARD_WIDGETS — there is no fixed "4 cards" layout here. Add
 * or remove a widget in dashboardStats.js and this file renders
 * whatever the registry contains, unchanged.
 *
 * Per rule 5: every number shown comes from
 * orderAdminService.getDashboardStats() — nothing is hardcoded. If
 * that call fails (no backend is wired yet — see
 * orderAdminService.js), each widget shows "—" rather than a fake
 * number, and the recent-orders section shows an honest empty
 * state instead of sample data.
 *
 * Usage:
 *   import { renderDashboardPage } from './pages/dashboardPage.js';
 *   const destroy = renderDashboardPage(document.getElementById('app'), {
 *     onOpenOrder: (orderId) => console.log('open', orderId)
 *   });
 * =============================================================
 */

import { createEl, empty } from '/shared/utils/domHelpers.js';
import { DASHBOARD_WIDGETS } from '../modules/dashboardStats.js';
import { renderStatWidget, renderStatWidgetSkeleton } from '../modules/statWidget.js';
import { getDashboardStats, getOrders } from '../services/orderAdminService.js';
import { renderOrderCard } from '../modules/orderCard.js';
import { renderEmptyState } from '/shared/components/emptyState.js';
import { createSkeletonGroup } from '/shared/components/loader.js';

/**
 * @param {Element} container
 * @param {Object} [options]
 * @param {(orderId:string) => void} [options.onOpenOrder]
 * @returns {() => void} destroy function
 */
export function renderDashboardPage(container, { onOpenOrder } = {}) {
  empty(container);

  const header = createEl('div', { classes: ['admin-header'] });
  const headerTitle = createEl('div', { classes: ['admin-header__title'] });
  headerTitle.appendChild(createEl('h1', { text: 'Dashboard' }));
  header.appendChild(headerTitle);
  container.appendChild(header);

  const main = createEl('div', { classes: ['admin-main'] });
  container.appendChild(main);

  // ---- Stat widget grid — entirely driven by DASHBOARD_WIDGETS ----
  const statGrid = createEl('div', { classes: ['stat-grid'] });
  DASHBOARD_WIDGETS.forEach((widget) => {
    statGrid.appendChild(renderStatWidgetSkeleton(widget));
  });
  main.appendChild(statGrid);

  // ---- Recent orders glance ----
  main.appendChild(createEl('h2', { classes: ['section-heading'], text: 'Recent Orders' }));
  const recentListEl = createEl('div', { classes: ['order-list'] });
  recentListEl.appendChild(createSkeletonGroup(3, { height: '120px' }));
  main.appendChild(recentListEl);

  async function loadStats() {
    const result = await getDashboardStats();
    statGrid.innerHTML = '';
    DASHBOARD_WIDGETS.forEach((widget) => {
      const value = result.success ? widget.formatValue(result.data) : '—';
      statGrid.appendChild(renderStatWidget(widget, value));
    });
  }

  async function loadRecentOrders() {
    const result = await getOrders({}, { sort: 'createdAt_desc', limit: 5 });
    recentListEl.innerHTML = '';

    if (!result.success || !result.data || result.data.length === 0) {
      renderEmptyState(recentListEl, {
        icon: '🧾',
        title: 'No orders yet',
        message: result.success
          ? 'New orders will show up here as customers place them.'
          : "Order data isn't connected yet."
      });
      return;
    }

    result.data.forEach((order) => {
      recentListEl.appendChild(renderOrderCard(order, { onOpenDetail: onOpenOrder }));
    });
  }

  loadStats();
  loadRecentOrders();

  return function destroy() {
    empty(container);
  };
}
