# Phase 8 — localStorage Adapter: Verification Report

**Status: implemented and verified.** 75 real-browser assertions across three Playwright suites, 0 failures, 0 console errors, 0 uncaught exceptions. This document records what was built, the design decisions made to satisfy the phase's 9 requirements, and exactly how each was verified — not just asserted.

---

## What was built

| File | Role |
|---|---|
| `shared/services/adapters/localStorageAdapter.js` | The adapter itself — implements `create/read/update/query/remove` against `window.localStorage`, one JSON blob per collection (`teabuddy_store_<collection>`), versioned, corruption-safe. |
| `shared/services/storageBootstrap.js` | **New.** Reads `STORAGE_MODE` from `config/appConfig.js` and calls `storage.setAdapter()` with the matching adapter. The only file that imports a concrete adapter — `storage.js` itself still never does. |
| `customer/js/services/sessionCartService.js` | **New.** The customer app's persistence door for session + cart (order persistence remains deferred — checkout is still stubbed, unchanged from Phase 5). Calls `storage.js`, never `localStorage` directly. |
| `customer/js/pages/chatPage.js` | **Modified.** Accepts optional `loadCart`/`saveCart` callbacks — same decoupled-callback pattern as `onStart`/`onSubmit` from Phase 5. Still imports nothing storage-related directly. |
| `customer/js/main.js` | **Modified.** Calls `initStorage()` first; restores the customer session *before* the router's first dispatch (so a refresh mid-chat still greets by name); wires `sessionCartService`'s functions into the NAME/CHAT routes. |
| `admin/js/main.js` | **Modified.** Calls `initStorage()` first. No other change — `orderAdminService.js` (Phase 6) already called `storage.js`; it simply starts returning real data now. |
| `config/constants.js` | **Modified.** Added `COLLECTIONS.SESSION`, `COLLECTIONS.CART`, and `STORAGE_SCHEMA_VERSION`. |
| `shared/services/storage.js` | **Modified.** `create(collection, data, id)` gained an optional third parameter — needed so `sessionCartService.js` can create the singleton session/cart records at a fixed id (`'current'`). Backward compatible: every existing call that omits it is unaffected. |
| `tests/browser/*.py` | **New.** The three Playwright verification suites, saved as permanent project artifacts, plus a README explaining how to run them. |

No page gained a new direct dependency on `storage.js` or `localStorage` — every new data flow goes through a service (`sessionCartService.js` for customer, `orderAdminService.js` for admin, unchanged from Phase 6).

---

## Design decisions and why

**Singleton records via upsert, not a new API shape.** Session and cart are each "there's exactly one, per browser" data — not a growing collection of records. Rather than inventing a separate API for singleton data, `localStorageAdapter.update()` was made to **upsert**: if the id doesn't exist yet, `update()` creates it. `sessionCartService.js` always targets the fixed id `'current'`, so the very first save just works without a separate "does this exist yet" check. This convention is documented in the adapter's header specifically so future Apps Script/Firebase adapters implement it the same way (rule 8).

**Cart's saved shape is minimal (`{id, qty}` only).** Price, name, and emoji are deliberately *not* persisted — those come from `config/businessConfig.js` and should always be resolved fresh. If a price changes, a saved cart from yesterday doesn't need a data migration; it just resolves to the new price automatically the next time `cart.js`'s `getMenuItem()` runs.

**Cart rehydration happens *before* subscribing, not after.** `cart.subscribe()` fires its listener immediately with the cart's current state. Subscribing before restoring saved items would have fired once with an empty cart and — via the save-on-change wiring — immediately overwritten a customer's saved cart with nothing. `chatPage.js`'s `startChat()` now awaits `loadCart()`, applies the restored items, and only *then* subscribes.

**Order persistence for the customer side stays deferred.** Checkout is still stubbed at `CHECKOUT_PENDING` (a Phase 5 decision this phase doesn't reopen). To verify the *admin* side of order/status persistence without un-stubbing checkout, the verification suite seeds a test order by calling `storage.create()` directly — simulating what a future un-stubbed checkout will eventually do — then exercises the real admin UI (status button, refresh) against it.

---

## Requirement-by-requirement verification

### 1–2. Adapter created and registered at startup
`storage.getAdapter()` confirmed non-null immediately after both apps boot, plus a live `create()` round-trip (mints a real `TB-YYYYMMDD-####` order id) — not just "an object exists," but "the object actually works."

### 3–4. Persistence + restoration after refresh
- **Customer session**: typed name "Meera" → refreshed the actual browser tab (`page.reload()`, not a simulated one) → landed back on `#/chat` → greeting still said "Meera."
- **Cart**: added 2 Tea Parcels → refreshed → cart pill still showed 2 → opened the drawer → confirmed "Tea Parcel" by name, not just a count.
- **Orders**: seeded via `storage.create()` → appeared correctly in the admin dashboard's stat widgets and orders list.
- **Admin order status**: advanced a seeded order's status via the real "Start Preparing →" button in the UI → refreshed → status badge still read PREPARING.

### 5. All storage access goes through `storage.js`
Full-codebase grep for `localStorage.` outside `localStorageAdapter.js`: **zero matches** in every `.js` file across `config/`, `customer/`, `admin/`, `shared/`. Two pre-existing matches remain in `customer/index.html` and `admin/index.html`'s inline theme-init scripts (`teabuddy_theme` key) — these predate this phase (Phase 3), are explicitly documented as a deliberate synchronous-script exception for flash-of-wrong-theme prevention, and fall outside this phase's scope (theme preference isn't in the "session, cart, orders, admin status" list). Flagging this explicitly rather than silently leaving it unmentioned.

### 6. Versioning for future migration
Every stored blob is `{ version, records }`. `migrateStore()` is a real, currently-no-op function that's the single designated seam for a future schema change — not a promise to add one later, an actual function that already exists and runs on every read.

### 7. Corrupted data handled safely
Tested three distinct corruption modes, all producing zero uncaught errors and a clean recovery:
- Unparseable JSON (`{not valid json!!`) in the orders store → self-heals to a valid empty `{version, records}` store (verified by reading the key back afterward).
- Syntactically valid JSON with the wrong shape entirely (an array where an object was expected) → same safe treatment.
- A corrupted order-id sequence counter → new order creation still succeeds afterward (falls back to a fresh counter).

### 8. Compatible with future Apps Script/Firebase adapters
The adapter exports exactly the shape `storage.js` already expected from Phase 3 (`{create, read, update, query, remove}`, each async, each returning the `{success, data, error}` envelope) — nothing about `storage.js` changed to accommodate this adapter. The one adapter-specific behavior (`update()` upserts) is documented as a convention future adapters should match, not a hidden assumption baked into `sessionCartService.js`.

### 9. Browser verification tests written and passing
20 assertions in `tests/browser/verify_localstorage_adapter.py`, covering all five items requested: refresh survival, corruption handling, empty-storage initialization, adapter registration, and the direct-access audit (done statically via grep, documented above, since "does no file reference `localStorage`" is fundamentally a static code property).

**Regression check:** the two earlier suites (`verify_integration.py`, 46 assertions; `verify_lifecycle_stress.py`, 9 assertions) were re-run against these changes. All pass. Three assertions in `verify_integration.py` that specifically asserted "no adapter is registered" (correct for that earlier phase) were updated to assert the new, intentional reality — annotated inline as a Phase 8 supersession, not silently changed.

---

## Explicitly not done (per your instructions)

- No Google Apps Script code
- No Google Sheets integration
- No backend API calls
- `backend/` remains exactly the stub files from Phase 1 — untouched

## Known limitation, inherent to localStorage (not a bug)

`customer/` and `admin/` deploy as **separate Netlify sites** in production (`docs/DEPLOYMENT.md`) — separate origins do not share `localStorage`. The verification suite's admin/customer cross-visibility tests work because both are served from the same local origin (`127.0.0.1:8934`) during testing. In production, an order won't be visible to the admin dashboard until a shared backend (Apps Script/Firebase) is wired — which is precisely what the storage abstraction was built to make a drop-in change when that phase arrives.
