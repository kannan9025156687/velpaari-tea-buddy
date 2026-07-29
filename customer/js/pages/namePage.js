/**
 * =============================================================
 * namePage.js
 * -------------------------------------------------------------
 * PRESENTATION ONLY. Renders the name-entry screen and reports a
 * valid submission via a callback — it does not store the name
 * anywhere itself (not in customerSession.js, not in storage.js)
 * and does not navigate. Whatever wires pages together decides
 * what onSubmit(name) does with the value.
 *
 * Contains no business/branding data — the copy here ("What
 * should we call you?") is generic UI text, not something
 * config/businessConfig.js governs.
 *
 * Usage:
 *   import { renderNamePage } from './pages/namePage.js';
 *   const destroy = renderNamePage(document.getElementById('app'), {
 *     onSubmit: (name) => console.log('submitted', name)
 *   });
 * =============================================================
 */

import { createEl, on, empty } from '/shared/utils/domHelpers.js';

/**
 * @param {Element} container - element to render into (its existing contents are cleared)
 * @param {Object} [options]
 * @param {(name: string) => void} [options.onSubmit] - called with the trimmed, non-empty name
 * @returns {() => void} destroy function — call when navigating away from this page
 */
export function renderNamePage(container, { onSubmit } = {}) {
  empty(container);

  const screen = createEl('div', { classes: ['screen', 'is-active'] });
  const card = createEl('div', { classes: ['glass-card', 'name-card'] });
  const stack = createEl('div', { classes: ['stack'] });

  stack.appendChild(createEl('div', {
    classes: ['logo-orb', 'logo-orb--small'],
    attrs: { 'aria-hidden': 'true' },
    text: '👋'
  }));

  stack.appendChild(createEl('h2', { text: 'What should we call you?' }));

  const nameLabel = createEl('label', {
    classes: ['sr-only'],
    attrs: { for: 'name-input-field' },
    text: 'Your name'
  });
  const nameInput = createEl('input', {
    classes: ['text-input'],
    attrs: {
      id: 'name-input-field',
      type: 'text',
      placeholder: 'e.g. Kannan',
      autocomplete: 'off'
    }
  });

  stack.appendChild(nameLabel);
  stack.appendChild(nameInput);

  const continueButton = createEl('button', {
    classes: ['btn', 'btn--primary', 'btn--block'],
    attrs: { type: 'button' },
    text: 'Continue 🚀'
  });
  stack.appendChild(continueButton);

  function submit() {
    const value = nameInput.value.trim();
    if (!value) {
      nameInput.focus();
      return;
    }
    if (typeof onSubmit === 'function') onSubmit(value);
  }

  const unsubscribeClick = on(continueButton, 'click', submit);
  const unsubscribeKeydown = on(nameInput, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });

  card.appendChild(stack);
  screen.appendChild(card);
  container.appendChild(screen);

  // Focus the input once it's actually in the DOM.
  setTimeout(() => nameInput.focus(), 250);

  return function destroy() {
    unsubscribeClick();
    unsubscribeKeydown();
    empty(container);
  };
}
