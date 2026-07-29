/**
 * =============================================================
 * main.js (admin) — INTEGRATION PHASE
 * -------------------------------------------------------------
 * The admin app's composition root — the analog of
 * customer/js/main.js. Builds the persistent shell (a page-root
 * mount point + a bottom nav that survives page transitions),
 * registers all three routes against config/routes.js's
 * ADMIN_ROUTES, and decides what each page's callbacks do.
 *
 * Lifecycle discipline is identical to the customer app:
 * mountPage() always tears down the previously mounted page
 * (calling its destroy()) before mounting the next one, so
 * listeners never accumulate across navigations.
 *
 * The bottom nav is built ONCE, outside mountPage()'s reach —
 * it is a sibling of #page-root inside #app, not a child of it,
 * so a page's empty(container) call (container === #page-root)
 * never touches it.
 *
 * Storage stays disconnected in this phase (rule 10) — nothing
 * here imports shared/services/storage.js directly (only
 * orderAdminService.js does, per Phase 6), and no adapter is
 * registered anywhere in this codebase yet.
 * =============================================================
 */

import { Router } from './router.js';
import { APP_ENV } from '/config/appConfig.js';
import { ADMIN_ROUTES, ADMIN_DEFAULT_ROUTE } from '/config/routes.js';
import { createEl, on } from '/shared/utils/domHelpers.js';
import { renderDashboardPage } from './pages/dashboardPage.js';
import { renderOrdersPage } from './pages/ordersPage.js';
import { renderOrderDetailPage } from './pages/orderDetailPage.js';
import { initStorage } from '/shared/services/storageBootstrap.js';

// Register the storage adapter before orderAdminService.js's first
// call. This is the ONLY change from the Integration phase's
// main.js — every page/module below is unchanged, per the storage
// abstraction's whole point (docs/ARCHITECTURE.md §4).
initStorage();

/** @type {Router} */
export const router = new Router();

const appContainer = document.getElementById('app');

// ---------------------------------------------------------
// Persistent shell: a page-root mount point + bottom nav that
// survive every page mount/unmount.
// ---------------------------------------------------------
const pageRoot = createEl('div', { attrs: { id: 'page-root' } });

const bottomNav = createEl('nav', { classes: ['admin-bottom-nav'], attrs: { 'aria-label': 'Admin navigation' } });

const dashboardNavBtn = createEl('button', {
  classes: ['admin-nav-item'],
  attrs: { type: 'button' }
});
dashboardNavBtn.appendChild(createEl('span', { classes: ['admin-nav-item__icon'], attrs: { 'aria-hidden': 'true' }, text: '🏠' }));
dashboardNavBtn.appendChild(createEl('span', { text: 'Dashboard' }));

const ordersNavBtn = createEl('button', {
  classes: ['admin-nav-item'],
  attrs: { type: 'button' }
});
ordersNavBtn.appendChild(createEl('span', { classes: ['admin-nav-item__icon'], attrs: { 'aria-hidden': 'true' }, text: '📋' }));
ordersNavBtn.appendChild(createEl('span', { text: 'Orders' }));

bottomNav.appendChild(dashboardNavBtn);
bottomNav.appendChild(ordersNavBtn);

on(dashboardNavBtn, 'click', () => router.navigate(ADMIN_ROUTES.DASHBOARD));
on(ordersNavBtn, 'click', () => router.navigate(ADMIN_ROUTES.ORDERS));

appContainer.appendChild(pageRoot);
appContainer.appendChild(bottomNav);

/**
 * Toggle the bottom nav's active-item highlight based on which
 * top-level section is current. Order-detail counts as "Orders".
 * @param {'dashboard'|'orders'} section
 */
function setActiveNav(section) {
  dashboardNavBtn.classList.toggle('admin-nav-item--active', section === 'dashboard');
  ordersNavBtn.classList.toggle('admin-nav-item--active', section === 'orders');
}

/** @type {(() => void)|null} the currently mounted page's destroy function, if any */
let currentPageDestroy = null;

/**
 * Mount a page into #page-root, first tearing down whatever page
 * is currently mounted (if any). The bottom nav, appended directly
 * to #app rather than #page-root, is never affected.
 * @param {(container:Element, options:Object) => (() => void)} renderPageFn
 * @param {Object} [options]
 */
function mountPage(renderPageFn, options = {}) {
  if (currentPageDestroy) {
    currentPageDestroy();
    currentPageDestroy = null;
  }
  currentPageDestroy = renderPageFn(pageRoot, options);
}

// ---------------------------------------------------------
// Route registration
// ---------------------------------------------------------

router.register(ADMIN_ROUTES.DASHBOARD, () => {
  setActiveNav('dashboard');
  mountPage(renderDashboardPage, {
    onOpenOrder: (orderId) => router.navigate(`/orders/${orderId}`)
  });
});

router.register(ADMIN_ROUTES.ORDERS, () => {
  setActiveNav('orders');
  mountPage(renderOrdersPage, {
    onOpenOrder: (orderId) => router.navigate(`/orders/${orderId}`)
  });
});

router.register(ADMIN_ROUTES.ORDER_DETAIL, (params) => {
  setActiveNav('orders');
  mountPage(renderOrderDetailPage, {
    orderId: params.id,
    onBack: () => router.navigate(ADMIN_ROUTES.ORDERS)
  });
});

router.notFound((path) => {
  if (APP_ENV === 'development') {
    console.warn(`[Velpaari Tea Buddy — Admin] Unrecognized path "${path}" — redirecting to ${ADMIN_DEFAULT_ROUTE}.`);
  }
  router.replace(ADMIN_DEFAULT_ROUTE);
});

router.start();

if (APP_ENV === 'development') {
  console.info('[Velpaari Tea Buddy — Admin] Integrated: router ↔ pages ↔ dashboard widgets ↔ order cards. Storage adapter: localStorage (Phase 8).');
}
