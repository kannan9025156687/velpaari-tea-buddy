/**
 * =============================================================
 * storageBootstrap.js
 * -------------------------------------------------------------
 * The single place that decides WHICH storage adapter gets
 * registered with shared/services/storage.js, based on
 * config/appConfig.js's STORAGE_MODE. Both customer/js/main.js and
 * admin/js/main.js call initStorage() once, at the very top of
 * their boot sequence, before anything that might call storage.js
 * runs.
 *
 * This is intentionally the ONLY file that imports a concrete
 * adapter (localStorageAdapter.js today; appsScriptAdapter.js and
 * firebaseAdapter.js in later phases). storage.js itself never
 * imports any adapter — see storage.js's header comment on
 * dependency injection.
 * =============================================================
 */

import { STORAGE_MODE } from '/config/appConfig.js';
import { STORAGE_MODES } from '/config/constants.js';
import { setAdapter } from './storage.js';
import { localStorageAdapter } from './adapters/localStorageAdapter.js';

let hasInitialized = false;

/**
 * Register the adapter matching config/appConfig.js's STORAGE_MODE.
 * Safe to call more than once — only the first call has any effect,
 * so both main.js files (or a page re-importing this module) never
 * accidentally register two adapters in sequence.
 */
export function initStorage() {
  if (hasInitialized) return;
  hasInitialized = true;

  switch (STORAGE_MODE) {
    case STORAGE_MODES.LOCAL:
      setAdapter(localStorageAdapter);
      break;

    case STORAGE_MODES.APPS_SCRIPT:
      // Wired in a later phase once backend/ and
      // shared/services/adapters/appsScriptAdapter.js exist.
      console.warn('[storageBootstrap] STORAGE_MODE is "appsScript" but no Apps Script backend has been implemented yet — no adapter registered.');
      break;

    case STORAGE_MODES.FIREBASE:
      // Wired in a later phase once
      // shared/services/adapters/firebaseAdapter.js is implemented.
      console.warn('[storageBootstrap] STORAGE_MODE is "firebase" but no Firebase adapter has been implemented yet — no adapter registered.');
      break;

    default:
      console.warn(`[storageBootstrap] Unrecognized STORAGE_MODE "${STORAGE_MODE}" — no adapter registered.`);
  }
}
