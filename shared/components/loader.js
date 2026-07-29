/**
 * =============================================================
 * loader.js
 * -------------------------------------------------------------
 * Framework-free loading indicators, shared by both customer/
 * and admin/: an inline spinner (for buttons/cards), a skeleton
 * block (for content placeholders), and a full-screen blocking
 * overlay (for operations like "Placing your order…"). No
 * business logic — callers decide when/why to show these.
 * =============================================================
 */

import { createEl } from '/shared/utils/domHelpers.js';

/**
 * Create an inline spinner element. Does not attach it anywhere —
 * the caller appends it wherever needed (e.g. inside a button
 * while a request is in flight).
 *
 * @param {'sm'|'md'|'lg'} [size='md']
 * @returns {HTMLElement}
 */
export function createSpinner(size = 'md') {
  return createEl('span', {
    classes: ['spinner', `spinner--${size}`],
    attrs: { role: 'status', 'aria-label': 'Loading' }
  });
}

/**
 * Create a skeleton placeholder block, used while real content is
 * still loading (e.g. an order card's contents before data
 * arrives).
 *
 * @param {Object} [options]
 * @param {string} [options.width='100%']
 * @param {string} [options.height='16px']
 * @param {boolean} [options.rounded=true] - use the pill radius instead of the small radius
 * @returns {HTMLElement}
 */
export function createSkeleton(options = {}) {
  const { width = '100%', height = '16px', rounded = true } = options;
  const el = createEl('div', {
    classes: ['skeleton', rounded ? 'skeleton--rounded' : 'skeleton--square']
  });
  el.style.width = width;
  el.style.height = height;
  return el;
}

/**
 * Create a row of skeleton blocks, useful for mocking up a list
 * of loading cards in one call.
 *
 * @param {number} [count=3]
 * @param {Object} [skeletonOptions] - passed through to createSkeleton() for each row
 * @returns {HTMLElement} a container with `count` skeleton blocks stacked vertically
 */
export function createSkeletonGroup(count = 3, skeletonOptions = {}) {
  const group = createEl('div', { classes: ['skeleton-group'] });
  for (let i = 0; i < count; i += 1) {
    group.appendChild(createSkeleton(skeletonOptions));
  }
  return group;
}

/** @type {HTMLElement|null} the currently visible full-screen loader overlay, if any */
let overlayEl = null;

/**
 * Show a full-screen, blocking loading overlay — used for
 * operations the user must wait for (e.g. saving an order).
 * Replaces any overlay already showing.
 *
 * @param {string} [message] - optional label shown under the spinner
 */
export function showLoaderOverlay(message = '') {
  hideLoaderOverlay();

  overlayEl = createEl('div', {
    classes: ['loader-overlay'],
    attrs: { role: 'status', 'aria-live': 'polite' }
  });

  const panel = createEl('div', { classes: ['loader-overlay__panel'] });
  panel.appendChild(createSpinner('lg'));
  if (message) {
    panel.appendChild(createEl('p', { classes: ['loader-overlay__message'], text: message }));
  }

  overlayEl.appendChild(panel);
  document.body.appendChild(overlayEl);
}

/**
 * Hide the full-screen loading overlay, if one is showing. Safe
 * to call even when none is visible.
 */
export function hideLoaderOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}
