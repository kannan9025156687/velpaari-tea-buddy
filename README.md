# Velpaari Tea Buddy ☕
### Talk. Order. Enjoy.

A conversational, WhatsApp-style tea ordering platform, built as two independent static web apps (Customer + Admin) sharing a common config/component/service layer, backed by Google Apps Script + Google Sheets.

> **Status:** Phase 1 — Project Foundation (this document set). No application code has been written yet. See [Phase Tracker](#phase-tracker) below.

---

## What this project is

- **Customer app** — a mobile-first chat interface where a customer talks to an AI tea-shop assistant, builds a live cart, shares delivery location, and confirms an order. No product-grid, no traditional checkout form.
- **Admin app** — a staff dashboard showing live orders, daily stats, and a status pipeline (`NEW → PREPARING → READY → COMPLETED`), polling for new orders.
- **Backend** — a Google Apps Script Web App that reads/writes a Google Sheet acting as the order database. Built last, on purpose (see [Build Order](#build-order-frontend-first)).

Both frontends are **plain HTML/CSS/ES6** — no React, Vue, Angular, or Bootstrap, and no bundler. Native `<script type="module">` + `import`/`export` provide the modularity.

---

## Repository layout

```
velpaari-tea-buddy/
├── config/         → root-level app config, business config, routes, constants
├── assets/         → icons, images, sounds, fonts shared by both apps
├── customer/       → customer-facing chat app (own Netlify site)
├── admin/          → staff dashboard app (own Netlify site)
├── shared/         → components, services (incl. storage abstraction), utils used by both apps
├── backend/        → Google Apps Script project (Code.gs + service files)
├── docs/           → this document set
└── README.md       → you are here
```

Full explanation of every folder and file lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. This structure is **locked** — see that document's "Locked Structure" notice.

---

## The single most important design decision: `storage.js`

Business logic (in both apps) never calls `localStorage`, `fetch`, or any database API directly. It calls `shared/services/storage.js`, which delegates to whichever **adapter** is active:

```
localStorageAdapter   ← active during Phases 1–3 (mock data, fully functional offline)
appsScriptAdapter      ← activated in Phase 5, talks to the real backend
firebaseAdapter          ← stub only, for a possible future migration
```

Switching backends is a **one-line config change** in `config/appConfig.js` (`STORAGE_MODE`). No page, component, or service that calls `storage.js` needs to change. This is what makes the "frontend-first, mock data now, real backend later" build order possible without a rewrite.

---

## Build order (frontend-first)

This project is being built in the following locked sequence:

| Phase | Contents | Status |
|---|---|---|
| **1** | Foundation docs: README, ARCHITECTURE, API_CONTRACT, SHEET_SCHEMA, DEPLOYMENT | ✅ This delivery |
| **2** | Configuration files (`config/*.js`) | ⬜ Pending approval |
| **3** | Complete UI layout (both apps' HTML/CSS shells) | ⬜ |
| **4** | Reusable components (`shared/components/*`) | ⬜ |
| **5** | Customer pages (welcome, name, chat) | ⬜ |
| **6** | Admin pages (dashboard, orders, order detail) | ⬜ |
| **7** | Navigation & routing (both routers) | ⬜ |
| **8** | Full frontend functional on mock data (`localStorageAdapter`) | ⬜ |
| **9** | Google Apps Script backend | ⬜ |
| **10** | Connect frontend to backend, retire mock data | ⬜ |

Each phase is generated and delivered as its own module, and requires explicit approval before the next begins.

---

## Local development (once Phase 3+ exists)

Both `customer/` and `admin/` are static sites with ES module imports, which most browsers block from `file://` due to CORS. Serve them with any static server, e.g.:

```bash
# from the customer/ or admin/ folder
npx serve .
# or
python3 -m http.server 8080
```

No `npm install` is required anywhere in this project — there are no dependencies.

---

## Deployment

Two independent Netlify sites (customer, admin) + one Google Apps Script Web App. Full steps in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Related documents

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — full folder-by-folder / file-by-file responsibility map, and the reasoning behind the storage abstraction, routing approach, and shared-vs-app-specific boundaries.
- **[docs/API_CONTRACT.md](docs/API_CONTRACT.md)** — every backend action, its parameters, and its response shape. Written before any backend code, so frontend `storage.js` adapters and the eventual `Code.gs` router are built against the same agreed contract.
- **[docs/SHEET_SCHEMA.md](docs/SHEET_SCHEMA.md)** — the Google Sheets column layout that will back the Orders database in Phase 9.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — step-by-step deployment for both Netlify sites and the Apps Script Web App, including the order in which they must go live.

---

## License / ownership

Internal project for the Velpaari / FixMate business ecosystem. Not currently licensed for external reuse.
