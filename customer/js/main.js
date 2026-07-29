/**
 * =============================================================
 * main.js (customer) — PHASE 8: localStorage adapter registered
 * -------------------------------------------------------------
 * Same composition-root role as before, plus:
 *   1. initStorage() registers the localStorage adapter with
 *      shared/services/storage.js before anything else runs.
 *   2. The customer's session (name) is restored from storage
 *      BEFORE the router's first dispatch, so a hard refresh while
 *      on #/chat still greets the customer by name.
 *   3. The NAME route's onSubmit now persists the name (in
 *      addition to the in-memory customerSession.js write from
 *      Phase 5, unchanged).
 *   4. The CHAT route now passes loadCart/saveCart callbacks
 *      (from sessionCartService.js) into chatPage.js, so the cart
 *      survives a refresh too.
 *
 * Still true, unchanged from Phase 5/Integration: no page module
 * imports storage.js, router.js, or another page directly — this
 * file remains the only place those decisions are made.
 * =============================================================
 */

import { Router } from './router.js';
import { APP_ENV } from '/config/appConfig.js';
import { CUSTOMER_ROUTES, CUSTOMER_DEFAULT_ROUTE } from '/config/routes.js';
import { renderWelcomePage } from './pages/welcomePage.js';
import { renderNamePage } from './pages/namePage.js';
import { renderChatPage } from './pages/chatPage.js';
import { setCustomerName, getCustomerName } from './modules/customerSession.js';
import { initStorage } from '/shared/services/storageBootstrap.js';
import {
  loadCustomerSession,
  saveCustomerSession,
  loadCartItems,
  saveCartItems
} from './services/sessionCartService.js';

// Register the storage adapter before anything below can call
// storage.js (directly or, more likely, via sessionCartService.js).
initStorage();

/** @type {Router} */
export const router = new Router();

const appContainer = document.getElementById('app');

/** @type {(() => void)|null} the currently mounted page's destroy function, if any */
let currentPageDestroy = null;

/**
 * Mount a page into #app, first tearing down whatever page is
 * currently mounted (if any).
 * @param {(container:Element, options:Object) => (() => void)} renderPageFn
 * @param {Object} [options]
 */
function mountPage(renderPageFn, options = {}) {
  if (currentPageDestroy) {
    currentPageDestroy();
    currentPageDestroy = null;
  }
  currentPageDestroy = renderPageFn(appContainer, options);
}

// ---------------------------------------------------------
// Route registration
// ---------------------------------------------------------

router.register(CUSTOMER_ROUTES.WELCOME, () => {
  mountPage(renderWelcomePage, {
    onStart: () => router.navigate(CUSTOMER_ROUTES.NAME)
  });
});

router.register(CUSTOMER_ROUTES.NAME, () => {
  mountPage(renderNamePage, {
    onSubmit: (name) => {
      setCustomerName(name);
      saveCustomerSession(name); // fire-and-forget persistence — UI never waits on this
      router.navigate(CUSTOMER_ROUTES.CHAT);
    }
  });
});

router.register(CUSTOMER_ROUTES.CHAT, () => {
  mountPage(renderChatPage, {
    customerName: getCustomerName(),
    loadCart: loadCartItems,
    saveCart: saveCartItems
  });
});

router.notFound((path) => {
  if (APP_ENV === 'development') {
    console.warn(`[Velpaari Tea Buddy — Customer] Unrecognized path "${path}" — redirecting to ${CUSTOMER_DEFAULT_ROUTE}.`);
  }
  router.replace(CUSTOMER_DEFAULT_ROUTE);
});

// ---------------------------------------------------------
// Restore session, THEN start the router. Awaiting here (top-level
// await is valid in a module script) guarantees that if the
// customer refreshes while on #/chat, the restored name is already
// in customerSession.js before the CHAT route's handler reads it.
// ---------------------------------------------------------
const restoredName = await loadCustomerSession();
if (restoredName) setCustomerName(restoredName);

router.start();

if (APP_ENV === 'development') {
  console.info('[Velpaari Tea Buddy — Customer] Storage adapter registered (localStorage). Session/cart restored:', { restoredName });
}
