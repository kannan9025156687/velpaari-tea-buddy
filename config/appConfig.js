/**
 * =============================================================
 * appConfig.js
 * -------------------------------------------------------------
 * Environment-level configuration. This is the ONE file that
 * changes as the project moves between phases/environments:
 *
 *   - STORAGE_MODE flips from 'localStorage' to 'appsScript' in
 *     Phase 10 — that single line is the entire backend cutover,
 *     per docs/ARCHITECTURE.md §4.
 *   - APPS_SCRIPT_URL is populated once the Web App is deployed
 *     in Phase 9 (docs/DEPLOYMENT.md Part B).
 *
 * There is no bundler and no .env file in this project (see
 * docs/DEPLOYMENT.md Part A5 for why) — this plain, committed
 * module IS the environment configuration.
 *
 * Nothing in this file is business data (menu, pricing, branding)
 * — that lives in businessConfig.js. This file is infrastructure
 * only.
 * =============================================================
 */

import { STORAGE_MODES } from '/config/constants.js';

/**
 * Which storage/backend adapter shared/services/storage.js should
 * delegate to. Must be one of STORAGE_MODES from constants.js.
 *
 * Default is 'localStorage' — the mock-data-capable adapter used
 * throughout Phases 1–8, per the locked architecture's
 * frontend-first build order.
 * @type {string}
 */
export const STORAGE_MODE = STORAGE_MODES.LOCAL;

/**
 * The deployed Google Apps Script Web App URL (the `/exec`
 * endpoint). Intentionally empty until Phase 9/10 — populated
 * only once a real backend has been deployed per
 * docs/DEPLOYMENT.md Part B. Left blank rather than a fake
 * placeholder URL so that any accidental early use fails loudly
 * (see shared/services/apiClient.js) instead of silently
 * pointing at a URL that doesn't exist.
 * @type {string}
 */
export const APPS_SCRIPT_URL = '';

/**
 * Default timeout, in milliseconds, for any outbound HTTP request
 * made via shared/services/apiClient.js.
 * @type {number}
 */
export const REQUEST_TIMEOUT_MS = 8000;

/**
 * Number of automatic retries apiClient.js performs after an
 * initial request times out or fails with a network error, before
 * surfacing the failure to the caller. Per docs/API_CONTRACT.md §6.
 * @type {number}
 */
export const REQUEST_RETRY_COUNT = 1;

/**
 * How often (milliseconds) the admin app's notification service
 * polls for new orders once it exists (Phase 6+). Defined here now
 * so it is available wherever needed without a later config change.
 * @type {number}
 */
export const ADMIN_POLL_INTERVAL_MS = 10000;

/**
 * Best-effort runtime environment detection, used only for
 * non-critical diagnostics (e.g. console log verbosity). Never
 * used to gate business logic or security decisions — the backend
 * validation described in docs/ARCHITECTURE.md §5 is the real
 * trust boundary, not this flag.
 * @type {'development'|'production'}
 */
export const APP_ENV = (
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
) ? 'development' : 'production';
