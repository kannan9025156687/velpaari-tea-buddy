/**
 * =============================================================
 * uiRenderer.js
 * -------------------------------------------------------------
 * Pure(ish) DOM-rendering functions for the chat experience. This
 * is the "view" layer: every function takes a container element
 * and data, and renders — nothing here decides WHAT to show (that
 * is chatEngine.js's job) or WHEN a user interaction should change
 * app state (that is chatPage.js's job, by wiring these functions'
 * callbacks to cart.js/chatEngine.js calls).
 *
 * Because every function here takes its target element as a
 * parameter rather than querying the document itself, each one is
 * independently testable by passing a detached DOM node — no full
 * page or app bootstrap required.
 * =============================================================
 */

import { createEl, on, escapeHtml, scrollToBottom } from '/shared/utils/domHelpers.js';
import { BUSINESS_CONFIG } from '/config/businessConfig.js';

/**
 * Format a Date as a 12-hour "9:41 AM" string, for bubble
 * timestamps. Kept local to this renderer (rather than importing
 * shared/utils/dateUtils.js) since it's a presentation-only detail
 * specific to how chat bubbles look, not a general date utility
 * consumed elsewhere in this file.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function formatBubbleTime(date = new Date()) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

/**
 * Render a user (right-aligned) message bubble.
 * @param {Element} chatArea
 * @param {string} text - plain text, escaped automatically
 */
export function renderUserMessage(chatArea, text) {
  const row = createEl('div', { classes: ['msg-row', 'msg-row--user'] });
  const bubble = createEl('div', { classes: ['bubble', 'bubble--user'] });
  bubble.appendChild(document.createTextNode(text));
  bubble.appendChild(createEl('span', { classes: ['bubble__meta'], text: `${formatBubbleTime()} ✓✓` }));
  row.appendChild(bubble);
  chatArea.appendChild(row);
  scrollToBottom(chatArea);
}

/**
 * Render a single bot message — either a plain text bubble or a
 * structured receipt-card, per docs/DESIGN_SYSTEM.md §10.2/§11.
 * @param {Element} chatArea
 * @param {{type:'text'|'card', html:string}} message
 */
export function renderBotMessage(chatArea, message) {
  const row = createEl('div', { classes: ['msg-row', 'msg-row--bot'] });

  if (message.type === 'card') {
    row.appendChild(createEl('div', { classes: ['receipt-card'], html: message.html }));
  } else {
    const bubble = createEl('div', { classes: ['bubble', 'bubble--bot'], html: message.html });
    bubble.appendChild(createEl('span', { classes: ['bubble__meta'], text: formatBubbleTime() }));
    row.appendChild(bubble);
  }

  chatArea.appendChild(row);
  scrollToBottom(chatArea);
}

/**
 * Show the typing indicator and return a function that removes it.
 * @param {Element} chatArea
 * @returns {() => void} call to remove the indicator
 */
export function showTypingIndicator(chatArea) {
  const row = createEl('div', { classes: ['msg-row', 'msg-row--bot'] });
  const bubble = createEl('div', { classes: ['typing-bubble'] });
  bubble.appendChild(createEl('span', { classes: ['typing-bubble__dot'] }));
  bubble.appendChild(createEl('span', { classes: ['typing-bubble__dot'] }));
  bubble.appendChild(createEl('span', { classes: ['typing-bubble__dot'] }));
  row.appendChild(bubble);
  chatArea.appendChild(row);
  scrollToBottom(chatArea);

  return () => row.remove();
}

/**
 * Render an entire chat "turn" (one or more messages, each shown
 * after a brief randomized typing delay, per
 * docs/DESIGN_SYSTEM.md §11's "typing indicator" spec) followed by
 * its chip options.
 *
 * @param {Object} refs
 * @param {Element} refs.chatArea
 * @param {Element} refs.chipsHost
 * @param {import('../modules/chatEngine.js').ChatTurn} turn
 * @param {(value:string, plainLabel:string) => void} onChipSelect
 * @returns {Promise<void>}
 */
export async function renderTurn({ chatArea, chipsHost }, turn, onChipSelect) {
  clearChips(chipsHost);

  for (const message of turn.messages) {
    const removeTyping = showTypingIndicator(chatArea);
    const delay = 450 + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
    removeTyping();
    renderBotMessage(chatArea, message);
  }

  renderChips(chipsHost, turn.chips || [], onChipSelect);
}

/**
 * Render a set of chips into chipsHost, wiring each one's click to
 * onSelect(value, plainLabel).
 * @param {Element} chipsHost
 * @param {Array<{label:string, value:string, variant?:string}>} chips
 * @param {(value:string, plainLabel:string) => void} onSelect
 */
export function renderChips(chipsHost, chips, onSelect) {
  clearChips(chipsHost);
  if (!chips || chips.length === 0) return;

  const wrap = createEl('div', { classes: ['chips-wrap'] });
  chips.forEach((chip) => {
    const variantClass = chip.variant ? `chip--${chip.variant}` : null;
    const btn = createEl('button', {
      classes: ['chip', variantClass].filter(Boolean),
      attrs: { type: 'button' },
      html: chip.label
    });
    on(btn, 'click', () => {
      clearChips(chipsHost);
      const plainLabel = chip.label.replace(/<[^>]+>/g, '');
      onSelect(chip.value, plainLabel);
    });
    wrap.appendChild(btn);
  });

  chipsHost.appendChild(wrap);
}

/**
 * Remove all currently-rendered chips.
 * @param {Element} chipsHost
 */
export function clearChips(chipsHost) {
  chipsHost.innerHTML = '';
}

/**
 * Update the header's live cart pill (count + running total).
 * @param {Element} cartPillCountEl
 * @param {Element} cartPillTotalEl
 * @param {import('../modules/cart.js').CartSnapshot} snapshot
 */
export function renderCartPill(cartPillCountEl, cartPillTotalEl, snapshot) {
  cartPillCountEl.textContent = String(snapshot.count);
  cartPillTotalEl.textContent = String(snapshot.total);
}

/**
 * Render the live cart drawer's item list, including quantity
 * steppers and a remove button per row.
 *
 * @param {Element} listEl - container the rows are rendered into
 * @param {import('../modules/cart.js').CartSnapshot} snapshot
 * @param {Object} handlers
 * @param {(id:string, nextQty:number) => void} handlers.onQtyChange
 * @param {(id:string) => void} handlers.onRemove
 */
export function renderCartItems(listEl, snapshot, handlers) {
  listEl.innerHTML = '';

  if (snapshot.items.length === 0) {
    listEl.appendChild(createEl('div', {
      classes: ['cart-empty-state'],
      text: "🛍️ Your cart is empty. Order something tasty! 😋"
    }));
    return;
  }

  snapshot.items.forEach((item) => {
    const row = createEl('div', { classes: ['cart-item-row'] });

    row.appendChild(createEl('div', { classes: ['cart-item-row__emoji'], text: item.emoji }));

    const info = createEl('div', { classes: ['cart-item-row__info'] });
    info.appendChild(createEl('div', { classes: ['cart-item-row__name'], text: item.name }));
    info.appendChild(createEl('div', {
      classes: ['cart-item-row__price'],
      text: `${BUSINESS_CONFIG.currency}${item.price} each`
    }));
    row.appendChild(info);

    const stepper = createEl('div', { classes: ['qty-stepper'] });
    const minusBtn = createEl('button', { classes: ['qty-stepper__btn'], attrs: { type: 'button', 'aria-label': `Decrease ${item.name} quantity` }, text: '−' });
    const valueEl = createEl('span', { classes: ['qty-stepper__value'], text: String(item.qty) });
    const plusBtn = createEl('button', { classes: ['qty-stepper__btn'], attrs: { type: 'button', 'aria-label': `Increase ${item.name} quantity` }, text: '+' });

    on(minusBtn, 'click', () => handlers.onQtyChange(item.id, item.qty - 1));
    on(plusBtn, 'click', () => handlers.onQtyChange(item.id, item.qty + 1));

    stepper.appendChild(minusBtn);
    stepper.appendChild(valueEl);
    stepper.appendChild(plusBtn);
    row.appendChild(stepper);

    const removeBtn = createEl('button', {
      classes: ['cart-item-row__remove'],
      attrs: { type: 'button', 'aria-label': `Remove ${item.name} from cart` },
      text: '🗑️'
    });
    on(removeBtn, 'click', () => handlers.onRemove(item.id));
    row.appendChild(removeBtn);

    listEl.appendChild(row);
  });
}

/**
 * Update the cart drawer's total row.
 * @param {Element} totalEl
 * @param {import('../modules/cart.js').CartSnapshot} snapshot
 */
export function renderCartTotal(totalEl, snapshot) {
  totalEl.textContent = `${BUSINESS_CONFIG.currency}${snapshot.total}`;
}

/**
 * Open the cart drawer overlay.
 * @param {Element} overlayEl
 */
export function openCartDrawer(overlayEl) {
  overlayEl.classList.add('is-open');
}

/**
 * Close the cart drawer overlay.
 * @param {Element} overlayEl
 */
export function closeCartDrawer(overlayEl) {
  overlayEl.classList.remove('is-open');
}
