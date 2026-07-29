/**
 * =============================================================
 * welcomePage.js
 * -------------------------------------------------------------
 * PRESENTATION ONLY. Renders the welcome screen and reports the
 * "Start Ordering" tap via a callback — it does not navigate, does
 * not touch storage.js, and does not know config/routes.js exists.
 * Whatever wires pages together (a later phase) decides what
 * onStart() actually does (e.g. router.navigate(...)).
 *
 * Branding text (business name, tagline, logo) comes ONLY from
 * config/businessConfig.js — nothing brand-specific is hardcoded
 * here, so this page is reusable as-is for any business built on
 * this platform.
 *
 * Usage:
 *   import { renderWelcomePage } from './pages/welcomePage.js';
 *   const destroy = renderWelcomePage(document.getElementById('app'), {
 *     onStart: () => console.log('start tapped')
 *   });
 * =============================================================
 */

import { createEl, on, empty } from '/shared/utils/domHelpers.js';
import { BUSINESS_CONFIG } from '/config/businessConfig.js';

/**
 * @param {Element} container - element to render into (its existing contents are cleared)
 * @param {Object} [options]
 * @param {() => void} [options.onStart] - called when the customer taps "Start Ordering"
 * @returns {() => void} destroy function — call when navigating away from this page
 */
export function renderWelcomePage(container, { onStart } = {}) {
  empty(container);

  const screen = createEl('div', { classes: ['screen', 'is-active'] });
  const card = createEl('div', { classes: ['glass-card', 'welcome-card'] });
  const stack = createEl('div', { classes: ['stack'] });

  stack.appendChild(createEl('div', {
    classes: ['logo-orb'],
    attrs: { 'aria-hidden': 'true' },
    text: BUSINESS_CONFIG.logoEmoji
  }));

  const title = createEl('h1', { classes: ['text-display'] });
  const titleAccent = createEl('span', {
    classes: ['text-display__accent'],
    text: BUSINESS_CONFIG.businessName
  });
  title.appendChild(titleAccent);
  stack.appendChild(title);

  stack.appendChild(createEl('p', {
    classes: ['text-tagline'],
    text: `${BUSINESS_CONFIG.tagline} ✨`
  }));

  const startButton = createEl('button', {
    classes: ['btn', 'btn--primary', 'btn--block'],
    attrs: { type: 'button' },
    text: 'Start Ordering 🚀'
  });
  stack.appendChild(startButton);

  stack.appendChild(createEl('p', {
    classes: ['text-meta'],
    text: 'No app install needed — just chat 💬'
  }));

  const unsubscribeStart = on(startButton, 'click', () => {
    if (typeof onStart === 'function') onStart();
  });

  card.appendChild(stack);
  screen.appendChild(card);
  container.appendChild(screen);

  return function destroy() {
    unsubscribeStart();
    empty(container);
  };
}
