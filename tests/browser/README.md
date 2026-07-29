# Browser Verification Tests

Real-browser tests (via Playwright/Chromium) for this project — not unit tests against mocked DOM, actual navigation, clicks, typed input, and page reloads against both apps running as they will in production (served statically, root-relative imports resolving from the repo root).

## Requirements

- Python 3 with `playwright` installed (`pip install playwright && playwright install chromium`)
- No other dependencies — the apps themselves have zero build step

## Running

From the repo root:

```bash
# Terminal 1 — serve the repo root so /config, /shared, etc. resolve
python3 -m http.server 8934 --bind 127.0.0.1

# Terminal 2 — run any of the suites
python3 tests/browser/verify_integration.py
python3 tests/browser/verify_lifecycle_stress.py
python3 tests/browser/verify_localstorage_adapter.py
```

Each script exits non-zero if any assertion fails, and prints a `[PASS]`/`[FAIL]` line per check plus a summary count — suitable for CI.

## What each suite covers

| Script | Covers |
|---|---|
| `verify_integration.py` | End-to-end navigation through every route in both apps, chatEngine/cart/chip wiring, dashboard widgets, order cards, dynamic `:id` route params, default-route redirects |
| `verify_lifecycle_stress.py` | Adversarial cases: navigating away mid-async-operation, a genuine same-tick double-click race, rapid mount/unmount cycling — the concrete evidence behind "no memory leaks or duplicate listeners" |
| `verify_localstorage_adapter.py` | Adapter registration, empty-storage initialization, session/cart/order-status survival across a real `page.reload()`, and three distinct corruption scenarios (unparseable JSON, wrong-shaped valid JSON, corrupted id-sequence counter) |

Full narrative results for the two phases these were built for are in `docs/INTEGRATION_VERIFICATION.md` and `docs/PHASE8_VERIFICATION.md`.

## A note on cross-app data sharing in this local setup vs. production

These tests serve **both** `customer/` and `admin/` from the same `http://127.0.0.1:8934` origin (different paths), so they share `localStorage` — that's how `verify_localstorage_adapter.py` can seed an order from the "customer side" and see it on the "admin side" in the same test. **In production, `customer/` and `admin/` deploy as two separate Netlify sites** (per `docs/DEPLOYMENT.md`), which means two separate origins — `localStorage` does **not** share across them there. This is an inherent limitation of the localStorage adapter, not a bug; it's exactly what the Apps Script/Firebase adapters (later phases) exist to fix, per `docs/ARCHITECTURE.md`'s storage abstraction.
