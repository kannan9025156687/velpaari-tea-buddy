/**
 * =============================================================
 * chatPage.js
 * -------------------------------------------------------------
 * PRESENTATION + INTERACTION WIRING ONLY. This page:
 *   - builds the chat screen's DOM (header, message list, chip
 *     row, text input, live cart drawer)
 *   - forwards user interactions (chip taps, typed text, cart
 *     +/-/remove taps) to the reusable modules that own that logic
 *   - renders whatever those modules return, via uiRenderer.js
 *
 * It contains NO conversation logic (that's chatEngine.js's
 * declarative flow definition + state machine), NO cart math
 * (that's cart.js), and NO menu/price/branding data (that all
 * comes from config/businessConfig.js, consumed by cart.js and
 * chatEngine.js — this file never reads businessConfig's menu or
 * addons arrays itself, only businessName/currency for header/cart
 * display text).
 *
 * This page never imports shared/services/storage.js or any
 * backend service, per Phase 5's rules — CHECKOUT_PENDING (reached
 * once the customer taps "I'm done") is currently a dead end with
 * a "coming soon" message and a way to keep ordering; wiring an
 * actual order-save call is deferred to the checkout phase.
 *
 * PHASE 8 ADDITION — cart persistence: this page optionally accepts
 * `loadCart`/`saveCart` callbacks (plain async functions, supplied
 * by main.js from customer/js/services/sessionCartService.js). It
 * calls them the exact same way it would call any other callback
 * prop — it has no idea they eventually reach storage.js. This is
 * the same decoupling pattern as onStart/onSubmit from Phase 5,
 * just applied to persistence instead of navigation.
 *
 * Usage:
 *   import { renderChatPage } from './pages/chatPage.js';
 *   const destroy = renderChatPage(document.getElementById('app'), {
 *     customerName: 'Kannan',
 *     loadCart: async () => [{ id: 'tea', qty: 2 }],
 *     saveCart: async (items) => { }
 *   });
 * =============================================================
 */

import { createEl, on, empty } from '/shared/utils/domHelpers.js';
import { BUSINESS_CONFIG } from '/config/businessConfig.js';
import { createCart } from '../modules/cart.js';
import { createChatEngine } from '../modules/chatEngine.js';
import * as ui from '../modules/uiRenderer.js';

/**
 * @param {Element} container - element to render into (its existing contents are cleared)
 * @param {Object} [options]
 * @param {string} [options.customerName='']
 * @param {() => Promise<Array<{id:string, qty:number}>>} [options.loadCart] - called once on mount to rehydrate the cart; omit to start with an empty cart
 * @param {(items:Array<{id:string, qty:number}>) => Promise<void>} [options.saveCart] - called on every cart change; omit to skip persistence
 * @returns {() => void} destroy function — unsubscribes listeners and clears the container
 */
export function renderChatPage(container, { customerName = '', loadCart, saveCart } = {}) {
  empty(container);

  const cart = createCart();
  const engine = createChatEngine({ customerName });

  const screen = createEl('div', { classes: ['screen', 'is-active'] });
  const shell = createEl('div', { classes: ['chat-shell'] });

  // ---------------------------------------------------------
  // Header
  // ---------------------------------------------------------
  const header = createEl('div', { classes: ['chat-header'] });

  const avatarWrap = createEl('div', { classes: ['avatar-wrap'] });
  avatarWrap.appendChild(createEl('div', { classes: ['avatar'], attrs: { 'aria-hidden': 'true' }, text: BUSINESS_CONFIG.logoEmoji }));
  avatarWrap.appendChild(createEl('span', { classes: ['online-dot'], attrs: { 'aria-hidden': 'true' } }));
  header.appendChild(avatarWrap);

  const headerInfo = createEl('div', { classes: ['chat-header__info'] });
  headerInfo.appendChild(createEl('div', { classes: ['header-name'], text: BUSINESS_CONFIG.businessName }));
  headerInfo.appendChild(createEl('div', { classes: ['header-status'], text: 'Online 🟢' }));
  header.appendChild(headerInfo);

  const cartCountEl = createEl('b', { text: '0' });
  const cartTotalEl = createEl('span', { text: '0' });
  const cartPillBtn = createEl('button', {
    classes: ['cart-pill-btn'],
    attrs: { type: 'button', 'aria-label': 'Open cart' }
  });
  cartPillBtn.appendChild(document.createTextNode('🛍️ '));
  cartPillBtn.appendChild(cartCountEl);
  cartPillBtn.appendChild(document.createTextNode(` · ${BUSINESS_CONFIG.currency}`));
  cartPillBtn.appendChild(cartTotalEl);
  header.appendChild(cartPillBtn);

  shell.appendChild(header);

  // ---------------------------------------------------------
  // Message list + chips + text input
  // ---------------------------------------------------------
  const chatArea = createEl('div', { classes: ['chat-area'], attrs: { role: 'log', 'aria-live': 'polite' } });
  shell.appendChild(chatArea);

  const chipsHost = createEl('div', { classes: ['chips-host'] });
  shell.appendChild(chipsHost);

  const inputBar = createEl('div', { classes: ['input-bar'] });
  const textInput = createEl('input', {
    classes: ['text-input'],
    attrs: { type: 'text', placeholder: 'Type here…', autocomplete: 'off', 'aria-label': 'Message' }
  });
  const sendBtn = createEl('button', {
    classes: ['btn', 'btn--icon', 'btn--icon-fab'],
    attrs: { type: 'button', 'aria-label': 'Send message' },
    html: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
  });
  inputBar.appendChild(textInput);
  inputBar.appendChild(sendBtn);
  shell.appendChild(inputBar);

  screen.appendChild(shell);

  // ---------------------------------------------------------
  // Live cart drawer
  // ---------------------------------------------------------
  const cartOverlay = createEl('div', { classes: ['cart-overlay'] });
  const cartDrawer = createEl('div', { classes: ['cart-drawer'] });
  cartDrawer.appendChild(createEl('div', { classes: ['cart-drawer__handle'], attrs: { 'aria-hidden': 'true' } }));

  const drawerHeader = createEl('div', { classes: ['cart-drawer__header'] });
  drawerHeader.appendChild(createEl('h3', { text: '🛍️ Your Cart' }));
  const closeCartBtn = createEl('button', {
    classes: ['btn', 'btn--icon'],
    attrs: { type: 'button', 'aria-label': 'Close cart' },
    text: '✕'
  });
  drawerHeader.appendChild(closeCartBtn);
  cartDrawer.appendChild(drawerHeader);

  const cartItemsList = createEl('div', { classes: ['cart-drawer__items'] });
  cartDrawer.appendChild(cartItemsList);

  const drawerFooter = createEl('div', { classes: ['cart-drawer__footer'] });
  const totalRow = createEl('div', { classes: ['cart-total-row'] });
  totalRow.appendChild(createEl('span', { text: 'Total' }));
  const drawerTotalEl = createEl('b', { text: `${BUSINESS_CONFIG.currency}0` });
  totalRow.appendChild(drawerTotalEl);
  drawerFooter.appendChild(totalRow);

  const checkoutBtn = createEl('button', {
    classes: ['btn', 'btn--primary', 'btn--block'],
    attrs: { type: 'button' },
    text: "I'm done, checkout ➜"
  });
  const keepOrderingBtn = createEl('button', {
    classes: ['btn', 'btn--secondary', 'btn--block'],
    attrs: { type: 'button' },
    text: '➕ Keep Ordering'
  });
  drawerFooter.appendChild(checkoutBtn);
  drawerFooter.appendChild(keepOrderingBtn);
  cartDrawer.appendChild(drawerFooter);

  cartOverlay.appendChild(cartDrawer);
  container.appendChild(screen);
  container.appendChild(cartOverlay);

  // ---------------------------------------------------------
  // Behavior: cart → header/drawer rendering
  // ---------------------------------------------------------

  /**
   * Unsubscribe function for the cart subscription set up below.
   * Declared as `let` (not `const`) because subscribing happens
   * inside an async rehydration step — see startChat() — so
   * destroy() must tolerate being called before that step
   * finishes (e.g. the customer navigates away almost immediately;
   * verified safe in docs/INTEGRATION_VERIFICATION.md's mid-turn
   * navigation stress test).
   * @type {(() => void)|null}
   */
  let unsubscribeCart = null;

  function subscribeCart() {
    unsubscribeCart = cart.subscribe((snapshot) => {
      ui.renderCartPill(cartCountEl, cartTotalEl, snapshot);
      ui.renderCartItems(cartItemsList, snapshot, {
        onQtyChange: (id, qty) => cart.updateQty(id, qty),
        onRemove: (id) => cart.removeItem(id)
      });
      ui.renderCartTotal(drawerTotalEl, snapshot);

      if (typeof saveCart === 'function') {
        saveCart(snapshot.items.map((item) => ({ id: item.id, qty: item.qty })));
      }
    });
  }

  /**
   * Apply a chatEngine cartOp instruction to the actual cart. This
   * is the one place a page mutates the cart on the engine's
   * behalf — the engine itself never touches cart.js directly
   * (see chatEngine.js's header comment for why).
   * @param {{type:'add', id:string, qty:number}|null} cartOp
   */
  function applyCartOp(cartOp) {
    if (cartOp && cartOp.type === 'add') {
      cart.addItem(cartOp.id, cartOp.qty);
    }
  }

  /**
   * Route a chip/button action (or a drawer button press) through
   * the chat engine and render the resulting turn. Shared by chat
   * chips and the cart drawer's checkout button so both paths go
   * through the exact same state machine.
   * @param {string} value
   * @param {string} [plainLabel] - if provided, echoed as a user message bubble first
   */
  async function processAction(value, plainLabel) {
    ui.closeCartDrawer(cartOverlay);
    if (plainLabel) ui.renderUserMessage(chatArea, plainLabel);

    const cartItemIds = cart.getSnapshot().items.map((item) => item.id);
    const { turn, cartOp } = engine.handleAction(value, cartItemIds);
    applyCartOp(cartOp);
    await ui.renderTurn({ chatArea, chipsHost }, turn, processAction);
  }

  async function handleSend() {
    const value = textInput.value.trim();
    if (!value) return;
    textInput.value = '';
    ui.renderUserMessage(chatArea, value);

    const cartItemIds = cart.getSnapshot().items.map((item) => item.id);
    const { turn, cartOp } = engine.handleText(value, cartItemIds);
    applyCartOp(cartOp);
    await ui.renderTurn({ chatArea, chipsHost }, turn, processAction);
  }

  // ---------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------
  const unsubscribers = [
    on(sendBtn, 'click', handleSend),
    on(textInput, 'keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    }),
    on(cartPillBtn, 'click', () => ui.openCartDrawer(cartOverlay)),
    on(closeCartBtn, 'click', () => ui.closeCartDrawer(cartOverlay)),
    on(cartOverlay, 'click', (event) => {
      if (event.target === cartOverlay) ui.closeCartDrawer(cartOverlay);
    }),
    on(keepOrderingBtn, 'click', () => ui.closeCartDrawer(cartOverlay)),
    on(checkoutBtn, 'click', () => processAction('finish', "✅ I'm done, checkout"))
  ];

  // ---------------------------------------------------------
  // Rehydrate cart (if a loadCart callback was supplied), THEN
  // subscribe — in that order, deliberately. cart.subscribe()
  // fires its listener immediately with the cart's CURRENT state;
  // subscribing before rehydrating would fire once with an empty
  // cart and, via saveCart, immediately overwrite any previously
  // persisted cart with an empty one.
  // ---------------------------------------------------------
  async function startChat() {
    if (typeof loadCart === 'function') {
      const savedItems = await loadCart();
      savedItems.forEach((item) => cart.addItem(item.id, item.qty));
    }
    subscribeCart();

    const { turn } = engine.start(cart.getSnapshot().items.map((item) => item.id));
    await ui.renderTurn({ chatArea, chipsHost }, turn, processAction);
  }
  startChat();

  return function destroy() {
    if (unsubscribeCart) unsubscribeCart();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    empty(container);
  };
}
