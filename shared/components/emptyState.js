/**
 * =============================================================
 * emptyState.js
 * -------------------------------------------------------------
 * Generic "nothing here yet" placeholder, shared by both
 * customer/ (e.g. "Cart is empty") and admin/ (e.g. "No orders
 * yet"). Contains no business copy itself — every string is
 * supplied by the caller, which is what keeps this module reusable
 * across both apps and any future business built on this platform.
 * =============================================================
 */

import { createEl } from '/shared/utils/domHelpers.js';

/**
 * Build an empty-state element. Does not attach it anywhere — the
 * caller inserts it into its own container (or use
 * renderEmptyState() below to do both in one call).
 *
 * @param {Object} [options]
 * @param {string} [options.icon='🍃'] - a single emoji, per docs/DESIGN_SYSTEM.md §7
 * @param {string} [options.title=''] - short headline
 * @param {string} [options.message=''] - supporting text
 * @param {{label:string, onClick:() => void}} [options.action] - optional call-to-action button
 * @returns {HTMLElement}
 */
export function createEmptyState(options = {}) {
  const { icon = '🍃', title = '', message = '', action = null } = options;

  const el = createEl('div', { classes: ['empty-state'] });

  el.appendChild(createEl('div', {
    classes: ['empty-state__icon'],
    attrs: { 'aria-hidden': 'true' },
    text: icon
  }));

  if (title) {
    el.appendChild(createEl('h2', { classes: ['empty-state__title'], text: title }));
  }

  if (message) {
    el.appendChild(createEl('p', { classes: ['empty-state__message'], text: message }));
  }

  if (action && action.label) {
    const btn = createEl('button', {
      classes: ['btn', 'btn--secondary'],
      attrs: { type: 'button' },
      text: action.label
    });
    if (typeof action.onClick === 'function') {
      btn.addEventListener('click', action.onClick);
    }
    el.appendChild(btn);
  }

  return el;
}

/**
 * Convenience helper: clears `container` and renders an empty
 * state into it in one call.
 *
 * @param {Element} container
 * @param {Object} [options] - see createEmptyState()
 */
export function renderEmptyState(container, options = {}) {
  container.innerHTML = '';
  container.appendChild(createEmptyState(options));
}
