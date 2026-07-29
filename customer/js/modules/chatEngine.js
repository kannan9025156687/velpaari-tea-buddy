/**
 * =============================================================
 * chatEngine.js
 * -------------------------------------------------------------
 * The conversation's state machine. This is where ALL chat flow
 * logic lives — which state follows which action, what message
 * copy and chip options each step shows, and how a menu/addon
 * item selection turns into a cart operation. chatPage.js (the
 * page) contains none of this — it only calls the methods below
 * and renders whatever they return.
 *
 * Per Phase 5's rules:
 *   - menu items, prices, and branding come ONLY from
 *     config/businessConfig.js (imported below, never duplicated)
 *   - this module never touches the DOM, storage.js, or any
 *     backend service — it is pure input → output
 *   - it never mutates a cart directly either: instead of holding
 *     or reaching into a Cart instance, every method receives the
 *     caller's current cart item ids as a plain array and returns
 *     a `cartOp` instruction describing what the caller (chatPage)
 *     should apply to its own Cart instance. This keeps the engine
 *     fully decoupled from any specific cart implementation and
 *     independently testable:
 *
 *       const engine = createChatEngine({ customerName: 'Kannan' });
 *       const { turn } = engine.start([]);
 *       // assert on turn.messages / turn.chips — no DOM, no Cart,
 *       // no page involved.
 *
 * CHECKOUT / ORDER CONFIRMATION IS INTENTIONALLY NOT IMPLEMENTED
 * YET. Per the current phase's instructions, this engine stops at
 * a clearly-labeled CHECKOUT_PENDING state once the customer taps
 * "I'm done" — it does not build an order review, a location step,
 * or call any order-placing service. That is deferred to the
 * checkout phase.
 * =============================================================
 */

import { BUSINESS_CONFIG } from '/config/businessConfig.js';
import { escapeHtml } from '/shared/utils/domHelpers.js';

/**
 * The flow's named states — the "state machine" part of this
 * module. Every method below only ever sets `state` to one of
 * these, and turn-building is driven off it, rather than the page
 * branching on ad hoc flags.
 * @readonly
 * @enum {string}
 */
const FLOW_STATES = Object.freeze({
  MAIN_MENU: 'MAIN_MENU',
  ITEM_QTY: 'ITEM_QTY',
  ADDON_SUGGEST: 'ADDON_SUGGEST',
  CHECKOUT_PENDING: 'CHECKOUT_PENDING'
});

/** @type {Object<string, Object>} fast id → item lookup, built once from menu + addons */
const ITEM_MAP = Object.freeze(
  [...BUSINESS_CONFIG.menu, ...BUSINESS_CONFIG.addons].reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

/** @type {Object<string, number>} recognized quantity words in free text */
const NUMBER_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5 });

/**
 * Conversational copy — several phrasings per moment so repeat
 * confirmations don't feel robotic. Content lives here (the flow
 * definition), never inline in chatPage.js.
 */
const CONFIRM_LINES = [
  (qty, item) => `✅ ${qty} ${item.name} Added! 🔥`,
  (qty, item) => `Nice one! ${qty} ${item.name} added 🎉`,
  (qty, item) => `Got it! ${qty} x ${item.name} in your order 😍`,
  (qty, item) => `Perfect choice! ${qty} ${item.name} added 💯`
];

const COMBO_INTROS = [
  'Would you like to add? 😋',
  'This goes perfectly with it! 🍪❤️',
  'Wanna make it a combo? 🔥',
  'One more thing… 😍'
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Build the standard main-menu chip set from businessConfig's
 * menu — the one place this mapping happens.
 * @returns {Array<{label:string, value:string, variant?:string}>}
 */
function buildMainMenuChips() {
  const chips = BUSINESS_CONFIG.menu.map((item) => ({
    label: `${item.emoji} ${item.name}`,
    value: `item_${item.id}`
  }));
  chips.push({ label: '📋 View Full Menu', value: 'view_full_menu', variant: 'ghost' });
  chips.push({ label: "✅ I'm done, checkout", value: 'finish', variant: 'accent' });
  return chips;
}

/**
 * @param {number} [max=5]
 * @returns {Array<{label:string, value:string}>}
 */
function buildQtyChips(max = 5) {
  return Array.from({ length: max }, (_, i) => ({ label: String(i + 1), value: `qty_${i + 1}` }));
}

/**
 * Build the full-menu receipt-card HTML from businessConfig.
 * @returns {string}
 */
function buildFullMenuCardHtml() {
  const menuRows = BUSINESS_CONFIG.menu
    .map((item) => `<div class="receipt-card__row"><span>${item.emoji} ${item.name} (${item.serves} Serves)</span><span>${BUSINESS_CONFIG.currency}${item.price}</span></div>`)
    .join('');
  const addonRows = BUSINESS_CONFIG.addons
    .map((item) => `<div class="receipt-card__row"><span>${item.emoji} ${item.name}</span><span>${BUSINESS_CONFIG.currency}${item.price}</span></div>`)
    .join('');

  return (
    `<div class="receipt-card__title">📋 Our Menu</div>` +
    menuRows +
    addonRows +
    `<div class="receipt-card__meta" style="margin-top:8px;">${escapeHtml(BUSINESS_CONFIG.serviceNote)}</div>`
  );
}

/**
 * Pick an addon to suggest that isn't already in the cart.
 * @param {string[]} cartItemIds
 * @returns {Object|null}
 */
function pickAddonSuggestion(cartItemIds) {
  const candidates = BUSINESS_CONFIG.addons.filter((addon) => !cartItemIds.includes(addon.id));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Extract a quantity from free text: a digit, or one of the
 * recognized number words. Returns null if none found.
 * @param {string} normalizedText - already-lowercased text
 * @returns {number|null}
 */
function extractQuantity(normalizedText) {
  const digitMatch = normalizedText.match(/\d+/);
  if (digitMatch) return parseInt(digitMatch[0], 10);
  for (const word in NUMBER_WORDS) {
    if (normalizedText.includes(word)) return NUMBER_WORDS[word];
  }
  return null;
}

/**
 * Find a menu/addon item mentioned by id or name in free text.
 * @param {string} normalizedText - already-lowercased text
 * @returns {Object|null}
 */
function findItemByText(normalizedText) {
  for (const item of Object.values(ITEM_MAP)) {
    if (normalizedText.includes(item.id) || normalizedText.includes(item.name.toLowerCase())) {
      return item;
    }
  }
  return null;
}

/**
 * @typedef {Object} ChatMessage
 * @property {'text'|'card'} type
 * @property {string} html
 */

/**
 * @typedef {Object} ChatChip
 * @property {string} label
 * @property {string} value
 * @property {string} [variant]
 */

/**
 * @typedef {Object} ChatTurn
 * @property {ChatMessage[]} messages - one or more bot messages/cards to show in sequence
 * @property {ChatChip[]} chips - options to present after the messages (may be empty)
 */

/**
 * @typedef {Object} CartOp
 * @property {'add'} type
 * @property {string} id
 * @property {number} qty
 */

/**
 * @typedef {Object} EngineResult
 * @property {ChatTurn} turn
 * @property {CartOp|null} cartOp - an operation the caller should apply to its own Cart instance, or null
 */

/**
 * Create a new, independent chat engine instance.
 * @param {Object} [options]
 * @param {string} [options.customerName='']
 * @returns {{
 *   start: (cartItemIds?:string[]) => EngineResult,
 *   handleAction: (value:string, cartItemIds?:string[]) => EngineResult,
 *   handleText: (text:string, cartItemIds?:string[]) => EngineResult,
 *   getCurrentState: () => string
 * }}
 */
export function createChatEngine({ customerName = '' } = {}) {
  let state = FLOW_STATES.MAIN_MENU;
  let pendingItemId = null;

  /** @returns {ChatTurn} */
  function anythingElseTurn() {
    state = FLOW_STATES.MAIN_MENU;
    return { messages: [{ type: 'text', html: 'Anything else? 😊' }], chips: buildMainMenuChips() };
  }

  /** @returns {ChatTurn} */
  function unknownTurn() {
    const chips = state === FLOW_STATES.ITEM_QTY && pendingItemId
      ? buildQtyChips()
      : buildMainMenuChips();
    return {
      messages: [{ type: 'text', html: "Hmm, didn't quite get that 😅 Try tapping one of the options below!" }],
      chips
    };
  }

  /**
   * @param {string} id
   * @returns {EngineResult}
   */
  function askQty(id) {
    const item = ITEM_MAP[id];
    if (!item) return { turn: unknownTurn(), cartOp: null };

    pendingItemId = id;
    state = FLOW_STATES.ITEM_QTY;

    const priceLine = item.serves
      ? `Price ${BUSINESS_CONFIG.currency}${item.price} · ${item.serves} Serves`
      : `${BUSINESS_CONFIG.currency}${item.price}`;

    return {
      turn: {
        messages: [{ type: 'text', html: `${item.emoji} <b>${escapeHtml(item.name)}</b><br>${priceLine}<br>How many would you like? 😋` }],
        chips: buildQtyChips()
      },
      cartOp: null
    };
  }

  /**
   * @param {number} qty
   * @param {string[]} cartItemIds
   * @returns {EngineResult}
   */
  function handleQtySelected(qty, cartItemIds) {
    if (!pendingItemId || !Number.isFinite(qty) || qty <= 0) {
      return { turn: unknownTurn(), cartOp: null };
    }

    const id = pendingItemId;
    const item = ITEM_MAP[id];
    pendingItemId = null;

    const confirmLine = pickRandom(CONFIRM_LINES)(qty, item);
    const cartOp = { type: 'add', id, qty };

    if (item.category === 'drink') {
      const projectedCartIds = cartItemIds.includes(id) ? cartItemIds : [...cartItemIds, id];
      const suggestion = pickAddonSuggestion(projectedCartIds);
      if (suggestion) {
        state = FLOW_STATES.ADDON_SUGGEST;
        return {
          turn: {
            messages: [
              { type: 'text', html: confirmLine },
              { type: 'text', html: `${pickRandom(COMBO_INTROS)}<br>${suggestion.emoji} <b>${escapeHtml(suggestion.name)}</b> — ${BUSINESS_CONFIG.currency}${suggestion.price}` }
            ],
            chips: [
              { label: `Add ${suggestion.emoji}`, value: `addon_add_${suggestion.id}`, variant: 'accent' },
              { label: 'Skip 🙅', value: 'addon_skip' }
            ]
          },
          cartOp
        };
      }
    }

    state = FLOW_STATES.MAIN_MENU;
    return {
      turn: {
        messages: [
          { type: 'text', html: confirmLine },
          { type: 'text', html: 'Anything else? 😊' }
        ],
        chips: buildMainMenuChips()
      },
      cartOp
    };
  }

  /**
   * @param {string[]} cartItemIds
   * @returns {EngineResult}
   */
  function handleFinish(cartItemIds) {
    if (!cartItemIds || cartItemIds.length === 0) {
      state = FLOW_STATES.MAIN_MENU;
      return {
        turn: {
          messages: [{ type: 'text', html: "You haven't ordered anything yet! 😅 Pick something tasty 👇" }],
          chips: buildMainMenuChips()
        },
        cartOp: null
      };
    }

    state = FLOW_STATES.CHECKOUT_PENDING;
    return {
      turn: {
        messages: [{ type: 'text', html: "Great, you're all set! 🎉 Checkout & delivery details are coming very soon 🚧" }],
        chips: [{ label: '🔄 Keep Ordering', value: 'keep_ordering' }]
      },
      cartOp: null
    };
  }

  /**
   * Begin the conversation: the greeting + main menu.
   * @param {string[]} [cartItemIds=[]] - normally empty on a fresh start
   * @returns {EngineResult}
   */
  function start(cartItemIds = []) {
    state = FLOW_STATES.MAIN_MENU;
    pendingItemId = null;

    const name = customerName ? escapeHtml(customerName) : 'there';
    return {
      turn: {
        messages: [
          { type: 'text', html: `Welcome ${name} 👋<br>Welcome to <b>${escapeHtml(BUSINESS_CONFIG.businessName)}</b> ☕<br>What would you like to order today? 😍` },
          { type: 'text', html: 'Tap something delicious below 👇' }
        ],
        chips: buildMainMenuChips()
      },
      cartOp: null
    };
  }

  /**
   * Process a chip/button selection (identified by its `value`).
   * @param {string} value
   * @param {string[]} [cartItemIds=[]]
   * @returns {EngineResult}
   */
  function handleAction(value, cartItemIds = []) {
    if (value.startsWith('item_')) {
      return askQty(value.replace('item_', ''));
    }
    if (value === 'view_full_menu') {
      state = FLOW_STATES.MAIN_MENU;
      return {
        turn: {
          messages: [
            { type: 'card', html: buildFullMenuCardHtml() },
            { type: 'text', html: 'Tap something delicious below 👇' }
          ],
          chips: buildMainMenuChips()
        },
        cartOp: null
      };
    }
    if (value.startsWith('qty_')) {
      return handleQtySelected(parseInt(value.replace('qty_', ''), 10), cartItemIds);
    }
    if (value.startsWith('addon_add_')) {
      return askQty(value.replace('addon_add_', ''));
    }
    if (value === 'addon_skip') {
      return { turn: anythingElseTurn(), cartOp: null };
    }
    if (value === 'finish') {
      return handleFinish(cartItemIds);
    }
    if (value === 'keep_ordering') {
      return { turn: anythingElseTurn(), cartOp: null };
    }
    return { turn: unknownTurn(), cartOp: null };
  }

  /**
   * Process free-typed text input.
   * @param {string} text
   * @param {string[]} [cartItemIds=[]]
   * @returns {EngineResult}
   */
  function handleText(text, cartItemIds = []) {
    const normalized = (text || '').toLowerCase().trim();

    if (/\b(done|finish|bill|checkout)\b/.test(normalized)) {
      return handleFinish(cartItemIds);
    }

    if (state === FLOW_STATES.ITEM_QTY && pendingItemId) {
      const qty = extractQuantity(normalized);
      if (qty) return handleQtySelected(qty, cartItemIds);
    }

    const matchedItem = findItemByText(normalized);
    if (matchedItem) {
      pendingItemId = matchedItem.id;
      state = FLOW_STATES.ITEM_QTY;
      const qty = extractQuantity(normalized) || 1;
      return handleQtySelected(qty, cartItemIds);
    }

    return { turn: unknownTurn(), cartOp: null };
  }

  /** @returns {string} the engine's current flow state, for diagnostics/testing */
  function getCurrentState() {
    return state;
  }

  return { start, handleAction, handleText, getCurrentState };
}

export { FLOW_STATES };
