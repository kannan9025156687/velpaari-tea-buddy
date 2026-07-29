/**
 * =============================================================
 * router.js (customer)
 * -------------------------------------------------------------
 * A small, generic, hash-based router. Knows nothing about the
 * customer app's actual pages — it only matches path patterns to
 * registered handler functions and manages hash-change navigation.
 * Page modules (Phase 5) will import config/routes.js's
 * CUSTOMER_ROUTES constants and call router.register(path, handler).
 *
 * Per docs/ARCHITECTURE.md, admin/js/router.js is an intentionally
 * separate, independent copy of this same generic capability
 * (router.js is listed per-app in the locked folder structure, not
 * under shared/) — both are equally generic today, which leaves
 * room for the two apps' routing needs to diverge later (e.g. the
 * admin app's `/orders/:id` param route) without one app's changes
 * affecting the other.
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
        // escape regex-special characters in literal segments
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
   * @param {string} path - e.g. '/chat'
   */
  navigate(path) {
    const targetHash = `#${path}`;
    if (window.location.hash === targetHash) {
      // already there — re-dispatch anyway so the handler can react
      // to being "navigated to" again (e.g. resetting a page's state)
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
