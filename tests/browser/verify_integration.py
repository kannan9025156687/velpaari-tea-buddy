import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8934"
results = []
console_errors = []
page_errors = []


def check(label, condition, extra=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, label, extra))
    print(f"[{status}] {label}" + (f" — {extra}" if extra else ""))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        def on_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)

        page.on("console", on_console)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # =========================================================
        # CUSTOMER APP
        # =========================================================
        page.goto(f"{BASE}/customer/index.html")
        page.wait_for_timeout(300)

        check("Customer: redirects '/' to #/welcome", page.evaluate("location.hash") == "#/welcome")
        check("Customer: welcome screen rendered", page.locator(".welcome-card").count() == 1)
        check(
            "Customer: business name from businessConfig shown",
            "Velpaari Tea Buddy" in page.locator(".welcome-card .text-display").inner_text()
        )

        # Navigate: Welcome -> Name
        page.click(".welcome-card .btn--primary")
        page.wait_for_timeout(200)
        check("Customer: navigated to #/name", page.evaluate("location.hash") == "#/name")
        check("Customer: welcome screen destroyed (no leftover .welcome-card)", page.locator(".welcome-card").count() == 0)
        check("Customer: name screen rendered", page.locator(".name-card").count() == 1)

        # Empty submit should NOT navigate
        page.click(".name-card .btn--primary")
        page.wait_for_timeout(150)
        check("Customer: empty name does not navigate", page.evaluate("location.hash") == "#/name")

        # Navigate: Name -> Chat
        page.fill(".name-card .text-input", "Kannan")
        page.click(".name-card .btn--primary")
        page.wait_for_timeout(700)  # allow first typing-delay turn to render
        check("Customer: navigated to #/chat", page.evaluate("location.hash") == "#/chat")
        check("Customer: name screen destroyed (no leftover .name-card)", page.locator(".name-card").count() == 0)
        check("Customer: chat shell rendered", page.locator(".chat-shell").count() == 1)

        # Wait for the full greeting turn (2 messages, staggered typing delay) + chips
        page.wait_for_selector(".chips-wrap .chip", timeout=5000)
        greeting_text = page.locator(".chat-area").inner_text()
        check("Customer: greeting uses the entered name (chatEngine + customerSession wired)", "Kannan" in greeting_text)
        check("Customer: header shows business name (businessConfig wired)", "Velpaari Tea Buddy" in page.locator(".header-name").inner_text())

        menu_chip_count_initial = page.locator(".chips-wrap .chip").count()
        check("Customer: main menu chips rendered from businessConfig", menu_chip_count_initial >= 4)

        # ---- Cart wiring: add an item, verify pill updates ----
        check("Customer: cart pill starts at 0", page.locator("#" if False else ".cart-pill-btn b").inner_text() == "0")
        page.click(".chips-wrap .chip >> nth=0")  # first menu item, e.g. Tea Parcel
        page.wait_for_timeout(700)
        page.wait_for_selector(".chips-wrap .chip")
        # quantity chips shown: click "2"
        qty_chip = page.locator(".chips-wrap .chip", has_text="2")
        qty_chip.first.click()
        page.wait_for_timeout(900)  # confirm + possible combo-suggestion turn

        cart_count_after_add = page.locator(".cart-pill-btn b").inner_text()
        check("Customer: cart pill count updated after adding an item (cart.js wired)", cart_count_after_add == "2", f"got '{cart_count_after_add}'")

        # ---- Duplicate-listener check: click qty chip pathway a second, independent time ----
        # (re-open main menu via a fresh item add path and confirm exactly +1 increments, not doubled)
        # First, get back to main menu chips regardless of whether a combo-suggestion turn is showing.
        page.wait_for_timeout(200)
        # If an addon suggestion is showing, skip it to return to main menu deterministically.
        skip_chip = page.locator(".chips-wrap .chip", has_text="Skip")
        if skip_chip.count() > 0:
            skip_chip.first.click()
            page.wait_for_timeout(700)

        page.click(".chips-wrap .chip >> nth=0")
        page.wait_for_timeout(700)
        one_chip = page.locator(".chips-wrap .chip", has_text="1")
        one_chip.first.click()
        page.wait_for_timeout(900)
        cart_count_after_second_add = page.locator(".cart-pill-btn b").inner_text()
        check(
            "Customer: cart increments by exactly the tapped qty (no duplicate listener firing handler twice)",
            cart_count_after_second_add == "3",
            f"got '{cart_count_after_second_add}' (expected 3 = 2 + 1)"
        )

        # ---- Cart drawer: open, verify item rows, qty stepper, remove ----
        page.click(".cart-pill-btn")
        page.wait_for_timeout(200)
        check("Customer: cart drawer opens", "is-open" in (page.locator(".cart-overlay").get_attribute("class") or ""))
        row_count = page.locator(".cart-item-row").count()
        check("Customer: cart drawer shows item rows (uiRenderer wired)", row_count >= 1, f"rows={row_count}")

        # Increment via stepper, verify total row updates
        total_before = page.locator(".cart-drawer .cart-total-row b").inner_text()
        page.locator(".qty-stepper__btn", has_text="+").first.click()
        page.wait_for_timeout(150)
        total_after = page.locator(".cart-drawer .cart-total-row b").inner_text()
        check("Customer: drawer total updates on qty stepper change", total_before != total_after, f"{total_before} -> {total_after}")

        # Remove all rows, verify empty state appears
        remove_buttons = page.locator(".cart-item-row__remove")
        while remove_buttons.count() > 0:
            remove_buttons.first.click()
            page.wait_for_timeout(150)
            remove_buttons = page.locator(".cart-item-row__remove")
        check("Customer: cart empty state shows after removing all items", page.locator(".cart-empty-state").count() == 1)
        check("Customer: cart pill count reflects removal", page.locator(".cart-pill-btn b").inner_text() == "0")

        page.click(".cart-drawer button:has-text('Keep Ordering')")
        page.wait_for_timeout(150)
        check("Customer: cart drawer closes", "is-open" not in (page.locator(".cart-overlay").get_attribute("class") or ""))

        # ---- Checkout boundary: 'finish' with empty cart ----
        finish_chip = page.locator(".chips-wrap .chip", has_text="checkout")
        finish_chip.first.click()
        page.wait_for_timeout(700)
        empty_cart_msg = page.locator(".chat-area").inner_text()
        check("Customer: empty-cart guard on checkout tap (chatEngine business rule)", "haven't ordered anything" in empty_cart_msg)

        # ---- Lifecycle: navigate away from chat and back, verify FRESH state (no leaked cart) ----
        page.evaluate("location.hash = '#/welcome'")
        page.wait_for_timeout(200)
        check("Customer: back to welcome screen", page.locator(".welcome-card").count() == 1)
        page.evaluate("location.hash = '#/chat'")
        page.wait_for_timeout(800)
        msg_rows_after_remount = page.locator(".msg-row").count()
        cart_after_remount = page.locator(".cart-pill-btn b").inner_text()
        check(
            "Customer: remounting chatPage creates a FRESH engine/cart (old messages/cart don't leak)",
            cart_after_remount == "0",
            f"cart count after remount = '{cart_after_remount}'"
        )
        check("Customer: remounted chat starts with only the greeting turn's messages (no duplication)", msg_rows_after_remount == 2, f"got {msg_rows_after_remount} msg-rows")

        # ---- Unknown hash falls back to default route ----
        page.evaluate("location.hash = '#/nonexistent'")
        page.wait_for_timeout(300)
        check("Customer: unknown route redirects to default (#/welcome)", page.evaluate("location.hash") == "#/welcome")

        customer_console_errors = list(console_errors)
        customer_page_errors = list(page_errors)
        console_errors.clear()
        page_errors.clear()

        # =========================================================
        # ADMIN APP
        # =========================================================
        page.goto(f"{BASE}/admin/index.html")
        page.wait_for_timeout(600)

        check("Admin: redirects '/' to #/dashboard", page.evaluate("location.hash") == "#/dashboard")
        check("Admin: dashboard nav item active", "admin-nav-item--active" in (page.locator(".admin-nav-item", has_text="Dashboard").get_attribute("class") or ""))
        check("Admin: stat grid rendered with widgets from DASHBOARD_WIDGETS", page.locator(".stat-card").count() == 4)

        stat_values = page.locator(".stat-card__value").all_inner_texts()
        check(
            "Admin: Phase 8 — storage adapter now registered, widgets show real computed zeros (not '—', not fake numbers)",
            stat_values == ["0", "₹0", "0", "0"],
            f"values={stat_values}"
        )

        check(
            "Admin: recent orders shows the shared empty-state component (genuinely zero orders, not a connectivity failure)",
            "No orders yet" in page.locator(".order-list").inner_text()
        )

        # Navigate: Dashboard -> Orders via bottom nav
        page.click(".admin-nav-item:has-text('Orders')")
        page.wait_for_timeout(400)
        check("Admin: navigated to #/orders", page.evaluate("location.hash") == "#/orders")
        check("Admin: dashboard content destroyed (no leftover .stat-grid)", page.locator(".stat-grid").count() == 0)
        check("Admin: orders nav item active", "admin-nav-item--active" in (page.locator(".admin-nav-item", has_text="Orders").get_attribute("class") or ""))
        check("Admin: filter bar rendered", page.locator(".search-field").count() == 1)
        status_chip_count = page.locator(".filter-chip").count()
        check("Admin: status filter chips built from ORDER_STATUS enum", status_chip_count == 5, f"got {status_chip_count} (All + 4 statuses)")
        check("Admin: orders list empty state shown (genuinely zero orders)", "No orders found" in page.locator(".order-list").inner_text())

        # Search field interaction (client-side filter wiring, even with 0 orders)
        page.fill(".search-field .text-input", "TB-2026")
        page.wait_for_timeout(150)
        check("Admin: search field gets has-value class on input", "has-value" in (page.locator(".search-field").get_attribute("class") or ""))
        page.click(".search-field__clear")
        page.wait_for_timeout(150)
        check("Admin: clear button empties search field", page.locator(".search-field .text-input").input_value() == "")

        # Navigate directly to an order-detail route with a dynamic :id param
        page.evaluate("location.hash = '#/orders/TB-TEST-0001'")
        page.wait_for_timeout(400)
        check("Admin: dynamic :id route param resolved (order-detail page mounted)", page.locator(".admin-header__title h1").inner_text() == "Order Detail")
        check("Admin: orders list destroyed on navigation to detail (no leftover .order-list from Orders page)", page.locator(".filter-bar").count() == 0)
        check(
            "Admin: order-detail shows genuine 'not found' for an id that was never created (query succeeds, record doesn't exist)",
            "Order not found" in page.locator(".empty-state").inner_text()
        )

        # Back button wiring
        page.click(".admin-header .btn--icon")
        page.wait_for_timeout(300)
        check("Admin: back button navigates to #/orders", page.evaluate("location.hash") == "#/orders")

        # Unknown hash falls back to default route
        page.evaluate("location.hash = '#/nope'")
        page.wait_for_timeout(300)
        check("Admin: unknown route redirects to default (#/dashboard)", page.evaluate("location.hash") == "#/dashboard")

        # ---- Phase 8: verify the storage adapter IS registered (superseding the Integration phase's "must stay disconnected" check) ----
        adapter_state = page.evaluate("""
            () => import('/shared/services/storage.js').then(m => m.getAdapter())
        """)
        check("Admin: Phase 8 — storage.getAdapter() is now registered (not null)", adapter_state is not None, f"got {adapter_state}")

        admin_console_errors = list(console_errors)
        admin_page_errors = list(page_errors)

        browser.close()

        return {
            "customer_console_errors": customer_console_errors,
            "customer_page_errors": customer_page_errors,
            "admin_console_errors": admin_console_errors,
            "admin_page_errors": admin_page_errors,
        }


if __name__ == "__main__":
    errs = run()

    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    print(f"RESULTS: {passed} passed, {failed} failed (of {len(results)})")

    for label, errlist in [
        ("Customer console errors", errs["customer_console_errors"]),
        ("Customer page (uncaught) errors", errs["customer_page_errors"]),
        ("Admin console errors", errs["admin_console_errors"]),
        ("Admin page (uncaught) errors", errs["admin_page_errors"]),
    ]:
        print(f"\n{label}: {len(errlist)}")
        for e in errlist:
            print(f"   - {e}")

    if failed > 0 or any(errs.values()):
        sys.exit(1)
    sys.exit(0)
