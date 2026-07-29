# Deployment — Velpaari Tea Buddy

Three deployable units. This document assumes **Phases 1–10 are all complete** — for now, it exists so the deployment shape is agreed before any code is written, per the locked architecture. Steps referencing files that don't exist yet are marked accordingly.

---

## Overview

| Unit | Where | When it can first go live |
|---|---|---|
| `customer/` | Netlify site #1 | After Phase 8 (fully functional on mock data — can demo/soft-launch before the real backend exists) |
| `admin/` | Netlify site #2 | Same — Phase 8 |
| `backend/` | Google Apps Script Web App | Phase 9 |

Because of the `storage.js` abstraction, **`customer/` and `admin/` can genuinely be deployed and used with `STORAGE_MODE: 'localStorage'` before the backend exists** — each visitor's orders just stay in their own browser rather than a shared Sheet. This is a legitimate soft-launch/demo path, not just a dev convenience.

---

## Part A — Deploying `customer/` and `admin/` to Netlify

Each is its own Netlify site, since they're independently deployable and may end up on different (sub)domains (e.g. `order.velpaari.in` and `admin.velpaari.in`).

### A1. Prerequisites (per site)

Both `customer/netlify.toml` and `admin/netlify.toml` (built in Phase 3) are configured to copy in the root-level shared folders at build time, since Netlify's build context for a subfolder site doesn't otherwise see siblings outside it:

```toml
# example shape — finalized when netlify.toml is actually generated in Phase 3
[build]
  publish = "."
  command = "cp -r ../shared ./shared && cp -r ../config ./config && cp -r ../assets ./assets"
```

### A2. Deploy steps (drag-and-drop, for quick iteration)

1. From the repo root, prepare a deploy folder per site (or let the `netlify.toml` build command do it — preferred for repeatability).
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `customer/` folder (post-build, with `shared/`, `config/`, `assets/` copied in) onto the page.
4. Repeat for `admin/` as a second, separate site.
5. Netlify gives each a live URL immediately (e.g. `random-name-123.netlify.app`).

### A3. Deploy steps (Git-based, recommended for ongoing work)

1. Push the whole `velpaari-tea-buddy/` repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub**, select the repo.
3. **Base directory:** `customer` (repeat as a second site with base directory `admin`).
4. **Build command:** as defined in that app's `netlify.toml`.
5. **Publish directory:** `.` (relative to the base directory).
6. Deploy. Netlify rebuilds automatically on every push to the connected branch.

### A4. Custom domains / subdomains (optional)

Once both sites are live on their `*.netlify.app` URLs, custom domains can be attached per-site under **Site settings → Domain management** in each Netlify project — e.g. `order.` and `admin.` subdomains of the same root domain, each pointed at its own Netlify site.

### A5. Environment awareness

`config/appConfig.js` holds `STORAGE_MODE` and any environment flags. There is **no `.env` file** in this project (no build step reads one) — configuration is a plain JS module, committed to the repo, edited directly when moving between mock and live backend. This is intentional given the "no frameworks / no build tooling" constraint; if this ever needs to differ genuinely per-environment (not just per-phase), Netlify's own environment variables + a small inline script in `index.html` would be the next step — not part of the current locked architecture.

---

## Part B — Deploying `backend/` (Google Apps Script), Phase 9+

1. Create a new Google Sheet — this becomes the Orders DB (see `SHEET_SCHEMA.md`). Note its Sheet ID from the URL, or let `SheetService.gs` auto-create it on first run and read the ID back from Script Properties (matches the pattern used in prior Apps Script projects in this ecosystem).
2. Open **Extensions → Apps Script** from that Sheet (or create a standalone Apps Script project and set the Sheet ID in `Config.gs` — either works; standalone is preferable if the backend should outlive any one Sheet).
3. Copy in, in this order (dependency order — `Config.gs` first, `Code.gs` last since it references the others):
   - `Config.gs`
   - `Validation.gs`
   - `SheetService.gs`
   - `OrderService.gs`
   - `StatsService.gs`
   - `AuthService.gs` (stub — safe to deploy even before implemented)
   - `Code.gs`
   - `appsscript.json` (via **Project Settings → Show "appsscript.json"**, or the manifest editor)
4. **Deploy → New deployment → Web app.**
   - **Execute as:** Me (the script owner's account) — required so the script can write to the Sheet regardless of who calls the Web App.
   - **Who has access:** Anyone — required to avoid a Google login prompt for customers/staff, and to keep requests GET-only/preflight-free per `API_CONTRACT.md`. See the security notes in `ARCHITECTURE.md` §5 for why this makes server-side validation the real trust boundary.
5. Copy the deployed `/exec` URL.
6. **Every time `Code.gs` or any `*.gs` file changes**, a *new version* must be selected under **Manage deployments → Edit → Version: New version** — editing the script alone does not update the live `/exec` URL's behavior. (This has been a recurring gotcha in prior Apps Script projects in this ecosystem — flagged here explicitly.)

---

## Part C — Connecting frontend to backend (Phase 10)

1. Paste the deployed `/exec` URL into `config/appConfig.js` (a single constant, e.g. `APPS_SCRIPT_URL`).
2. Flip `STORAGE_MODE` from `'localStorage'` to `'appsScript'` in the same file.
3. Redeploy both `customer/` and `admin/` Netlify sites (push to Git, or re-drag the folders) — no other file changes required, per the storage abstraction contract in `ARCHITECTURE.md` §4.
4. Smoke test, in order:
   - Place a real order through `customer/` → confirm a new row appears in the `Orders` sheet.
   - Open `admin/` → confirm the order appears in the dashboard and order list.
   - Advance its status NEW → PREPARING → READY → COMPLETED → confirm the Sheet's `Status`/`Updated Timestamp` columns update each time.
   - Confirm `admin/`'s polling picks up a second test order without a manual refresh.
5. Only after this smoke test passes should mock-data code paths (`localStorageAdapter` as the *default*) be considered fully retired — the adapter itself stays in the codebase (it's valuable for offline demos/dev), but `STORAGE_MODE` in the deployed config stays on `'appsScript'`.

---

## Rollback plan

Because `STORAGE_MODE` is a single config value, rolling back from a broken backend to mock mode is a one-line change + redeploy — the frontend never loses functionality, it just stops sharing data across devices/staff until the backend issue is fixed. This is a deliberate benefit of the storage abstraction, not an afterthought.
