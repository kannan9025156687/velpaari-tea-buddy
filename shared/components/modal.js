/**
 * =============================================================
 * modal.js
 * -------------------------------------------------------------
 * Framework-free generic modal shell, shared by both customer/
 * and admin/. Renders a title, arbitrary content, and an actions
 * row of buttons — no business logic, no knowledge of orders,
 * carts, or menus. dialog.js builds confirm/cancel dialogs on top
 * of this module rather than duplicating overlay/panel/focus
 * handling.
 *
 * Usage:
 *   import { openModal } from '/shared/components/modal.js';
 *   const handle = openModal({
 *     title: 'Full Menu',
 *     content: someHtmlStringOrNode,
 *     actions: [{ label: 'Close', variant: 'secondary', onClick: () => handle.close() }]
 *   });
 * =============================================================
 */

import { createEl, on } from '/shared/utils/domHelpers.js';

/** @type {{close:() => void}|null} the currently open modal, if any (only one at a time) */
let activeModal = null;

/**
 * @typedef {Object} ModalAction
 * @property {string} label
 * @property {'primary'|'secondary'|'danger'} [variant='secondary']
 * @property {() => void} [onClick]
 */

/**
 * Open a modal dialog.
 *
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string|Node} [options.content] - HTML string (caller is responsible for escaping any untrusted text, same contract as domHelpers.createEl's `html` option) or a DOM Node
 * @param {ModalAction[]} [options.actions]
 * @param {boolean} [options.dismissible=true] - whether clicking the overlay or pressing Escape closes it
 * @param {() => void} [options.onClose] - called whenever the modal closes, for any reason
 * @returns {{close: () => void, panel: HTMLElement, overlay: HTMLElement}}
 */
export function openModal(options = {}) {
  const {
    title = '',
    content = '',
    actions = [],
    dismissible = true,
    onClose = null
  } = options;

  // Only one modal at a time — close any existing one first.
  if (activeModal) {
    activeModal.close();
  }

  const overlay = createEl('div', {
    classes: ['modal-overlay'],
    attrs: { role: 'presentation' }
  });

  const panel = createEl('div', {
    classes: ['modal-panel'],
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' }
  });

  if (title) {
    panel.appendChild(createEl('h2', { classes: ['modal-panel__title'], text: title }));
  }

  const body = createEl('div', { classes: ['modal-panel__body'] });
  if (typeof content === 'string') {
    if (content) body.innerHTML = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }
  panel.appendChild(body);

  if (actions.length) {
    const actionsRow = createEl('div', { classes: ['modal-panel__actions'] });
    actions.forEach((action) => {
      const btn = createEl('button', {
        classes: ['btn', `btn--${action.variant || 'secondary'}`],
        attrs: { type: 'button' },
        text: action.label
      });
      on(btn, 'click', () => {
        if (typeof action.onClick === 'function') action.onClick();
      });
      actionsRow.appendChild(btn);
    });
    panel.appendChild(actionsRow);
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Move focus into the modal for keyboard/screen-reader users (docs/DESIGN_SYSTEM.md §16.9).
  requestAnimationFrame(() => {
    const focusable = panel.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  });

  function handleKeydown(event) {
    if (event.key === 'Escape' && dismissible) close();
  }
  document.addEventListener('keydown', handleKeydown);

  let unsubscribeOverlayClick = null;
  if (dismissible) {
    unsubscribeOverlayClick = on(overlay, 'click', (event) => {
      if (event.target === overlay) close();
    });
  }

  function close() {
    document.removeEventListener('keydown', handleKeydown);
    if (unsubscribeOverlayClick) unsubscribeOverlayClick();

    overlay.classList.add('modal-overlay--leaving');
    setTimeout(() => overlay.remove(), 200);

    if (activeModal && activeModal.close === close) {
      activeModal = null;
    }
    if (typeof onClose === 'function') onClose();
  }

  const handle = { close, panel, overlay };
  activeModal = handle;
  return handle;
}

/**
 * Close whatever modal is currently open, if any. Safe to call
 * even when no modal is open.
 */
export function closeActiveModal() {
  if (activeModal) activeModal.close();
}
