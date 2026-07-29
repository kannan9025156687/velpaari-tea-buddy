# Architecture — Velpaari Tea Buddy

> **🔒 Locked structure.** This folder/file layout is approved and locked as of Phase 1. It is not to be modified without an explicit architectural change request. Everything below is the reference for what goes where in every future phase.

---

## 1. System overview

Three independently deployable units, one shared data contract:

```
┌─────────────────┐        ┌─────────────────┐
│   customer/      │        │    admin/        │
│  (Netlify site)   │        │  (Netlify site)   │
│  Public, untrusted  │      │  Staff, semi-trusted│
└─────────┬─────────┘        └─────────┬─────────┘
          │                            │
          │     both import from       │
          ▼                            ▼
   ┌────────────────────────────────────────┐
   │   config/   +   assets/   +   shared/     │
   │  (routes, business rules, components,      │
   │   the storage abstraction, utils)            │
   └────────────────────┬─────────────────────┘
                         │
                storage.js picks an adapter
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
     localStorageAdapter │  appsScriptAdapter  │ firebaseAdapter
       (Phases 1–8, mock)│   (Phase 10, real)  │     (stub only)
                         │
                         ▼
              ┌────────────────────┐
              │     backend/         │
              │ Google Apps Script    │
              │  (Phase 9)             │
              └──────────┬────────────┘
                         ▼
              ┌────────────────────┐
              │  Google Sheets        │
              │  (the database)        │
              └────────────────────┘
```

Neither `customer/` nor `admin/` ever talks to Google Apps Script (or `localStorage`) directly. Both only ever call `shared/services/storage.js`. This is the single most load-bearing decision in this architecture — see [§4](#4-the-storage-abstraction) for why.

---

## 2. Full folder structure

```
velpaari-tea-buddy/
│
├── config/
│   ├── appConfig.js
│   ├── businessConfig.js
│   ├── routes.js
│   └── constants.js
│
├── assets/
│   ├── icons/
│   ├── images/
│   ├── sounds/
│   └── fonts/
│
├── customer/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── netlify.toml
│   ├── css/
│   │   ├── theme.css
│   │   ├── layout.css
│   │   └── components.css
│   └── js/
│       ├── router.js
│       ├── main.js
│       ├── pages/
│       │   ├── welcomePage.js
│       │   ├── namePage.js
│       │   └── chatPage.js
│       ├── modules/
│       │   ├── cart.js
│       │   ├── chatEngine.js
│       │   ├── uiRenderer.js
│       │   └── themeManager.js
│       └── services/
│           ├── orderService.js
│           └── locationService.js
│
├── admin/
│   ├── index.html
│   ├── netlify.toml
│   ├── css/
│   │   ├── admin-theme.css
│   │   ├── admin-layout.css
│   │   └── admin-components.css
│   └── js/
│       ├── router.js
│       ├── main.js
│       ├── pages/
│       │   ├── dashboardPage.js
│       │   ├── ordersPage.js
│       │   └── orderDetailPage.js
│       ├── modules/
│       │   ├── dashboardStats.js
│       │   ├── orderCard.js
│       │   ├── statusManager.js
│       │   └── filters.js
│       └── services/
│           ├── orderAdminService.js
│           └── notificationService.js
│
├── shared/
│   ├── components/
│   │   ├── toast.js
│   │   ├── modal.js
│   │   ├── loader.js
│   │   ├── dialog.js
│   │   ├── emptyState.js
│   │   └── components.css
│   ├── services/
│   │   ├── storage.js
│   │   ├── apiClient.js
│   │   └── adapters/
│   │       ├── localStorageAdapter.js
│   │       ├── appsScriptAdapter.js
│   │       └── firebaseAdapter.js
│   └── utils/
│       ├── formatCurrency.js
│       ├── dateUtils.js
│       ├── idGenerator.js
│       └── domHelpers.js
│
├── backend/
│   ├── appsscript.json
│   ├── Code.gs
│   ├── OrderService.gs
│   ├── AuthService.gs
│   ├── SheetService.gs
│   ├── StatsService.gs
│   ├── Validation.gs
│   └── Config.gs
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── SHEET_SCHEMA.md
│   └── DEPLOYMENT.md
│
└── README.md
```

---

## 3. File-by-file responsibility map

### `config/` — the only place business/environment facts live

| File | Owns | Consumed by |
|---|---|---|
| `appConfig.js` | `STORAGE_MODE` switch, environment flags, admin polling interval, timeouts, PWA settings | `storage.js`, `notificationService.js`, both `main.js` |
| `businessConfig.js` | Shop name, tagline, currency, full menu + add-ons + prices, estimated prep time, service note | `chatEngine.js`, `cart.js`, `dashboardStats.js` — anything that needs to know what's for sale |
| `routes.js` | `CUSTOMER_ROUTES` and `ADMIN_ROUTES` path constants | Both `router.js` files, both `main.js` |
| `constants.js` | Order status enum (`NEW/PREPARING/READY/COMPLETED`), storage key names, event names shared across modules | `statusManager.js`, `storage.js`, adapters |

**Rule:** if a value could plausibly change for a different business (FixMate, RideMate, a grocery store) or a different environment (dev/prod), it lives in `config/`, never inline in a page or module.

### `assets/` — shared, static, never app-specific

Icons used by both apps' PWA manifests, the shop logo, the admin's new-order notification sound, and any self-hosted fonts. Each app's `netlify.toml` copies this folder in at deploy time so both sites remain independently deployable static sites (no shared server, no monorepo build step).

### `customer/` — the ordering chat experience

- **`router.js`** — a hash router (`#/welcome`, `#/name`, `#/chat`) reading its path table from `config/routes.js`. Gives real back-button behavior and a URL that reflects app state, which plain show/hide screens (used in the earlier prototype) don't.
- **`pages/`** — one file per screen. A page's job is only to mount/unmount the right modules into the DOM for that route — it does not contain business logic itself.
- **`modules/`** — the actual behavior: `cart.js` (state + drawer rendering), `chatEngine.js` (conversation flow/router-within-a-page), `uiRenderer.js` (bubble/chip/typing-indicator DOM helpers), `themeManager.js` (dark/light mode).
- **`services/orderService.js`** — the customer app's only door to persistence. Calls `storage.js`. Never imports an adapter directly.
- **`services/locationService.js`** — thin wrapper over the real browser Geolocation API. Not mocked at any phase, since it has no backend dependency.

### `admin/` — the staff dashboard

Mirrors `customer/`'s shape (`router.js`, `pages/`, `modules/`, `services/`) for consistency. Notable modules:
- **`statusManager.js`** — owns the order status state machine and the calls to advance it. Kept separate from `orderCard.js` (pure rendering) so the transition logic is independently testable.
- **`notificationService.js`** — polls `storage.js` on the interval defined in `appConfig.js`, and on a new order plays a sound from `assets/sounds/`, vibrates (if supported), and updates a badge count. Isolated here so the polling *strategy* (interval-based now, push-based later) can change without touching `orderList`/`orderCard` rendering.

### `shared/` — everything both apps need identically

- **`components/`** — framework-free, reusable UI primitives: `toast.js` (success/error/info notices), `modal.js` (generic modal shell), `loader.js` (spinner/skeleton), `dialog.js` (confirm/cancel, e.g. "Remove item?"), `emptyState.js` ("Cart is empty" in customer, "No orders yet" in admin). One `components.css` styles all of them, imported by both apps' own stylesheets.
- **`services/storage.js`** — see [§4](#4-the-storage-abstraction) below, the core abstraction of this whole project.
- **`services/apiClient.js`** — a thin `fetch` wrapper (timeout, retry-once, normalized error shape). Used **only** by `appsScriptAdapter.js` — no page or module ever imports it directly.
- **`services/adapters/`** — the three interchangeable backends. See §4.
- **`utils/`** — pure, stateless helper functions with no DOM and no side effects: currency formatting, date formatting, ID generation (used by the mock adapter until the backend takes over ID generation), and small DOM query helpers.

### `backend/` — built in Phase 9, not before

- **`Code.gs`** — thin HTTP router only. Reads an `action` parameter from the request, delegates to the matching `*Service.gs` function, returns JSON. Contains no business logic itself.
- **`OrderService.gs`** — order creation, ID generation, status updates.
- **`AuthService.gs`** — stub file created now, implemented in a future phase, so the seam for staff login exists without reshaping anything built earlier.
- **`SheetService.gs`** — the only file that calls `SpreadsheetApp` directly (auto-creates the sheet + headers on first run, appends/reads rows). If the database ever changed, only this file would.
- **`StatsService.gs`** — dashboard aggregations (today/week/month revenue, top items).
- **`Validation.gs`** — re-validates every field the client sends. Since there is no login gate on the Web App URL, this file is the actual security boundary — see [§5](#5-security-notes).
- **`Config.gs`** — Sheet ID, column-name map, shared constants mirrored from `config/constants.js` so both sides agree on status values, etc.

### `docs/`

Living documents, updated as each phase lands. `API_CONTRACT.md` in particular is written **before** `backend/` so that `appsScriptAdapter.js` (built earlier, against the contract) and `Code.gs` (built later, against the same contract) agree without either having seen the other's code.

---

## 4. The storage abstraction

This is the mechanism that makes "frontend-first, mock now, real backend later" possible without a rewrite at the end.

```js
// what business logic actually calls, e.g. in orderService.js
await storage.create('orders', orderPayload);
await storage.query('orders', { status: 'NEW' });
await storage.update('orders', orderId, { status: 'PREPARING' });
```

`storage.js` reads `STORAGE_MODE` from `config/appConfig.js` once, and forwards every call to the matching adapter:

| `STORAGE_MODE` | Adapter | Active |
|---|---|---|
| `'localStorage'` | `localStorageAdapter.js` | Phases 1–8 (default) |
| `'appsScript'` | `appsScriptAdapter.js` (via `apiClient.js`) | Phase 10 onward |
| `'firebase'` | `firebaseAdapter.js` | Stub only — not wired up, kept for a possible future migration |

All three adapters implement the **same method signatures** (`create`, `read`, `update`, `query`, `remove`), defined precisely in `docs/API_CONTRACT.md`. Because `orderService.js`, `orderAdminService.js`, `dashboardStats.js`, etc. only ever call `storage.js`, switching `STORAGE_MODE` in one config file is the entire migration — no page, component, or module changes.

The `localStorageAdapter` also means the customer app and admin app can be developed and demoed **against each other truthfully**: an order placed in the customer chat is genuinely readable by the admin dashboard during local development, because both read/write the same browser storage key defined in `config/constants.js` — not two disconnected piles of fake data.

---

## 5. Security notes (flagged now, addressed in Phase 9)

Since the Apps Script Web App will be deployed with `Anyone` access and no login (per current spec), the deployed backend is the real trust boundary, not the frontend:

- **Never trust client-supplied prices or totals.** `Validation.gs` will recompute the order total server-side from `Config.gs`'s menu, not accept the client's number.
- **Item IDs are validated against a server-side menu list**, not just checked for "is a string."
- **All string fields are length-capped and sanitized** before being written to a Sheet cell (Sheets formulas can be injection vectors if a cell starts with `=`).
- **GET-only / `text/plain` POST bodies** are used specifically to avoid CORS preflight requests, matching the working pattern from prior Apps Script projects in this ecosystem — documented fully in `API_CONTRACT.md`.
- **`AuthService.gs` exists as a stub** specifically so staff-only actions (status updates, stats) can be gated behind a real check later without restructuring `Code.gs`'s routing.

This section will be expanded into concrete implementation detail when Phase 9 begins.

---

## 6. Why native ES modules instead of a bundler

Every requirement (no frameworks, fast loading, modular code, Netlify static hosting, no build step mentioned anywhere in the brief) points at native `<script type="module">` + `import`/`export`. Browsers resolve these directly; there's no compile step, no `node_modules`, and every file in this tree is exactly the file the browser downloads. The tradeoff — no automatic bundling/minification — is acceptable for an app of this size and is revisited only if page-weight becomes a measured problem.
