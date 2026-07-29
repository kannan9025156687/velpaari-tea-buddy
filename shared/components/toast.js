/**
 * =============================================================
 * toast.js
 * -------------------------------------------------------------
 * Framework-free toast notification component, shared by both
 * customer/ and admin/. No business logic — callers supply the
 * message and type; this module only knows how to render and
 * auto-dismiss a notification.
 *
 * Usage:
 *   import { showToast } from '/shared/components/toast.js';
 *   const { dismiss } = showToast('Order saved!', { type: 'success' });
 *
 * Styling lives in shared/components/components.css — every color
 * used there is a theme token (var(--success), var(--danger),
 * etc.), never a hardcoded value, so this renders correctly in
 * both apps regardless of which app's theme.css is active.
 * =============================================================
 */

import { createEl, on } from '/shared/utils/domHelpers.js';

const CONTAINER_ID = 'toast-container';

/** @type {Object<string,string>} icon shown per toast type */
const TOAST_ICONS = {
  success: '✅',
  error: '⚠️',
  warning: '⚠️',
  info: 'ℹ️'
};

/**
 * Get (or lazily create) the single toast container appended to
 * <body>. Only one container ever exists per page.
 * @returns {HTMLElement}
 */
function getContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = createEl('div', {
      attrs: { id: CONTAINER_ID, 'aria-live': 'polite', 'aria-atomic': 'false' },
      classes: ['toast-container']
    });
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 *
 * @param {string} message - plain text (rendered as textContent, safe from injection)
 * @param {Object} [options]
 * @param {'success'|'error'|'warning'|'info'} [options.type='info']
 * @param {number} [options.duration=3500] - ms before auto-dismiss; 0 disables auto-dismiss
 * @param {boolean} [options.dismissible=true] - whether to show a manual close button
 * @returns {{dismiss: () => void, element: HTMLElement}}
 */
export function showToast(message, options = {}) {
  const { type = 'info', duration = 3500, dismissible = true } = options;
  const container = getContainer();

  const toastEl = createEl('div', {
    classes: ['toast', `toast--${type}`],
    attrs: { role: type === 'error' ? 'alert' : 'status' }
  });

  toastEl.appendChild(createEl('span', {
    classes: ['toast__icon'],
    attrs: { 'aria-hidden': 'true' },
    text: TOAST_ICONS[type] || TOAST_ICONS.info
  }));

  toastEl.appendChild(createEl('span', {
    classes: ['toast__message'],
    text: message
  }));

  let dismissTimeoutId = null;

  function dismiss() {
    if (dismissTimeoutId) clearTimeout(dismissTimeoutId);
    toastEl.classList.add('toast--leaving');
    setTimeout(() => toastEl.remove(), 200);
  }

  if (dismissible) {
    const closeBtn = createEl('button', {
      classes: ['toast__close'],
      attrs: { type: 'button', 'aria-label': 'Dismiss notification' },
      text: '✕'
    });
    on(closeBtn, 'click', dismiss);
    toastEl.appendChild(closeBtn);
  }

  container.appendChild(toastEl);

  if (duration > 0) {
    dismissTimeoutId = setTimeout(dismiss, duration);
  }

  return { dismiss, element: toastEl };
}

/**
 * Remove every currently visible toast immediately.
 */
export function clearToasts() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) container.innerHTML = '';
}
