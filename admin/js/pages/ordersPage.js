/**
 * =============================================================
 * ordersPage.js
 * -------------------------------------------------------------
 * PRESENTATION ONLY. Renders the search/filter bar and the order
 * list. Fetches once via orderAdminService.getOrders(), then
 * re-filters the already-fetched array on every keystroke/filter
 * tap using filters.js (no re-fetch per keystroke). Status
 * transitions are delegated to statusManager.js +
 * orderAdminService.updateOrderStatus() — this file never decides
 * what the "next status" is itself.
 *
 * Usage:
 *   import { renderOrdersPage } from './pages/ordersPage.js';
 *   const destroy = renderOrdersPage(document.getElementById('app'), {
 *     onOpenOrder: (orderId) => console.log('open', orderId)
 *   });
 * =============================================================
 */

import { createEl, on, empty } from '/shared/utils/domHelpers.js';
import { ORDER_STATUS } from '/config/constants.js';
import { getOrders, updateOrderStatus } from '../services/orderAdminService.js';
import { filterOrders } from '../modules/filters.js';
import { getNextStatus } from '../modules/statusManager.js';
import { renderOrderCard } from '../modules/orderCard.js';
import { renderEmptyState } from '/shared/components/emptyState.js';
import { showToast } from '/shared/components/toast.js';
import { createSkeletonGroup } from '/shared/components/loader.js';

/**
 * @param {Element} container
 * @param {Object} [options]
 * @param {(orderId:string) => void} [options.onOpenOrder]
 * @returns {() => void} destroy function
 */
export function renderOrdersPage(container, { onOpenOrder } = {}) {
  empty(container);

  /** @type {Array<Object>} the full fetched order list, refined client-side by filterOrders() */
  let allOrders = [];
  let activeStatus = null;
  let searchQuery = '';

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  const header = createEl('div', { classes: ['admin-header'] });
  const headerTitle = createEl('div', { classes: ['admin-header__title'] });
  headerTitle.appendChild(createEl('h1', { text: 'Orders' }));
  header.appendChild(headerTitle);
  container.appendChild(header);

  const main = createEl('div', { classes: ['admin-main'] });
  container.appendChild(main);

  // ---------------------------------------------------------
  // Filter bar: search + status chips
  // ---------------------------------------------------------
  const filterBar = createEl('div', { classes: ['filter-bar'] });

  const searchField = createEl('div', { classes: ['search-field'] });
  searchField.appendChild(createEl('span', { classes: ['search-field__icon'], attrs: { 'aria-hidden': 'true' }, text: '🔍' }));
  const searchInput = createEl('input', {
    classes: ['text-input'],
    attrs: { type: 'text', placeholder: 'Search order ID or customer…', 'aria-label': 'Search orders' }
  });
  const clearSearchBtn = createEl('button', {
    classes: ['search-field__clear'],
    attrs: { type: 'button', 'aria-label': 'Clear search' },
    text: '✕'
  });
  searchField.appendChild(searchInput);
  searchField.appendChild(clearSearchBtn);
  filterBar.appendChild(searchField);
  main.appendChild(filterBar);

  const statusFilterBar = createEl('div', { classes: ['filter-bar'] });
  const statusOptions = [{ value: null, label: 'All' }, ...Object.values(ORDER_STATUS).map((status) => ({ value: status, label: status }))];
  /** @type {Map<string|null, HTMLElement>} */
  const statusChipEls = new Map();

  statusOptions.forEach((option) => {
    const chip = createEl('button', {
      classes: ['filter-chip', option.value === activeStatus ? 'filter-chip--active' : null].filter(Boolean),
      attrs: { type: 'button' },
      text: option.label
    });
    on(chip, 'click', () => {
      activeStatus = option.value;
      statusChipEls.forEach((el, value) => el.classList.toggle('filter-chip--active', value === activeStatus));
      renderList();
    });
    statusChipEls.set(option.value, chip);
    statusFilterBar.appendChild(chip);
  });
  main.appendChild(statusFilterBar);

  // ---------------------------------------------------------
  // Order list
  // ---------------------------------------------------------
  const orderListEl = createEl('div', { classes: ['order-list'] });
  orderListEl.appendChild(createSkeletonGroup(3, { height: '120px' }));
  main.appendChild(orderListEl);

  function renderList() {
    const filtered = filterOrders(allOrders, { status: activeStatus, search: searchQuery });
    orderListEl.innerHTML = '';

    if (filtered.length === 0) {
      renderEmptyState(orderListEl, {
        icon: '🧾',
        title: 'No orders found',
        message: allOrders.length === 0
          ? "Order data isn't connected yet."
          : 'Try a different search or filter.'
      });
      return;
    }

    filtered.forEach((order) => {
      orderListEl.appendChild(renderOrderCard(order, {
        onOpenDetail: onOpenOrder,
        onAdvanceStatus: handleAdvanceStatus
      }));
    });
  }

  /**
   * @param {string} orderId
   */
  async function handleAdvanceStatus(orderId) {
    const order = allOrders.find((item) => item.orderId === orderId);
    if (!order) return;

    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    const result = await updateOrderStatus(orderId, nextStatus);
    if (result.success) {
      order.status = nextStatus;
      showToast('Status updated ✅', { type: 'success' });
    } else {
      showToast(result.error?.message || "Couldn't update status yet.", { type: 'error' });
    }
    renderList();
  }

  const unsubscribeSearch = on(searchInput, 'input', () => {
    searchQuery = searchInput.value.trim();
    searchField.classList.toggle('has-value', searchQuery.length > 0);
    renderList();
  });
  const unsubscribeClear = on(clearSearchBtn, 'click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchField.classList.remove('has-value');
    renderList();
  });

  (async () => {
    const result = await getOrders({}, { sort: 'createdAt_desc' });
    allOrders = result.success ? result.data : [];
    renderList();
  })();

  return function destroy() {
    unsubscribeSearch();
    unsubscribeClear();
    empty(container);
  };
}
