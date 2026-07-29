# Design System — Velpaari Tea Buddy

This document defines every visual and interaction rule both `customer/` and `admin/` must follow. It is the reference `shared/components/*`, both apps' CSS files, and every page built from Phase 4 onward will be built against. Token values here (colors, spacing, etc.) are the literal values that will later be written into `customer/css/theme.css`, `admin/css/admin-theme.css`, and `shared/components/components.css` — nothing here is placeholder.

No HTML, CSS, or JS files are created in this document. This is specification only.

---

## 1. Design Philosophy

**"A chat with a friendly tea shop owner, not a form on a screen."**

Five principles govern every design decision in this system:

1. **Conversation over configuration.** The customer app never presents a grid, a filter, or a settings panel. One question, one answer, one moment at a time — the interface disappears behind the conversation.
2. **Gen-Z warmth, not corporate polish.** Gradients, glassmorphism, playful emoji, and micro-celebrations (confetti, pulse animations) are core to the brand, not decoration bolted on afterward. The app should feel screenshot-worthy.
3. **Staff efficiency over staff delight.** `admin/` inherits the same visual language (same tokens, same components) but is optimized for fast scanning and one-tap status changes — density and clarity outrank playfulness there. Same system, different emphasis.
4. **Mobile is the only screen that matters first.** Every rule in this document is authored mobile-first; desktop is a graceful widening, never the design target.
5. **Depth through glass, not through borders.** Hierarchy is communicated with blur, translucency, and elevation (shadow) rather than hard rules and boxes wherever possible — consistent with the glassmorphism direction already established in this project's earlier prototypes.

---

## 2. Color Palette

### 2.1 Brand gradient (identity — used sparingly, for hero moments only)

| Token | Value | Used for |
|---|---|---|
| `--grad-violet` | `#7b6cff` | Gradient stop, welcome screen, brand accents |
| `--grad-pink` | `#ff6ec7` | Gradient stop, combo-suggestion highlights |
| `--grad-orange` | `#ff9a6c` | Gradient stop, location/geolocation actions |
| `--grad-teal` | `#22d1c1` | Primary action color (buttons, links, confirm states) |
| `--grad-blue` | `#3fa9ff` | Secondary accent, paired with teal on primary buttons |

The brand gradient (`violet → pink → orange`) is reserved for: the welcome screen background, the logo orb, and the "Order Confirmed" success card. It is **never** used as a text color or a body background for ordinary content — at that scale it becomes noise, not identity.

### 2.2 Dark theme (default)

| Token | Value | Role |
|---|---|---|
| `--bg-grad-1` | `#1a123a` | Background gradient stop 1 |
| `--bg-grad-2` | `#3a1440` | Background gradient stop 2 |
| `--bg-grad-3` | `#2a0f30` | Background gradient stop 3 |
| `--glass-bg` | `rgba(255,255,255,0.10)` | Card/surface fill |
| `--glass-border` | `rgba(255,255,255,0.28)` | Card/surface border |
| `--text-primary` | `#fffaf6` | Primary text |
| `--text-dim` | `rgba(255,250,246,0.70)` | Secondary/meta text |
| `--bubble-bot` | `rgba(255,255,255,0.14)` | Assistant chat bubble fill |
| `--bubble-bot-border` | `rgba(255,255,255,0.18)` | Assistant chat bubble border |
| `--input-bg` | `rgba(255,255,255,0.18)` | Text input fill |
| `--header-bg` | `rgba(255,255,255,0.10)` | Header/nav bar fill |
| `--drawer-bg` | `rgba(30,20,50,0.92)` | Cart drawer / bottom sheet fill |

### 2.3 Light theme

| Token | Value | Role |
|---|---|---|
| `--bg-grad-1` | `#fff1e6` | Background gradient stop 1 |
| `--bg-grad-2` | `#ffe0f0` | Background gradient stop 2 |
| `--bg-grad-3` | `#e8f9f6` | Background gradient stop 3 |
| `--glass-bg` | `rgba(255,255,255,0.55)` | Card/surface fill |
| `--glass-border` | `rgba(255,255,255,0.90)` | Card/surface border |
| `--text-primary` | `#2a1a35` | Primary text |
| `--text-dim` | `rgba(42,26,53,0.65)` | Secondary/meta text |
| `--bubble-bot` | `rgba(255,255,255,0.75)` | Assistant chat bubble fill |
| `--bubble-bot-border` | `rgba(255,255,255,0.90)` | Assistant chat bubble border |
| `--input-bg` | `rgba(255,255,255,0.75)` | Text input fill |
| `--header-bg` | `rgba(255,255,255,0.55)` | Header/nav bar fill |
| `--drawer-bg` | `rgba(255,255,255,0.97)` | Cart drawer / bottom sheet fill |

Theme switching is a single `data-theme="dark"|"light"` attribute on `<html>`, matching the token-swap approach already proven in this project's earlier prototype — no component ever hardcodes a color outside these tokens.

### 2.4 Semantic colors (theme-independent)

| Token | Value | Role |
|---|---|---|
| `--success` | `#3cff9e` | Confirmations, "Ready", positive toasts |
| `--warning` | `#ffd166` | Pending states, prep-time badge |
| `--danger` | `#ff5c7a` | Remove actions, error toasts, destructive dialog confirm |
| `--info` | `#3fa9ff` | Informational toasts, links |
| `--whatsapp` | `#25d366` | Reserved only if a WhatsApp touchpoint is reintroduced later — not used in the current no-WhatsApp ordering flow |

---

## 3. Typography

**Font stack** (no self-hosted font required unless brand needs dictate otherwise later; system font stack keeps load time minimal, matching the "fast loading" requirement):

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

If a distinct display face is added later for brand headlines (e.g. for the welcome screen's `Velpaari Tea Buddy` title), it lives in `assets/fonts/` and is layered in as a `--font-display` token without changing this stack for body/UI text.

### Type scale (mobile-first; all values in px for clarity, implemented as `rem`)

| Token | Size | Weight | Line height | Used for |
|---|---|---|---|---|
| `--text-display` | 30px | 800 | 1.15 | Brand title (welcome screen) |
| `--text-h1` | 22px | 800 | 1.25 | Page/screen titles ("Order Review", "Dashboard") |
| `--text-h2` | 17px | 700 | 1.3 | Card titles, section headers |
| `--text-body` | 14.5px | 400–500 | 1.45 | Chat bubbles, body copy |
| `--text-label` | 13.5px | 600 | 1.3 | Chips, buttons, form labels |
| `--text-meta` | 12px | 400 | 1.3 | Timestamps, secondary metadata |
| `--text-micro` | 10.5px | 400 | 1.2 | Bubble timestamps, fine print |

**Rule:** body copy never drops below 14px on mobile (readability floor); metadata never drops below 10.5px (accessibility floor — see §16).

---

## 4. Spacing System

An 4px-based scale, used for all padding, margin, and gap values — no arbitrary spacing values anywhere in the codebase:

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-7` | 32px |
| `--space-8` | 40px |

**Common applications:**
- Chat bubble padding: `--space-2` top/bottom, `--space-3` + `--space-1` sides
- Card padding: `--space-4` to `--space-5`
- Screen edge padding: `--space-5`
- Gap between chips: `--space-2`
- Gap between stacked cards: `--space-2` to `--space-3`

---

## 5. Border Radius System

| Token | Value | Used for |
|---|---|---|
| `--radius-pill` | 999px (fully rounded) | Chips, buttons, input fields, cart pill |
| `--radius-lg` | 26px | Glass cards, welcome/name screens, bottom sheet top corners |
| `--radius-md` | 18px | Chat bubbles (non-tail corner), receipt cards, order cards |
| `--radius-sm` | 12px | Small nested elements (qty stepper buttons' container, icon buttons) |
| `--radius-tail` | 4px | The "tail" corner of a chat bubble (top-left for bot, top-right for user) — the one corner that breaks full rounding, which is what reads as a chat bubble rather than a generic card |
| `--radius-circle` | 50% | Avatars, FABs, icon buttons, online-status dot |

---

## 6. Shadow System

Shadows in this system are deliberately soft and warm-tinted (never pure black) to stay consistent with the gradient/glass aesthetic.

| Token | Value | Used for |
|---|---|---|
| `--shadow-soft` | `0 8px 32px rgba(20,10,40,0.35)` | Glass cards (welcome/name screens) |
| `--shadow-card` | `0 3px 10px rgba(0,0,0,0.12)` | Chat bubbles, order cards |
| `--shadow-fab` | `0 6px 16px rgba(34,209,193,0.40)` | Send button, primary FAB actions — tinted with the action's own color, not neutral black |
| `--shadow-drawer` | `0 -10px 40px rgba(0,0,0,0.35)` | Cart drawer / bottom sheets, floating upward from the bottom edge |
| `--shadow-toast` | `0 6px 20px rgba(0,0,0,0.25)` | Toast notifications |

**Rule:** exactly one shadow level per element — never stack multiple shadow tokens on the same element, which flattens the intended depth hierarchy.

---

## 7. Icon Guidelines

This system uses **emoji as the primary icon language**, not an icon font or SVG icon set — consistent with the brand's established Gen-Z, conversational tone, and it ships with zero additional asset weight.

**Rules:**
- One emoji per action/state maximum — never stack two emoji for one meaning (e.g. "✅🎉" as a single label is avoided in favor of picking the one that fits the moment).
- Emoji must render consistently enough across platforms to be recognizable — stick to well-supported, unambiguous emoji (☕ 🍵 🍪 📍 🛍️ ✅ ✏️ 🎉 ⏱️ 🔥) and avoid rare or platform-inconsistent glyphs.
- **Functional icons that must be pixel-precise** (send button, close ✕, chevrons for navigation) use inline SVG, not emoji — emoji at small sizes/tight alignment (e.g. inside a 44px FAB) render inconsistently across devices. This is the one exception to the emoji-first rule.
- Admin dashboard status badges pair a small color dot (see §13) with a text label, not an icon alone — status must never be conveyed by color/icon shape alone (see §16, Accessibility).
- Icon-only buttons (no visible text label) always carry an `aria-label` — required, not optional (see §16).

---

## 8. Button Variants

All buttons share: `--radius-pill` corners, `--text-label` typography, minimum **44×44px** tap target (see §15), and a `transform: scale(0.9–0.96)` active-state press feedback — no button in this system is without tactile press feedback.

| Variant | Fill | Text color | Used for |
|---|---|---|---|
| **Primary** | `linear-gradient(135deg, var(--grad-teal), var(--grad-blue))` | Dark (`#062526`) | Main CTA per screen: "Continue", "Confirm Order", "Checkout" |
| **Accent chip** | Same gradient as Primary, smaller/pill | Dark | The one "best next step" chip among a set of chat chips (e.g. "I'm done, checkout") |
| **Secondary / Ghost** | Transparent, `1.4px` `--glass-border` outline | `--text-primary` | Non-committal choices: "Skip", "Back", secondary chips |
| **Standard chip** | `--glass-bg` fill, `--glass-border` outline | `--text-primary` | Ordinary chat chip options (menu items, quantities) |
| **Danger** | `--danger` fill (solid, not gradient) | White | Admin: cancel order, remove cart item confirm |
| **Icon button (FAB)** | Gradient fill, `--radius-circle`, `--shadow-fab` | Dark | Send message, floating actions |
| **Icon button (ghost)** | `--glass-bg` fill, `--radius-circle` | `--text-primary` | Close (✕), theme toggle |

**Disabled state** (any variant): `opacity: 0.45`, no press transform, `cursor: not-allowed` — never removed from layout (no layout shift when a button becomes disabled, e.g. "Confirm Order" while a cart is empty).

---

## 9. Input Components

| Component | Spec |
|---|---|
| **Text input** (chat composer, name field) | `--radius-pill`, `--input-bg` fill, `--glass-border` outline, `--space-3` vertical / `--space-4` horizontal padding, placeholder in `--text-dim` |
| **Quantity stepper** | Circular `−` / `+` buttons (`--radius-circle`, 28px), current value centered between them at `--text-label` weight — never a raw `<input type="number">`, which is harder to tap precisely on mobile |
| **Chip select** (menu choices, quantity shortcuts) | See Standard/Accent/Ghost chip specs in §8 — chips are the primary input method in the customer chat, deliberately preferred over dropdowns/selects |
| **Search field** (admin order list) | Same as text input, with a leading 🔍 and a trailing ✕ clear button that only appears once text is entered |
| **Toggle** (theme switch) | Single icon button (🌙/☀️) rather than a switch track — consistent with the emoji-icon system in §7, and reduces visual weight in the header |

**Focus state (all inputs):** a `2px` outline in `--grad-teal` at `60%` opacity, offset `2px` — required for keyboard navigation visibility (§16), and never removed via `outline: none` without this replacement.

---

## 10. Cards

Three card types cover every non-chat surface in both apps:

1. **Glass card** — full-screen-anchored surfaces (welcome, name entry). `--radius-lg`, `--glass-bg`, `--shadow-soft`, generous internal padding (`--space-7`).
2. **Receipt / summary card** — in-chat structured content (full menu, order review, order confirmed). `--radius-md`, `--bubble-bot` fill, `--shadow-card`, internal rows separated by a 1px dashed `--glass-border` divider, a gradient-text title (`.r-title`, using the brand gradient as a `background-clip: text` treatment — the one place gradient-as-text is permitted, reserved for card titles only).
3. **Order card** (admin) — one order per card in the admin order list. `--radius-md`, `--glass-bg`, `--shadow-card`. See §12 for its specific anatomy.

**Rule:** cards never nest inside cards. If content needs sub-grouping (e.g. an item list inside an order card), sub-groups use a plain divider (dashed `--glass-border` line) or a subtle background-shade change, never a second card shadow inside the first.

---

## 11. Chat Bubble Design

The core visual signature of the customer app.

| Property | Bot bubble | User bubble |
|---|---|---|
| Alignment | Left | Right |
| Fill | `--bubble-bot` | `linear-gradient(135deg, #22d1c1, #3fa9ff)` (solid teal-blue gradient, not glass) |
| Text color | `--text-primary` | `#052226` (dark, for contrast against the light gradient fill) |
| Border | `1px solid --bubble-bot-border` | None |
| Radius | `--radius-md`, tail corner `--radius-tail` at **top-left** | `--radius-md`, tail corner `--radius-tail` at **top-right** |
| Max width | 80% of chat column | 80% of chat column |
| Meta row | Timestamp only, `--text-micro`, right-aligned inside bubble | Timestamp **plus** double-checkmark (✓✓) read-receipt glyph, right-aligned inside bubble |
| Entrance animation | Fade + slight upward translate (`opacity 0→1`, `translateY 10px→0`, `scale 0.98→1`), 250ms ease | Same |

**Typing indicator:** a bot-styled bubble (same fill/border/radius as a bot bubble) containing three dots that pulse in sequence (`0ms, 200ms, 400ms` stagger), shown for a randomized 450–950ms before every bot message — this randomization is intentional (a fixed delay reads as robotic; a randomized one reads as a person typing).

**Rich content in bubbles:** when a bot message needs structure beyond a sentence (menu, order review, confirmation), it is **not** forced into a text bubble — it renders as a Receipt Card (§10.2) instead, still left-aligned in the message flow like a bot bubble, but without the bubble's tail/fill treatment, so structured and conversational content stay visually distinct.

---

## 12. Order Card Design (Admin)

Each order in the admin order list is one card with this fixed anatomy, top to bottom:

1. **Header row** — Order ID (`--text-h2`, bold) left-aligned, Status Badge (§13) right-aligned.
2. **Customer row** — name + phone (if present), `--text-body`.
3. **Items list** — compact, one line per item (`{qty}× {name}` — `{price}`), `--text-body`, no dividers between items (divider only separates this block from the next).
4. **Total row** — right-aligned, `--text-h2` weight, visually the heaviest text element after the Order ID.
5. **Action row** — three icon buttons, equal width, left to right: 🗺️ Maps, 📞 Call, and (if reintroduced later) 💬 WhatsApp — each opens its respective external link/app, never navigates within the admin app itself.
6. **Status action row** — a single primary-variant button showing the **next** status only (e.g. if current status is `NEW`, the button reads "Start Preparing →"; if `PREPARING`, "Mark Ready →") — never a 4-way selector. This keeps the one-tap efficiency principle from §1 concrete: staff always have exactly one obvious next action, never a decision.
7. **Timestamp footer** — relative time ("2 min ago"), `--text-meta`, bottom-right.

Cards are sorted newest-first by default and a **new incoming order animates in** with a brief highlight pulse (background flashes to a soft `--success`-tinted glow for ~1.5s, then settles to the normal card fill) so staff visually catch it even before the notification sound/badge registers.

---

## 13. Status Colors

| Status | Color token | Badge fill | Meaning |
|---|---|---|---|
| `NEW` | `--info` (`#3fa9ff`) | Solid, white text | Just placed, not yet acknowledged |
| `PREPARING` | `--warning` (`#ffd166`) | Solid, dark text | Staff actively making it |
| `READY` | `--success` (`#3cff9e`) | Solid, dark text | Ready for pickup/handover |
| `COMPLETED` | `--text-dim` (theme's dim text color, low-emphasis) | Outline only, no fill | Finished — intentionally the least visually prominent state, so completed orders recede in a scanning list without being hidden |

Every status badge is **text + color together**, never color alone (a colorblind-safe requirement — see §16). The text label is always the literal status word, never abbreviated.

---

## 14. Animations

All animations in this system serve one of three purposes only: **feedback** (did my tap register?), **orientation** (where did this new thing come from?), or **delight** (a deliberately rare celebration moment). Nothing animates purely decoratively on a loop except the background gradient (§14.4) and the online-status dot, both of which are ambient/peripheral, not attention-demanding.

### 14.1 Feedback animations
- Button/chip press: `transform: scale(0.88–0.96)` on `:active`, 150ms ease.
- Cart pill pulse on item add/remove: `scale(1.15)` and back, 250ms.
- Theme toggle: icon rotates 15° on press.

### 14.2 Orientation animations
- New chat message: fade + upward slide, 250ms ease (§11).
- New chip set appearing: same fade+slide as a message.
- Cart drawer open/close: `translateY(100%→0)`, 320ms `cubic-bezier(.2,.8,.2,1)` — a deliberately springy easing so the drawer feels "thrown" open rather than mechanically sliding.
- New admin order card: highlight-pulse as described in §12.

### 14.3 Delight animations (rare, high-impact)
- **Confetti burst** — exactly one moment: order confirmation. ~60 pieces, randomized color (from the 5 brand tokens + `--success`), randomized fall duration (2.2–3.8s), randomized rotation, cleared from the DOM after 4.2s. Never triggered more than once per order, never used for smaller confirmations (adding a cart item does **not** get confetti — reserving it for the order-confirmed moment is what keeps it special).
- **Logo orb pulse** — a slow (3s) breathing scale animation on the welcome screen's logo, ambient enough not to be distracting.

### 14.4 Ambient animation
- Background gradient slowly shifts position (18s ease-in-out loop) and three blurred "blob" shapes drift independently (12–16s loops) — this is the one continuous-loop animation permitted in the system, kept slow and low-contrast enough to sit behind content without competing for attention.

### 14.5 Reduced motion

Every animation in §14.1–14.4 must be suppressed or substantially reduced when `prefers-reduced-motion: reduce` is set — see §16.

---

## 15. Mobile Design Rules

1. **Design canvas:** 375px width is the primary reference (iPhone SE / small Android baseline) for phone-width layouts in both apps; layouts must not break below 360px. **Customer app:** max content width is capped at 480px on every viewport, even desktop browsers — this is a mobile chat experience everywhere, not a responsive breakpoint system. **Admin app:** mobile-first with the same 480px cap on phones, but automatically expands into a wider dashboard layout at tablet (≥768px, up to 900px) and desktop (≥1200px, up to 1200px) breakpoints — staff using a tablet or desktop browser get a real dashboard, not a stretched phone layout. This is the one deliberate layout divergence between the two apps; every other rule in this section applies to both equally.
2. **Minimum tap target:** 44×44px for every interactive element, including icon-only buttons — no exceptions, including inside dense admin cards.
3. **No hover-dependent functionality.** Anything revealed on `:hover` in a desktop-era pattern must have a tap-triggered equivalent (e.g. the search-field clear button appears based on input state, not hover).
4. **Bottom-anchored primary actions.** On the customer app, the message composer and cart-checkout action stay fixed at the bottom of the viewport — the natural thumb zone — never at the top.
5. **Bottom sheets over modals for mobile-native feel.** The cart drawer is a bottom sheet (slides up from the bottom edge), not a centered modal — centered modals are reserved for short confirm/cancel dialogs only (§ dialog component).
6. **Safe-area awareness.** All fixed bottom elements respect `env(safe-area-inset-bottom)` padding for devices with a home indicator.
7. **No horizontal scrolling**, except deliberately for a chip row that overflows its container (chips scroll horizontally as a single row rather than wrapping, when a chat step has many options) — the only intentional horizontal-scroll surface in the system.
8. **Viewport lock during chat.** `user-scalable=no` is set on the customer app (already established in the prototype) since pinch-zoom would break the chat-app illusion; this is **not** applied to the admin app, where staff may need to zoom into dense data.

---

## 16. Accessibility Guidelines

1. **Color contrast.** All `--text-primary` on `--glass-bg`/`--bubble-bot` combinations must meet **WCAG AA (4.5:1)** for body text in both themes — glassmorphism's translucency is the main risk here, so `--glass-bg` opacity values in §2 have been chosen specifically to keep this ratio, not for aesthetics alone. Any new surface color introduced later must be contrast-checked before use, not assumed safe.
2. **Never color-alone.** Status badges (§13), form validation states, and any other color-coded meaning must always pair with text or an icon — never rely on color alone to communicate state.
3. **Focus visibility.** Every interactive element has a visible focus state (§9) — `outline: none` is never used without an equivalent replacement.
4. **Icon-only buttons require `aria-label`.** No exceptions — every close (✕), theme toggle, and admin quick-action icon button carries a descriptive label for screen readers.
5. **Semantic structure.** Screens use real heading levels (`<h1>` for the page's primary heading, `<h2>` for card/section titles) rather than styled `<div>`s standing in for headings — this matters for both apps but especially the admin dashboard, which a staff member may navigate with assistive tech during a busy shift.
6. **Live region for chat.** New bot/user messages append to a container marked so screen readers announce new content (`aria-live="polite"`) — without this, a screen-reader user gets no signal that the assistant has responded.
7. **`prefers-reduced-motion` support.** When set, all animations in §14 either skip their transform/scale entirely or are reduced to a simple opacity fade under 150ms — confetti (§14.3) is replaced with a static success icon rather than suppressed entirely, so the celebratory *moment* is preserved even when motion is not.
8. **Form labels.** The name-entry input and admin search field always have an associated `<label>` (visually hidden if needed via a standard sr-only pattern, not omitted) — placeholder text is never the only label.
9. **Touch + keyboard parity.** Every chip, card action, and drawer control must be reachable and operable via keyboard (`Tab` + `Enter`/`Space`), not just touch/click — relevant primarily for the admin app, where a desktop browser + keyboard is a plausible usage mode.
10. **Language.** `<html lang="en">` is set correctly; if Tamil content is reintroduced in a future phase, the relevant containing element gets `lang="ta"` so screen readers switch pronunciation correctly.

---

## Summary — what's locked by this document

Every token table above (colors, spacing, radius, shadow, type scale) becomes the literal contents of `customer/css/theme.css`, `admin/css/admin-theme.css`, and `shared/components/components.css` when Phase 3 begins. No new color, spacing value, or radius may be introduced ad hoc in a component — if a value isn't in this document, it doesn't exist yet, and this document is updated first.

Waiting for approval before Phase 3 (complete UI layout).
