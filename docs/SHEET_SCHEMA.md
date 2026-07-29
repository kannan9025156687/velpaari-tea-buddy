# Sheet Schema — Velpaari Tea Buddy

Defines the Google Sheets structure `backend/SheetService.gs` will create and maintain in Phase 9. Column names and order are final — `SheetService.gs` reads/writes by header name (not raw column index) specifically so this table can gain columns later without breaking existing rows, but **existing column names/positions here should not change** without updating this document first.

---

## Spreadsheet: `Velpaari Tea Buddy — Orders DB`

One spreadsheet, auto-created on first backend run if `Config.gs`'s stored Sheet ID is empty (same pattern used in prior Apps Script projects in this ecosystem — ID is then persisted to Script Properties).

### Sheet 1 — `Orders`

| Column | Type | Example | Notes |
|---|---|---|---|
| `Order ID` | string | `TB-20260725-0001` | Primary key. Format `TB-YYYYMMDD-####`, sequential per day. |
| `Date` | string (`YYYY-MM-DD`) | `2026-07-25` | Derived from `Created Timestamp`, stored separately for fast filtering. |
| `Time` | string (`HH:mm:ss`, 24h) | `09:41:00` | Same — split out for human-readable Sheet browsing. |
| `Customer` | string | `Kannan` | Trimmed, 1–60 chars (validated). |
| `Phone` | string | `9025156687` | Optional; blank if not provided. |
| `Latitude` | string | `11.016800` | Blank if manual address was used instead of GPS. |
| `Longitude` | string | `76.955800` | Blank if manual address was used. |
| `Google Maps URL` | string | `https://www.google.com/maps?q=11.0168,76.9558` | Blank if manual address. |
| `Manual Address` | string | `12, Race Course Road, Coimbatore` | Blank if GPS was used. Formula-injection-guarded (leading `'` if the value starts with `=+-@`). |
| `Items JSON` | string (JSON) | `[{"id":"tea","name":"Tea Parcel","qty":2,"price":79}]` | Stored as a JSON string in one cell — parsed by `StatsService.gs` for top-item aggregation. |
| `Total` | number | `168` | Server-recomputed at write time — never trusts the client's value (see `API_CONTRACT.md` §5). |
| `Status` | string (enum) | `NEW` | One of `NEW`, `PREPARING`, `READY`, `COMPLETED`. |
| `Estimated Min` | number | `10` | From `businessConfig.js` at order time. |
| `Estimated Max` | number | `15` | Same. |
| `Device` | string | `Linux armv8l` | `navigator.platform`, for basic diagnostics — not authentication. |
| `Browser` | string | `Mozilla/5.0 ...` | `navigator.userAgent`, truncated to 200 chars on write. |
| `Created Timestamp` | ISO string | `2026-07-25T09:41:00.000Z` | Written by the server (`new Date().toISOString()`), authoritative — not client-supplied. |
| `Updated Timestamp` | ISO string | `2026-07-25T09:52:00.000Z` | Set on every status update; blank until the first update. |

**Row 1** is the header row, written verbatim by `SheetService.gs` on sheet creation, in the exact order above. `SheetService.gs` maps header text → column index at runtime rather than hardcoding column letters, so this table is the single source of truth for both the human-readable Sheet and the backend code.

---

### Sheet 2 — `OrderCounters`

Backs sequential Order ID generation without a race condition between simultaneous requests.

| Column | Type | Example | Notes |
|---|---|---|---|
| `Date` | string (`YYYYMMDD`) | `20260725` | One row per day. |
| `LastSequence` | number | `1` | Incremented atomically (via `LockService`, see below) on every `createOrder` call. |

`OrderService.gs` uses Apps Script's `LockService.getScriptLock()` around the read-increment-write of `LastSequence` to prevent two near-simultaneous orders from getting the same Order ID — a real risk with naive Sheets read/write under concurrent requests.

---

## Status enum (mirrored in `config/constants.js` and `backend/Config.gs`)

```
NEW        — just placed, not yet acknowledged by staff
PREPARING  — staff has started making the order
READY      — ready for pickup/handover to delivery
COMPLETED  — delivered / picked up, order lifecycle finished
```

No other string is valid in the `Status` column. `Validation.gs` rejects any `updateOrderStatus` request with a value outside this set.

---

## Why one JSON cell for `Items JSON` instead of one row per item

Considered and rejected: a separate `OrderItems` sheet with `Order ID` as a foreign key, one row per line item. Rejected for Phase 9 because:
- The admin dashboard always reads items grouped by order, never queries across orders by item (except `StatsService.gs`'s top-items aggregation, which can parse the JSON column across all rows — acceptable at this order volume).
- A single-sheet model keeps `SheetService.gs` simpler and keeps one order = one row = one place to update status, which matters more given Apps Script's per-request execution time limits.
- If per-item querying becomes a real need later, this is a documented, isolated migration inside `SheetService.gs` + this schema doc — nothing in `customer/` or `admin/` would need to change, since they only ever see the `orders` collection shape from `API_CONTRACT.md`, not raw Sheet rows.

---

## Column-name stability contract

`SheetService.gs` must:
1. On first run, create `Orders` and `OrderCounters` with exactly the headers listed above, in order.
2. On every subsequent run, verify the header row matches this document (a mismatch — e.g. someone manually renamed a column in the Sheet UI — should throw a clear startup error rather than silently write to the wrong column).
3. Never reorder or rename existing columns to add a new field — new fields are appended as new columns at the end, and this document is updated first.
