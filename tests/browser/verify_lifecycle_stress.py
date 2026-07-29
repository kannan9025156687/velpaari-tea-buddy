import sys
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
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # ---- Stress test 1: navigate away mid-turn (async typing delay in flight) ----
        page.goto(f"{BASE}/customer/index.html")
        page.wait_for_timeout(300)
        page.click(".welcome-card .btn--primary")
        page.wait_for_timeout(150)
        page.fill(".name-card .text-input", "Priya")
        page.click(".name-card .btn--primary")
        page.wait_for_timeout(100)  # chat is mounting; greeting turn's typing delay is in flight
        page.evaluate("location.hash = '#/welcome'")  # yank the page away mid-turn
        page.wait_for_timeout(1200)  # let the in-flight timers fire against a torn-down DOM, if they do
        check(
            "Stress: navigating away mid-turn produces no uncaught errors",
            len(page_errors) == 0,
            f"errors={page_errors}"
        )
        check("Stress: app recovered cleanly, welcome screen intact", page.locator(".welcome-card").count() == 1)

        # ---- Stress test 2: rapid double-click on a navigation trigger ----
        # Fired via a single page.evaluate() so both click() calls happen in the
        # SAME JS task, with no event-loop yield between them — a true race,
        # unlike two separate Playwright page.click() calls (which have IPC
        # round-trip time between them, long enough for the first click's
        # async hashchange effect to already resolve).
        page_errors.clear()
        page.evaluate("""
            () => {
                const btn = document.querySelector('.welcome-card .btn--primary');
                btn.click();
                btn.click();
            }
        """)
        page.wait_for_timeout(400)
        name_card_count = page.locator(".name-card").count()
        check(
            "Stress: synchronous double-click on Start Ordering mounts exactly one name screen (no duplicate mount)",
            name_card_count == 1,
            f"got {name_card_count} .name-card elements"
        )
        check("Stress: no uncaught errors from the double-click race", len(page_errors) == 0, f"{page_errors}")

        # ---- Stress test 3: repeated mount/unmount cycling (5x) stays clean ----
        for i in range(5):
            page.evaluate("location.hash = '#/welcome'")
            page.wait_for_timeout(80)
            page.evaluate("location.hash = '#/name'")
            page.wait_for_timeout(80)
        welcome_leftover = page.locator(".welcome-card").count()
        name_card_final = page.locator(".name-card").count()
        check(
            "Stress: 5x rapid remount cycle leaves exactly one screen mounted, no accumulation",
            welcome_leftover == 0 and name_card_final == 1,
            f"welcome leftover={welcome_leftover}, name_card={name_card_final}"
        )
        check("Stress: no console errors accumulated during remount cycling", len(console_errors) == 0, f"{console_errors}")

        # ---- Stress test 4: admin — navigate away mid dashboard-load ----
        page_errors.clear()
        console_errors.clear()
        page.goto(f"{BASE}/admin/index.html")
        page.wait_for_timeout(50)  # dashboard's async loadStats()/loadRecentOrders() likely still in flight
        page.evaluate("location.hash = '#/orders'")
        page.wait_for_timeout(600)
        check(
            "Stress: admin navigating away mid-load produces no uncaught errors",
            len(page_errors) == 0,
            f"errors={page_errors}"
        )
        check("Stress: admin orders page intact after the race", page.locator(".filter-bar").count() == 2)
        check("Stress: no leftover dashboard content after the race", page.locator(".stat-grid").count() == 0)

        browser.close()
        return {"console_errors": list(console_errors), "page_errors": list(page_errors)}


if __name__ == "__main__":
    errs = run()
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    print(f"RESULTS: {passed} passed, {failed} failed (of {len(results)})")
    print(f"\nFinal console errors: {errs['console_errors']}")
    print(f"Final page errors: {errs['page_errors']}")
    sys.exit(1 if failed > 0 or any(errs.values()) else 0)
