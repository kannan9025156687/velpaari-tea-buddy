/**
 * =============================================================
 * statWidget.js
 * -------------------------------------------------------------
 * The dashboard's stat card component. ONE generic render
 * function serves every widget in dashboardStats.js's registry —
 * "every dashboard card must be an independent component" (Phase
 * 6 rule 2) is satisfied by each returned card being a
 * self-contained element with no dependency on its neighbors or
 * on dashboardPage.js's internals, not by needing a bespoke file
 * per stat.
 *
 * No data fetching, no business math — this module only turns
 * `(widgetDef, value)` into a DOM element. dashboardStats.js
 * decides what the widgets ARE and what their values mean;
 * dashboardPage.js decides WHEN to render them.
 * =============================================================
 */

import { createEl } from '/shared/utils/domHelpers.js';
import { createSkeleton } from '/shared/components/loader.js';

/**
 * Render one stat card with a resolved value.
 * @param {import('./dashboardStats.js').DashboardWidgetDef} widgetDef
 * @param {string} value - already formatted via widgetDef.formatValue(stats)
 * @returns {HTMLElement}
 */
export function renderStatWidget(widgetDef, value) {
  const card = createEl('div', { classes: ['stat-card'] });
  card.appendChild(createEl('div', {
    classes: ['stat-card__label'],
    text: `${widgetDef.icon} ${widgetDef.label}`
  }));
  card.appendChild(createEl('div', {
    classes: ['stat-card__value'],
    text: value
  }));
  return card;
}

/**
 * Render a stat card in its loading state (label visible, value
 * replaced with a skeleton block) — shown while
 * orderAdminService.getDashboardStats() is in flight.
 * @param {import('./dashboardStats.js').DashboardWidgetDef} widgetDef
 * @returns {HTMLElement}
 */
export function renderStatWidgetSkeleton(widgetDef) {
  const card = createEl('div', { classes: ['stat-card'] });
  card.appendChild(createEl('div', {
    classes: ['stat-card__label'],
    text: `${widgetDef.icon} ${widgetDef.label}`
  }));
  card.appendChild(createSkeleton({ width: '60%', height: '22px' }));
  return card;
}
