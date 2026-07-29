/**
 * =============================================================
 * router.js (admin)
 * -------------------------------------------------------------
 * A small, generic, hash-based router. Knows nothing about the
 * admin app's actual pages — it only matches path patterns to
 * registered handler functions and manages hash-change navigation.
 * Page modules (Phase 6) will import config/routes.js's
 * ADMIN_ROUTES constants and call router.register(path, handler),
 * including the dynamic `/orders/:id` pattern for the order-detail
 * page.
 *
 * This is an intentionally independent copy of the same generic
 * router capability as customer/js/router.js — per
 * docs/ARCHITECTURE.md's locked folder structure, router.js is
 * defined per-app, not under shared/, so each app's routing
 * behavior can evolve independently if a future need arises.
 * =============================================================
 */

/**
 * @typedef {Object<string,string>} RouteParams
 */

export class Router {
  constructor() {
    /** @type {Array<{pattern:string, regex:RegExp, paramNames:string[], handler:(params:RouteParams)=>void}>} */
    this._routes = [];

    /** @type {((path:string)=>void)|null} */
    this._notFoundHandler = null;

    /** @type {(() => void)|null} unsubscribe function for the hashchange listener */
    this._unsubscribe = null;
  }

  /**
   * Register a handler for a path pattern. Supports a single
   * dynamic segment style: `/orders/:id` — anything else in the
   * pattern is matched literally.
   *
   * @param {string} pattern - e.g. '/dashboard' or '/orders/:id'
   * @param {(params:RouteParams)=>void} handler
   */
  register(pattern, handler) {
    const paramNames = [];
    const regexSource = pattern
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');

    const regex = new RegExp(`^${regexSource}$`);
    this._routes.push({ pattern, regex, paramNames, handler });
  }

  /**
   * Register a fallback handler invoked when no registered route
   * matches the current path. Optional — if never set, an
   * unmatched path simply logs a warning (see _dispatch()).
   * @param {(path:string)=>void} handler
   */
  notFound(handler) {
    this._notFoundHandler = handler;
  }

  /**
   * Navigate to a new path by updating the URL hash. Does nothing
   * if already on that path.
   * @param {string} path - e.g. '/orders/TB-20260725-0001'
   */
  navigate(path) {
    const targetHash = `#${path}`;
    if (window.location.hash === targetHash) {
      this._dispatch();
      return;
    }
    window.location.hash = targetHash;
  }

  /**
   * Replace the current history entry's path without pushing a new
   * one (useful for redirects, e.g. an empty hash → default route).
   * @param {string} path
   */
  replace(path) {
    const url = `${window.location.pathname}${window.location.search}#${path}`;
    window.history.replaceState(null, '', url);
    this._dispatch();
  }

  /**
   * Begin listening for hash changes and dispatch the current
   * path immediately. Call once during app bootstrap.
   */
  start() {
    this._unsubscribe = (() => {
      const listener = () => this._dispatch();
      window.addEventListener('hashchange', listener);
      return () => window.removeEventListener('hashchange', listener);
    })();

    this._dispatch();
  }

  /**
   * Stop listening for hash changes. Mainly useful for tests or
   * hot-teardown scenarios.
   */
  stop() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Read the current hash, find a matching registered route, and
   * invoke its handler with any extracted params. Falls back to
   * the notFound handler (or a console warning) if nothing matches.
   * @private
   */
  _dispatch() {
    const path = (window.location.hash || '').replace(/^#/, '') || '/';

    for (const route of this._routes) {
      const match = path.match(route.regex);
      if (match) {
        /** @type {RouteParams} */
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        route.handler(params);
        return;
      }
    }

    if (this._notFoundHandler) {
      this._notFoundHandler(path);
    } else {
      console.warn(`[Router] No route registered for path: "${path}"`);
    }
  }
}
