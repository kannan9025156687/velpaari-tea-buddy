/**
 * =============================================================
 * orderDetailPage.js
 * -------------------------------------------------------------
 * PRESENTATION ONLY. Fetches one order by id via
 * orderAdminService.getOrderById() and renders it with the same
 * orderCard.js component used by dashboardPage.js and
 * ordersPage.js — a single order looks identical wherever it
 * appears, by construction, rather than by convention.
 *
 * Does not read config/routes.js or router.js — the caller
 * extracts `orderId` from the route (a later phase's concern) and
 * passes it in directly, and `onBack` is a plain callback rather
 * than a router.navigate(...) call, keeping this page reusable and
 * testable in isolation.
 *
 * Usage:
 *   import { renderOrderDetailPage } from './pages/orderDetailPage.js';
 *   const destroy = renderOrderDetailPage(document.getElementById('app'), {
 *     orderId: 'TB-20260725-0001',
 *     onBack: () => console.log('back tapped')
 *   });
 * =============================================================
 */

import { createEl, on, empty } from '/shared/utils/domHelpers.js';
import { getOrderById, updateOrderStatus } from '../services/orderAdminService.js';
import { getNextStatus } from '../modules/statusManager.js';
import { renderOrderCard } from '../modules/orderCard.js';
import { renderEmptyState } from '/shared/components/emptyState.js';
import { showToast } from '/shared/components/toast.js';
import { createSkeletonGroup } from '/shared/components/loader.js';

/**
 * @param {Element} container
 * @param {Object} [options]
 * @param {string} options.orderId
 * @param {() => void} [options.onBack]
 * @returns {() => void} destroy function
 */
export function renderOrderDetailPage(container, { orderId, onBack } = {}) {
  empty(container);

  const header = createEl('div', { classes: ['admin-header'] });
  const backBtn = createEl('button', {
    classes: ['btn', 'btn--icon'],
    attrs: { type: 'button', 'aria-label': 'Back to orders' },
    text: '←'
  });
  header.appendChild(backBtn);
  const headerTitle = createEl('div', { classes: ['admin-header__title'] });
  headerTitle.appendChild(createEl('h1', { text: 'Order Detail' }));
  header.appendChild(headerTitle);
  container.appendChild(header);

  const main = createEl('div', { classes: ['admin-main'] });
  container.appendChild(main);

  const detailHost = createEl('div');
  detailHost.appendChild(createSkeletonGroup(5, { height: '20px' }));
  main.appendChild(detailHost);

  const unsubscribeBack = on(backBtn, 'click', () => {
    if (typeof onBack === 'function') onBack();
  });

  async function loadOrder() {
    const result = await getOrderById(orderId);
    detailHost.innerHTML = '';

    if (!result.success || !result.data) {
      renderEmptyState(detailHost, {
        icon: '🔍',
        title: 'Order not found',
        message: result.success
          ? "We couldn't find that order."
          : "Order data isn't connected yet.",
        action: onBack ? { label: '← Back to Orders', onClick: onBack } : null
      });
      return;
    }

    detailHost.appendChild(renderOrderCard(result.data, {
      onAdvanceStatus: handleAdvanceStatus
    }));
  }

  /**
   * @param {string} id
   */
  async function handleAdvanceStatus(id) {
    const currentResult = await getOrderById(id);
    if (!currentResult.success || !currentResult.data) return;

    const nextStatus = getNextStatus(currentResult.data.status);
    if (!nextStatus) return;

    const updateResult = await updateOrderStatus(id, nextStatus);
    if (updateResult.success) {
      showToast('Status updated ✅', { type: 'success' });
    } else {
      showToast(updateResult.error?.message || "Couldn't update status yet.", { type: 'error' });
    }
    await loadOrder();
  }

  loadOrder();

  return function destroy() {
    unsubscribeBack();
    empty(container);
  };
}
