/**
 * =============================================================
 * dialog.js
 * -------------------------------------------------------------
 * Confirm/cancel dialogs, shared by both customer/ and admin/
 * (e.g. "Remove item?" in the customer cart, a destructive action
 * confirmation in admin). Built on top of modal.js rather than
 * duplicating overlay/focus/Escape handling.
 *
 * Usage:
 *   import { confirmDialog } from '/shared/components/dialog.js';
 *   const confirmed = await confirmDialog({
 *     title: 'Remove item?',
 *     message: 'This will remove it from your cart.',
 *     danger: true
 *   });
 *   if (confirmed) { ... }
 * =============================================================
 */

import { openModal } from '/shared/components/modal.js';
import { escapeHtml } from '/shared/utils/domHelpers.js';

/**
 * Show a confirm/cancel dialog and resolve with the user's choice.
 *
 * @param {Object} [options]
 * @param {string} [options.title='Are you sure?']
 * @param {string} [options.message] - plain text, escaped automatically before rendering
 * @param {string} [options.confirmLabel='Confirm']
 * @param {string} [options.cancelLabel='Cancel']
 * @param {boolean} [options.danger=false] - styles the confirm button as a destructive action
 * @returns {Promise<boolean>} resolves true if confirmed, false if cancelled or dismissed
 */
export function confirmDialog(options = {}) {
  const {
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false
  } = options;

  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const handle = openModal({
      title,
      content: message ? `<p>${escapeHtml(message)}</p>` : '',
      dismissible: true,
      // Covers Escape / overlay-click dismissal, which counts as "cancel".
      onClose: () => settle(false),
      actions: [
        {
          label: cancelLabel,
          variant: 'secondary',
          onClick: () => {
            settle(false);
            handle.close();
          }
        },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          onClick: () => {
            settle(true);
            handle.close();
          }
        }
      ]
    });
  });
}
