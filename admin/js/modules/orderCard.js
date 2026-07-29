/**
 * =============================================================
 * orderCard.js
 * -------------------------------------------------------------
 * The order card component — one order, rendered identically
 * whether it appears in the dashboard's recent-orders section,
 * the full orders list, or the order detail page. Fixed anatomy
 * per docs/DESIGN_SYSTEM.md §12: header (id + status badge),
 * customer, items, total, actions (maps/call), a single next-step
 * status action, and a relative-time footer.
 *
 * Pure rendering + interaction wiring — no fetching, no status
 * business rules of its own (those come from statusManager.js).
 * =============================================================
 */

import { createEl, on } from '/shared/utils/domHelpers.js';
import { BUSINESS_CONFIG } from '/config/businessConfig.js';
import { getRelativeTime } from '/shared/utils/dateUtils.js';
import { getNextStatusActionLabel, getStatusBadgeVariant } from './statusManager.js';

/**
 * @typedef {Object} OrderCardHandlers
 * @property {(orderId:string) => void} [onOpenDetail] - called when the card itself is tapped (not an action button/link)
 * @property {(orderId:string) => void} [onAdvanceStatus] - called when the single next-step button is tapped
 */

/**
 * @param {Object} order - an order record matching docs/API_CONTRACT.md §2's shape
 * @param {OrderCardHandlers} [handlers]
 * @returns {HTMLElement}
 */
export function renderOrderCard(order, handlers = {}) {
  const card = createEl('div', { classes: ['order-card'] });

  // ---- Header: id + status badge ----
  const header = createEl('div', { classes: ['order-card__header'] });
  header.appendChild(createEl('div', { classes: ['order-card__id'], text: order.orderId || '—' }));
  header.appendChild(createEl('span', {
    classes: ['status-badge', `status-badge--${getStatusBadgeVariant(order.status)}`],
    text: order.status || 'NEW'
  }));
  card.appendChild(header);

  // ---- Customer ----
  const customerLine = createEl('div', { classes: ['order-card__customer'] });
  customerLine.appendChild(document.createTextNode(order.customer || 'Customer'));
  if (order.phone) {
    customerLine.appendChild(createEl('span', { classes: ['text-meta'], text: ` · ${order.phone}` }));
  }
  card.appendChild(customerLine);

  // ---- Items ----
  const itemsEl = createEl('div', { classes: ['order-card__items'] });
  (order.items || []).forEach((item) => {
    const line = createEl('div', { classes: ['order-card__item-line'] });
    line.appendChild(createEl('span', { text: `${item.qty}× ${item.name}` }));
    line.appendChild(createEl('span', { text: `${BUSINESS_CONFIG.currency}${item.qty * item.price}` }));
    itemsEl.appendChild(line);
  });
  card.appendChild(itemsEl);

  card.appendChild(createEl('hr', { classes: ['order-card__divider'] }));

  // ---- Total ----
  const totalRow = createEl('div', { classes: ['order-card__total'] });
  totalRow.appendChild(createEl('span', { text: 'Total' }));
  totalRow.appendChild(createEl('span', { text: `${BUSINESS_CONFIG.currency}${order.total || 0}` }));
  card.appendChild(totalRow);

  // ---- Actions: maps / call ----
  const actionsRow = createEl('div', { classes: ['order-card__actions'] });
  if (order.location && order.location.mapsUrl) {
    actionsRow.appendChild(createEl('a', {
      classes: ['btn', 'btn--icon'],
      attrs: { href: order.location.mapsUrl, target: '_blank', rel: 'noopener', 'aria-label': 'Open location in Maps' },
      text: '🗺️'
    }));
  }
  if (order.phone) {
    actionsRow.appendChild(createEl('a', {
      classes: ['btn', 'btn--icon'],
      attrs: { href: `tel:${order.phone}`, 'aria-label': 'Call customer' },
      text: '📞'
    }));
  }
  if (actionsRow.childNodes.length > 0) {
    card.appendChild(actionsRow);
  }

  // ---- Single next-step status action ----
  const nextActionLabel = getNextStatusActionLabel(order.status);
  if (nextActionLabel && typeof handlers.onAdvanceStatus === 'function') {
    const statusWrap = createEl('div', { classes: ['order-card__status-action'] });
    const statusBtn = createEl('button', {
      classes: ['btn', 'btn--primary', 'btn--block'],
      attrs: { type: 'button' },
      text: nextActionLabel
    });
    on(statusBtn, 'click', (event) => {
      event.stopPropagation();
      handlers.onAdvanceStatus(order.orderId);
    });
    statusWrap.appendChild(statusBtn);
    card.appendChild(statusWrap);
  }

  // ---- Footer: relative time ----
  const footer = createEl('div', { classes: ['order-card__footer'] });
  footer.appendChild(createEl('span', {
    classes: ['text-meta'],
    text: order.createdAt ? getRelativeTime(new Date(order.createdAt)) : ''
  }));
  card.appendChild(footer);

  // ---- Whole-card tap → open detail (ignored if the tap landed on a button/link) ----
  if (typeof handlers.onOpenDetail === 'function') {
    on(card, 'click', (event) => {
      if (event.target.closest('button, a')) return;
      handlers.onOpenDetail(order.orderId);
    });
    card.style.cursor = 'pointer';
  }

  return card;
}
