import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8934"
results = []


def check(label, condition, extra=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, label, extra))
    print(f"[{status}] {label}" + (f" — {extra}" if extra else ""))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page_errors = []
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # =========================================================
        # 1. ADAPTER REGISTRATION
        # =========================================================
        page.goto(f"{BASE}/customer/index.html")
        page.wait_for_timeout(400)

        adapter_registered = page.evaluate("""
            () => import('/shared/services/storage.js').then(m => m.getAdapter() !== null)
        """)
        check("Adapter registration: storage.getAdapter() is non-null after boot", adapter_registered is True)

        roundtrip_ok = page.evaluate("""
            async () => {
                const storage = await import('/shared/services/storage.js');
                const { COLLECTIONS } = await import('/config/constants.js');
                const result = await storage.create(COLLECTIONS.ORDERS, { customer: 'Adapter Check', items: [], total: 0 });
                return result.success && typeof result.data.orderId === 'string' && result.data.orderId.startsWith('TB-');
            }
        """)
        check("Adapter registration: a real create() round-trip succeeds and mints a TB-... order id", roundtrip_ok is True)

        # =========================================================
        # 2. EMPTY STORAGE INITIALIZES CORRECTLY
        # =========================================================
        page.evaluate("() => window.localStorage.clear()")
        page.reload()
        page.wait_for_timeout(400)

        check("Empty storage: welcome screen still renders with nothing in localStorage", page.locator(".welcome-card").count() == 1)
        empty_query_ok = page.evaluate("""
            async () => {
                const storage = await import('/shared/services/storage.js');
                const { COLLECTIONS } = await import('/config/constants.js');
                const result = await storage.query(COLLECTIONS.ORDERS);
                return result.success && Array.isArray(result.data) && result.data.length === 0;
            }
        """)
        check("Empty storage: query() on a never-before-touched collection returns success + []", empty_query_ok is True)

        # =========================================================
        # 3. CUSTOMER SESSION + CART SURVIVE A REFRESH
        # =========================================================
        page.evaluate("() => window.localStorage.clear()")
        page.reload()
        page.wait_for_timeout(300)

        page.click(".welcome-card .btn--primary")
        page.wait_for_timeout(150)
        page.fill(".name-card .text-input", "Meera")
        page.click(".name-card .btn--primary")
        page.wait_for_timeout(700)

        # Add 2 Tea Parcels + skip the combo suggestion, to get a known cart state.
        page.click(".chips-wrap .chip >> nth=0")
        page.wait_for_timeout(700)
        page.locator(".chips-wrap .chip", has_text="2").first.click()
        page.wait_for_timeout(900)
        skip_chip = page.locator(".chips-wrap .chip", has_text="Skip")
        if skip_chip.count() > 0:
            skip_chip.first.click()
            page.wait_for_timeout(700)

        cart_count_before_refresh = page.locator(".cart-pill-btn b").inner_text()
        check("Persistence setup: cart shows 2 before refresh", cart_count_before_refresh == "2", f"got {cart_count_before_refresh}")

        # Give the fire-and-forget saveCart()/saveCustomerSession() calls a moment to land.
        page.wait_for_timeout(300)

        page.reload()
        page.wait_for_timeout(800)  # allow: adapter init -> session restore -> router dispatch -> chat mount -> cart rehydrate -> greeting turn

        check("Refresh: lands back on #/chat (route survives reload via the hash)", page.evaluate("location.hash") == "#/chat")
        greeting_after_refresh = page.locator(".chat-area").inner_text()
        check("Refresh: customer session restored — greeting still uses 'Meera'", "Meera" in greeting_after_refresh)

        cart_count_after_refresh = page.locator(".cart-pill-btn b").inner_text()
        check("Refresh: cart restored to the same count (2) after reload", cart_count_after_refresh == "2", f"got {cart_count_after_refresh}")

        # Confirm the drawer itself shows the right item, not just the pill count.
        page.click(".cart-pill-btn")
        page.wait_for_timeout(200)
        drawer_text_after_refresh = page.locator(".cart-drawer").inner_text()
        check("Refresh: cart drawer shows the restored item by name", "Tea Parcel" in drawer_text_after_refresh)

        # =========================================================
        # 4. ADMIN: ORDER + STATUS SURVIVE A REFRESH (same-origin local
        #    setup — see docs note on cross-origin production limits)
        # =========================================================
        page.evaluate("() => window.localStorage.clear()")

        # Seed one order directly through storage.js (simulating what a
        # future un-stubbed checkout will do) so we can test the ADMIN
        # side of persistence without re-implementing checkout here.
        seeded_order_id = page.evaluate("""
            async () => {
                const storage = await import('/shared/services/storage.js');
                const { COLLECTIONS } = await import('/config/constants.js');
                const result = await storage.create(COLLECTIONS.ORDERS, {
                    customer: 'Refresh Test Customer',
                    items: [{ id: 'tea', name: 'Tea Parcel', qty: 2, price: 79 }],
                    total: 158,
                    status: 'NEW'
                });
                return result.data.orderId;
            }
        """)
        check("Admin persistence setup: seeded order created with a real id", isinstance(seeded_order_id, str) and seeded_order_id.startswith("TB-"))

        page.goto(f"{BASE}/admin/index.html")
        page.wait_for_timeout(500)

        stat_values = page.locator(".stat-card__value").all_inner_texts()
        check("Admin: dashboard reflects the seeded order (no longer all '—')", "1" in stat_values, f"values={stat_values}")

        page.click(".admin-nav-item:has-text('Orders')")
        page.wait_for_timeout(400)
        check("Admin: seeded order appears in the orders list", seeded_order_id in page.locator(".order-list").inner_text())

        # Advance its status via the real UI button.
        page.click(".order-card .btn--primary")
        page.wait_for_timeout(400)
        check("Admin: status badge updated in the UI after advancing", "PREPARING" in page.locator(".status-badge").inner_text())

        page.reload()
        page.wait_for_timeout(500)
        page.click(".admin-nav-item:has-text('Orders')")
        page.wait_for_timeout(400)
        check(
            "Admin refresh: advanced status (PREPARING) persisted across reload",
            "PREPARING" in page.locator(".order-list").inner_text()
        )

        # =========================================================
        # 5. CORRUPTED STORAGE HANDLED SAFELY
        # =========================================================
        page_errors.clear()

        # 5a. Garbage (unparseable) JSON in a real store key.
        page.evaluate("() => window.localStorage.setItem('teabuddy_store_orders', '{not valid json!!')")
        page.reload()
        page.wait_for_timeout(500)
        check("Corruption: unparseable JSON in orders store does not crash the admin app", len(page_errors) == 0, f"{page_errors}")

        recovered_query = page.evaluate("""
            async () => {
                const storage = await import('/shared/services/storage.js');
                const { COLLECTIONS } = await import('/config/constants.js');
                const result = await storage.query(COLLECTIONS.ORDERS);
                return result.success && Array.isArray(result.data) && result.data.length === 0;
            }
        """)
        check("Corruption: corrupted orders store self-heals to a valid empty store", recovered_query is True)

        # The corrupted key should have been overwritten with a valid,
        # well-shaped store as a side effect of the safe read above.
        healed_shape_ok = page.evaluate("""
            () => {
                try {
                    const raw = window.localStorage.getItem('teabuddy_store_orders');
                    const parsed = JSON.parse(raw);
                    return typeof parsed.version === 'number' && typeof parsed.records === 'object';
                } catch (e) {
                    return false;
                }
            }
        """)
        check("Corruption: the corrupted key is rewritten with a valid {version, records} shape", healed_shape_ok is True)

        # 5b. Valid JSON, but the wrong shape entirely (e.g. an array
        # instead of {version, records}).
        page_errors.clear()
        page.evaluate("() => window.localStorage.setItem('teabuddy_store_cart', JSON.stringify([1,2,3]))")
        page.goto(f"{BASE}/customer/index.html")
        page.wait_for_timeout(400)
        check("Corruption: wrong-shape (but valid JSON) cart store does not crash the customer app", len(page_errors) == 0, f"{page_errors}")
        check("Corruption: app still renders normally (welcome screen present)", page.locator(".welcome-card").count() == 1)

        # 5c. Corrupted order-id sequence counter shouldn't break new order creation.
        page.evaluate("() => window.localStorage.setItem('teabuddy_order_seq', 'not-json-at-all')")
        new_order_after_corruption = page.evaluate("""
            async () => {
                const storage = await import('/shared/services/storage.js');
                const { COLLECTIONS } = await import('/config/constants.js');
                const result = await storage.create(COLLECTIONS.ORDERS, { customer: 'Post-corruption test', items: [], total: 0 });
                return result.success && typeof result.data.orderId === 'string';
            }
        """)
        check("Corruption: order creation still works after a corrupted id-sequence counter", new_order_after_corruption is True)

        browser.close()
        return page_errors


if __name__ == "__main__":
    remaining_errors = run()
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    print(f"RESULTS: {passed} passed, {failed} failed (of {len(results)})")
    if remaining_errors:
        print(f"Uncaught page errors: {remaining_errors}")
    sys.exit(1 if failed > 0 else 0)
