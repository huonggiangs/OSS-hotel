# ANIO Design System

## Sources
- GitHub: [huonggiangs/pms](https://github.com/huonggiangs/pms) — "Phần mềm quản lý khách sạn" (hotel management software). At the time this system was built, the repo contained only a placeholder README with no code, UI, or tokens. Explore it yourself for anything added since.
- Figma: **PMS Manager.fig** (pages: Design-System, User-Application, Handyman-Application, Provider-Application, Components) — the primary source for every token, component and screen in this system.
- Figma: **Handyman Figma File.fig** — the Handyman-Application page (field-technician mobile app).
- Neither Figma file is a public URL; they were mounted directly by the user. Re-attach them (Import menu) to go deeper than this system does.

## What ANIO actually is
Despite the "hotel management software" framing in the empty GitHub repo, the attached Figma files describe **a home/facility services marketplace** — closer to Urban Company or TaskRabbit than a hotel PMS: customers book services (cleaning, painting, electronics repair, plumbing) from a **Provider** (a services business) who dispatches **Handymen** (field technicians) to do the job. There are three real products in the Figma:

1. **User App** — the customer-facing mobile app: browse/search services, book, chat, pay, review.
2. **Handyman App** — the field technician's mobile app: see assigned jobs, navigate, mark progress, upload proof, get paid.
3. **Provider App** — the services-business owner's mobile app: manage bookings, roster handymen, add services, track revenue/payouts.

Per the user's brief, this system repurposes that same marketplace as a **hotel's maintenance/repair vendor network** (Provider/Handyman = the hotel's repair partners) and pairs it with a **new web dashboard** — a hotel Property Management System (PMS) with an OTA channel manager (Booking.com / Agoda / Airbnb), modeled on category leaders like eZCloud and BlueJay. That web dashboard is an **original build** on ANIO's visual language — it is not a Figma recreation, since no hotel-PMS web UI exists in the source files.

## Products in this design system
- **User App** (`ui_kits/user-app`) — faithful recreation, mobile.
- **Handyman App** (`ui_kits/handyman-app`) — faithful recreation, mobile.
- **Provider App** (`ui_kits/provider-app`) — faithful recreation, mobile.
- **Hotel PMS Web Dashboard** (`ui_kits/hotel-pms-web`) — new, using ANIO's tokens/components; covers reservations, room status, channel manager.

## Content fundamentals
- **Voice**: plain, friendly, task-first. Greetings are personal and casual — "Hello, John!", "Hello, Provider Demo", "Welcome Back" — never corporate. Body copy is direct and short ("Search here...", "Give your estimate price here", "Enter bid price").
- **Address**: second person in prompts and forms ("Your Are Leaving" [sic, kept as authored], "your premium plan is expired"); first person from the product only in confirmations ("Successfully send your withdrawal request!" [sic]).
- **Casing**: sentence case everywhere — buttons, headers, labels. No ALL CAPS, no title-case navigation.
- **Status words**: short, single/two-word states — Pending, Accepted, In Progress, Completed, Failed, Hold, Rejected, On Going.
- **Numbers/money**: `$` prefix, no currency switching seen; percentages for discounts ("5% off").
- **Emoji**: none observed anywhere in the kit. Do not introduce them.
- **Errors/empty states**: light self-deprecating tone even on churn ("Oh No, Your Are Leaving") rather than blunt system language.

## Visual foundations
- **Color**: one primary — indigo-purple `#5F60B9` — used for CTAs, active nav, highlights. Near-black `#1C1F34` for headings/hero surfaces, slate `#6C757D` for body text, `#F6F7F9` background, `#EBEBEB` borders, white cards. Semantic accents layered on top: gold `#FFBD00`/`#FFF07C` (secondary/highlight), green `#39B54A`/`#3CAE5C` (success), red `#EA2F2F`/`#FB2F2F` (danger), orange `#FC7F3A` (warning). Max one saturated accent per screen — status badges are the only place multiple accents co-occur.
- **Type**: Inter for UI text, Work Sans for a handful of secondary/heading contexts. Scale runs Heading1 38px down through Heading6 14px, Body 14px/24px, mini-description 12px/22px, buttons 14px/24px semibold, links 12px/22px semibold. No display/serif face — everything is a grotesque sans.
- **Spacing**: tight, consistent gutters (16–24px section padding, 8–16px internal card gaps). Nothing sits on a strict 4/8 grid — the kit uses its own values (5px/10px/16px/20px radii, 24px/32px paddings) verbatim.
- **Backgrounds**: flat `#F6F7F9` app background under white cards — no gradients, no photography-as-background, no textures/patterns. The one full-bleed image use is a cover photo on a couple of promo/service cards.
- **Shadows/elevation**: soft, warm-black drop shadows only — `4px 4px 20px rgba(0,0,0,0.1)` for cards, `10px 10px 45px rgba(0,0,0,0.1)` for elevated/floating panels. No inner shadows, no colored glows.
- **Corners**: generously rounded — 5px on small chips, 10–20px on cards/panels, full pill on buttons and status badges.
- **Borders**: 1px hairline `#EBEBEB`, used sparingly (inputs, dividers) — most separation comes from shadow + white-on-grey, not borders.
- **Cards**: white surface, 10–20px radius, soft drop shadow, no border. Status/booking cards lead with a colored pill badge top-right.
- **Buttons**: primary = solid purple pill/rounded-rect, white text, semibold 14px. Secondary = outline or plain link in purple. No gradient buttons.
- **Hover/press**: the kit's own "Hover"/"On click" variants darken toward the heading-ink color rather than lightening — treat press states as a subtle darken, not a scale/shrink effect.
- **Animation**: none specified in the source (static Figma frames) — keep transitions minimal/functional (fades, no bounce) when adding motion.
- **Imagery tone**: the few real photos in the kit (service/job photography) are naturalistic, warm-lit, no filters or heavy grain.
- **Layout**: mobile-first, single-column, bottom tab bar navigation (4–5 items) across all three apps. No fixed headers beyond a simple top bar; content scrolls under it.
- **Transparency/blur**: not used — every surface is opaque.

## Iconography
- Icon family is **[Iconly](https://iconly.pro/)** (Light / Bold / Regular-Light / Regular-Bold styles), used as inline vector symbols sized 14–24px, single-color, recolored via the current text color (no multi-color icons). Extracted 61 of these glyphs verbatim from the Figma into `assets/icons/icon-data.js` — render any of them with `<Icon name="IconlyLightHome" />` (see `assets/icons/Icon.d.ts` for the full name list).
- No emoji, no unicode-as-icon usage anywhere in the kit.
- **Intentional addition**: the flags are matched to the kit's own `AE`/`AL`/`DE`/`ES`/`FR`/`IN`/`MC`/`NL`/`NZ`/`PT`/`RU`/`TR`/`US`/`VN` symbols directly (not an approximation) — these ARE real Iconly-adjacent kit components, just organized into `assets/flags/` for clarity.
- `assets/logo-mark.svg` — a generic person/house silhouette used as a placeholder avatar mark in the Design-System page (not a wordmark).
- `assets/handyman-cover.jpg` — the one genuine logo mark found in the source: a purple house-with-hammer icon used for the Handyman product. No other product (User, Provider, or the company overall) has a designed logo in the source — the `thumbnail.html` and web dashboard therefore render **"ANIO" as plain wordmark type**, per instructions never to invent a logo.

## Fonts
Inter and Work Sans are both loaded from Google Fonts (`tokens/typography.css`) — both are the kit's real typefaces, no substitution needed. Other one-off families seen only inside the Design-System specimen page itself (Outfit, Mada, Lexend Deca, Poppins, Roboto, SF Pro) are labels for the specimen card, not real product type, and were not adopted.

## Components
Built from the Figma kit's own component set (69 local + shared instances), grouped by concern:
- `components/forms/` — Button, LargeButton, Link, TitleAndLinkBtn, FormField, Dropdown, Search
- `components/cards/` — BookingCard, BookingListCard, Service, PriceDetail, UserPriceDetail, BidList, Packages, Reviews, Rating, Quantity
- `components/feedback/` — Notification, Steps, Status, Accept, Cancel, Completed, Failed, Hold, Rejected, Pending, InProgress, OnGoing, Payment
- `components/navigation/` — UserAppMenu, HandymanApp, ProviderApp4, UserApp3 (bottom tab bars, one per app), AboutCustomer, AboutHandyman, AboutProvider
- `assets/icons/` — Icon (61 Iconly glyphs)
- `assets/flags/` — AE, AL, DE, ES, FR, IN, MC, NL, NZ, PT, RU, TR, US, VN (14 country-flag components — intentional addition, see Iconography)

Every component above also pulls in the low-level Iconly glyph instances it nests as its own export (not a public API — use `Icon name="..."` from `assets/icons` for standalone icon usage): `IconlyLightLocation`, `IconlyLightProfile2`, `IconlyRegularLightDangerCircle`, `IconlyLightHome`, `IconlyLightCategory2`/`IconlyLightCategory3`, `IconlyLightChat2`/`IconlyLightChat3`/`IconlyLightChat4`, `IconlyLightProfile3`, `IconlyLightLocation4`, `IconlyLightCalling5`, `IconlyLightMessage2`, `IconlyRegularLightCalendar`, `IconlyLightArrowDown2`, `IconlyLightSearch2`, `IconlyLightVoice`, `IconlyLightProfile6`, `IconlyLightTicket`, `IconlyBoldHome`, `IconlyBoldTicket`/`IconlyBoldTicket2`, `IconlyBoldCategory`, `IconlyBoldChat`, `IconlyRegularBoldChat2`.

**Not built as a standalone primitive**: the Figma family **"Hanyman App"** — a duplicate/typo'd copy of the "Handyman App" component set (same 5 variants, same layout, just mislabeled in the source). `HandymanApp` above covers the real one; the typo'd duplicate is intentionally skipped rather than shipping the same bottom-nav twice under two names.

**Not built as reusable components** — these are full assembled screens in the Figma (their "variants" are literally different app screens, not a primitive's states), so they're recreated directly as UI kit screens instead: the `User App` / `Handyman App` / `Provider App` component sets, and the country-picker `AE`/`AL`/`DE`/... standalone symbols (superseded by `assets/flags`).

Materializing those components also pulled in the low-level Iconly instances they nest as their own exports — not a public API, use `Icon name="..."` from `assets/icons` for standalone icon usage instead: `IconlyLightLocation`, `IconlyLightProfile2`, `IconlyRegularLightDangerCircle` (from cards); `IconlyLightHome`, `IconlyLightCategory2`, `IconlyLightChat2`, `IconlyLightChat4`, `IconlyLightProfile3`, `IconlyLightLocation4`, `IconlyLightCalling5`, `IconlyLightMessage2`, `IconlyRegularLightCalendar` (from navigation); `IconlyLightArrowDown2`, `IconlyLightArrowDown22`, `IconlyLightSearch2`, `IconlyLightVoice`, `IconlyLightProfile6` (from forms).

## UI kits
- `ui_kits/user-app/index.html` — customer app: auth, home/browse, bookings, notifications, profile.
- `ui_kits/handyman-app/index.html` — technician app: earnings dashboard, job detail/proof, chat, profile.
- `ui_kits/provider-app/index.html` — business-owner app: revenue dashboard, bookings, handyman roster, profile.
- `ui_kits/hotel-pms-web/index.html` — **new** hotel PMS web dashboard: reservations, room status board, OTA channel manager, guests.

## Index
- `styles.css` — root stylesheet; import this in any consuming page.
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/fig-tokens.css` — design tokens.
- `components/` — see Components above.
- `assets/` — icons, flags, logo mark, one product photo.
- `ui_kits/` — see UI kits above.
- `SKILL.md` — Claude Code-compatible skill wrapper for this system.

## Intentional additions
- `assets/flags/` (`AE`…`VN`) — matched directly to the kit's own country-code components; not an invention, just relocated/renamed from loose standalone symbols into a dedicated directory. The auth screens' phone-input needs a country picker (see Iconography).

## Caveats / known gaps
- The Figma family **"Hanyman App"** is a duplicate/typo'd copy of "Handyman App" (same 5 variants) — intentionally skipped; see Components.
- Several large source photos (>4MB) were dropped by the extractor and are not in `assets/` — re-run extraction with the Figma file attached if you need them.
- The hotel-PMS web dashboard is a new design, not sourced from the Figma — treat it as a strong starting point, not ground truth, and validate against real ANIO hotel-ops requirements.
- The GitHub repo `huonggiangs/pms` had no code at build time — re-check it for anything the team has since pushed.

## Iterate with us
This is a first pass stitched from two Figma files and an empty repo. **Please tell us**: is the hotel-PMS reframing (Provider/Handyman as a hotel's repair vendors) right, or should User/Handyman/Provider stay a general home-services marketplace? Do you have real hotel-ops screens, a proper company logo, or the missing high-res photography to drop in? Flag anything that reads wrong and we'll tighten the next pass.
