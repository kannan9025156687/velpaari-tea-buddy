/**
 * =============================================================
 * domHelpers.js
 * -------------------------------------------------------------
 * Small, generic, framework-free DOM utility functions. Every
 * function here is pure with respect to application state — none
 * of them know about orders, carts, menus, or any other business
 * concept. They exist so pages/components (Phase 4+) don't each
 * reinvent element creation, querying, and event binding.
 * =============================================================
 */

/**
 * Query a single element, optionally scoped to a parent.
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {Element|null}
 */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Query all matching elements, optionally scoped to a parent.
 * Returns a real Array (not a NodeList), so .map/.filter work.
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {Element[]}
 */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Create a DOM element with attributes, class names, inner HTML,
 * and/or child nodes in one call.
 *
 * @param {string} tag - element tag name, e.g. 'div'
 * @param {Object} [options]
 * @param {Object<string,string>} [options.attrs] - attributes to set (excluding class)
 * @param {string|string[]} [options.classes] - class name(s) to add
 * @param {string} [options.html] - innerHTML to set (caller is responsible for escaping)
 * @param {string} [options.text] - textContent to set (safe, escaped automatically by the DOM)
 * @param {(Node|string)[]} [options.children] - child nodes/strings to append
 * @returns {HTMLElement}
 */
export function createEl(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value);
    }
  }

  if (options.classes) {
    const classList = Array.isArray(options.classes) ? options.classes : [options.classes];
    el.classList.add(...classList.filter(Boolean));
  }

  if (typeof options.html === 'string') {
    el.innerHTML = options.html;
  }

  if (typeof options.text === 'string') {
    el.textContent = options.text;
  }

  if (Array.isArray(options.children)) {
    for (const child of options.children) {
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }

  return el;
}

/**
 * Escape a string for safe insertion as HTML text content.
 * Use this whenever untrusted or user-supplied text must be
 * placed into an innerHTML string (e.g. building a chat bubble).
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/**
 * Remove all child nodes from an element.
 * @param {Element} el
 */
export function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Attach an event listener and return an unsubscribe function,
 * so callers don't need to keep the original handler reference
 * around just to remove it later.
 * @param {EventTarget} target
 * @param {string} type
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean|AddEventListenerOptions} [options]
 * @returns {() => void} unsubscribe function
 */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/**
 * Toggle a class on an element, optionally forcing on/off.
 * @param {Element} el
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(el, className, force) {
  el.classList.toggle(className, force);
}

/**
 * Run a callback once the DOM is ready. If it already is, runs
 * synchronously on the next microtask rather than immediately, so
 * callers get consistent async behavior either way.
 * @param {() => void} callback
 */
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    Promise.resolve().then(callback);
  }
}

/**
 * Scroll a scrollable container to its bottom, on the next
 * animation frame (so it runs after the DOM has updated).
 * @param {Element} scrollContainer
 */
export function scrollToBottom(scrollContainer) {
  requestAnimationFrame(() => {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  });
}
