/**
 * =============================================================
 * statusManager.js
 * -------------------------------------------------------------
 * Pure order-status business logic: what status comes next, what
 * label/variant to show for it. No DOM, no data fetching — used
 * by orderCard.js (rendering) and the admin pages (to decide what
 * action to offer and to call orderAdminService.updateOrderStatus
 * with the right next value).
 * =============================================================
 */

import { ORDER_STATUS, ORDER_STATUS_SEQUENCE } from '/config/constants.js';

/**
 * @param {string} currentStatus
 * @returns {string|null} the next status in the sequence, or null if already at the end (or status is unrecognized)
 */
export function getNextStatus(currentStatus) {
  const index = ORDER_STATUS_SEQUENCE.indexOf(currentStatus);
  if (index === -1 || index === ORDER_STATUS_SEQUENCE.length - 1) return null;
  return ORDER_STATUS_SEQUENCE[index + 1];
}

/** @type {Object<string,string>} the single-next-action button label per current status */
const NEXT_ACTION_LABELS = Object.freeze({
  [ORDER_STATUS.NEW]: 'Start Preparing →',
  [ORDER_STATUS.PREPARING]: 'Mark Ready →',
  [ORDER_STATUS.READY]: 'Mark Completed →'
});

/**
 * The label for the order card's single "next step" button, per
 * docs/DESIGN_SYSTEM.md §12 point 6 (one obvious next action, not
 * a 4-way selector). Returns null once an order is COMPLETED —
 * callers should not render a status-action button in that case.
 * @param {string} currentStatus
 * @returns {string|null}
 */
export function getNextStatusActionLabel(currentStatus) {
  return NEXT_ACTION_LABELS[currentStatus] || null;
}

/**
 * Map a status value to the CSS modifier suffix used by
 * `.status-badge--{variant}` in admin-components.css.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeVariant(status) {
  return (status || ORDER_STATUS.NEW).toLowerCase();
}
