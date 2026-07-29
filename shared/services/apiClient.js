/**
 * =============================================================
 * apiClient.js
 * -------------------------------------------------------------
 * A generic, backend-agnostic HTTP client: timeout handling, a
 * single automatic retry on network failure, and a normalized
 * response envelope matching docs/API_CONTRACT.md §1/§6.
 *
 * This module knows nothing about Apps Script, Google Sheets, or
 * orders. It is used exclusively by
 * shared/services/adapters/appsScriptAdapter.js, which does not
 * exist yet (built in Phase 9/10). No other file should import
 * apiClient.js directly — pages and business-logic services talk
 * to shared/services/storage.js instead.
 *
 * Per docs/API_CONTRACT.md §4, requests to the eventual Apps
 * Script Web App use GET with query parameters, or POST with a
 * `text/plain` body (never `application/json`), specifically to
 * avoid a CORS preflight request that an Apps Script Web App
 * cannot answer. This client supports both shapes generically.
 * =============================================================
 */

import { REQUEST_TIMEOUT_MS, REQUEST_RETRY_COUNT } from '/config/appConfig.js';
import { ERROR_CODES } from '/config/constants.js';

/**
 * Build a successful response envelope.
 * @param {*} data
 * @returns {{success:true, data:*, error:null}}
 */
function ok(data) {
  return { success: true, data, error: null };
}

/**
 * Build a failed response envelope.
 * @param {string} code
 * @param {string} message
 * @returns {{success:false, data:null, error:{code:string,message:string}}}
 */
function fail(code, message) {
  return { success: false, data: null, error: { code, message } };
}

/**
 * Perform a single fetch attempt with a timeout, using
 * AbortController so a hung request doesn't wait forever.
 * @param {string} url
 * @param {RequestInit} fetchOptions
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Core request function: attempts the request, retries once on
 * failure/timeout (per REQUEST_RETRY_COUNT), and always resolves
 * (never rejects) with the standard response envelope.
 *
 * @param {string} url
 * @param {RequestInit} [fetchOptions={}]
 * @param {Object} [config]
 * @param {number} [config.timeoutMs=REQUEST_TIMEOUT_MS]
 * @param {number} [config.retries=REQUEST_RETRY_COUNT]
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export async function request(url, fetchOptions = {}, config = {}) {
  const timeoutMs = config.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxRetries = config.retries ?? REQUEST_RETRY_COUNT;

  let attempt = 0;
  let lastErrorMessage = 'Request failed.';

  while (attempt <= maxRetries) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeoutMs);

      if (!response.ok) {
        lastErrorMessage = `Request failed with status ${response.status}.`;
        attempt += 1;
        continue;
      }

      const text = await response.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        return fail(ERROR_CODES.UNKNOWN_ERROR, 'Response was not valid JSON.');
      }

      return ok(parsed);
    } catch (err) {
      lastErrorMessage = (err && err.name === 'AbortError')
        ? 'Request timed out.'
        : (err && err.message) || 'Network error.';
      attempt += 1;
    }
  }

  return fail(ERROR_CODES.NETWORK_ERROR, lastErrorMessage);
}

/**
 * Convenience GET helper — appends `params` as a query string.
 * @param {string} baseUrl
 * @param {Object<string,string|number>} [params]
 * @param {Object} [config] - see request()'s config parameter
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export function get(baseUrl, params = {}, config = {}) {
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) acc[key] = String(value);
      return acc;
    }, {})
  ).toString();

  const url = query ? `${baseUrl}?${query}` : baseUrl;
  return request(url, { method: 'GET' }, config);
}

/**
 * Convenience POST helper — sends `payload` as a JSON-encoded
 * `text/plain` body, per the CORS-preflight-avoidance note above.
 * @param {string} url
 * @param {Object} payload
 * @param {Object} [config] - see request()'s config parameter
 * @returns {Promise<{success:boolean,data:*,error:Object|null}>}
 */
export function post(url, payload, config = {}) {
  return request(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    },
    config
  );
}
