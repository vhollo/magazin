# Route Logic Documentation

This document describes the logic and behavior of all routes in the Diabetes.hu magazine application.

## Table of Contents

1. [Navigation System](#navigation-system)
2. [Analytics](#analytics)
3. [Home Route (`/`)](#home-route-)
4. [Quiz Routes (`/kviz`)](#quiz-routes-kviz)
5. [Search Route (`/keres`)](#search-route-keres)
6. [Pharmacy Route (`/patika`)](#pharmacy-route-patika)
7. [Subscription Route (`/elofizetes`)](#subscription-route-elofizetes)
8. [Newsletter Route (`/hirlevel`)](#newsletter-route-hirlevel)
9. [Dynamic Content Routes (`/[...path]`)](#dynamic-content-routes-path)
10. [Authentication Logic](#authentication-logic)
11. [Receptsarok Routes (`/receptsarok`)](#receptsarok-routes-receptsarok) — includes [Magazine → Receptsarok redirects](#magazine--receptsarok-redirects-storage--processing)
12. [Magazine Content Sync (MODX → Firestore)](#magazine-content-sync-modx--firestore)

---

## Navigation System

**Files:**
- `src/lib/components/Nav.svelte`
- `src/lib/nav1.js`
- `src/lib/nav2.js`

### Primary Navigation (Nav1)

**Location**: `src/lib/nav1.js`

Nav1 defines the main navigation menu items displayed at the top of every page:

```javascript
{
  'Hírek': '/hirek',
  'DiabKVÍZ': '/kviz',
  'Előfizetés': '/elofizetes',
  'Partnereink': {
    'Alapítvány a Cukorbetegekért': '/alapitvany',
    'Tudomány Kiadó': 'https://www.tudomany-kiado.hu',
    'CEOSZ': 'https://ceosz.hu',
    'Gyógyszertárkereső': '/patika'
  }
}
```

**Structure**:
- **Simple Links**: String values map directly to routes (e.g., `'Hírek': '/hirek'`)
- **Dropdown Menus**: Object values create submenus with multiple links
- **External Links**: Can include full URLs (e.g., `'https://www.tudomany-kiado.hu'`)

### Secondary Navigation (Nav2)

**Location**: `src/lib/nav2.js`

Nav2 defines the secondary navigation menu with categorized content sections:

- **Kezelés** (Treatment): Inzulinok, Gyógyszerek, Technikai eszközök, Orvos–beteg kapcsolat, Önmenedzselés
- **Életmód** (Lifestyle): Táplálkozás, Receptek, Testmozgás, Psziché, Művészet, Jogi útmutatók, DiaEuro
- **Szövődmények** (Complications): Megelőzés, Idegrendszer, Vese, Látás, Végtagok, Szív-érrendszer, Társbetegségek
- **Közösségi élet** (Community): Egyesületek, Közösség, Események, Rendezvények
- **Portrék** (Profiles): Gyógyítók, Sorstársak
- **Gyermekvállalás** (Pregnancy): Gesztációs diabétesz, Várandósság cukorbetegséggel

### Navigation Component Logic (`Nav.svelte`)

#### Rendering Behavior

1. **Desktop View**:
   - Nav1 items render first (left side)
   - Nav2 items render second (hidden on desktop, shown on mobile)
   - Search icon link (`#search`)
   - User authentication button

2. **Mobile View**:
   - Hamburger menu toggle
   - Nav1 items render with collapse functionality
   - Nav2 items render below Nav1 (also collapsible)
   - **Full-screen overlay**: When mobile menu is open (`#mobile-nav:checked`), the nav element gets `min-height: 100vh`, creating a full viewport height overlay that covers the entire screen

#### Navigation Item Types

**Simple Links** (`typeof nav1[cat] === 'string'`):
- Direct link to route
- Active state: `class:menu-active={actual == nav1[cat]}`
- Closes mobile menu on click

**Dropdown Menus** (object with subcategories):
- **Desktop**: Hover-activated dropdown (`dropdown-hover`)
- **Mobile**: Radio button-controlled collapse (`collapse-arrow`)
- Submenu items render as nested `<ul>` with links

#### Collapse Logic (Mobile)

- Uses radio button group (`bind:group={collapse}`) to control which menu is open
- **Toggle Behavior**:
  - Clicking same category closes it
  - Clicking different category opens new one, closes previous
  - `handleRadioClick`: Detects if same category clicked
  - `handleRadioChange`: Updates state after radio change
  - `shouldToggleOff`: Flag to handle closing after state update

#### Active State Highlighting

- Compares current route (`actual` prop) with navigation paths
- Applies `menu-active` class to matching items
- Works for both top-level and submenu items

#### Additional Navigation Items

1. **Search Link**:
   - Links to `#search` anchor
   - Scrolls to search section on click
   - Closes all collapses before scrolling

2. **User Button**:
   - Shows user icon
   - **If authenticated**: Accent color, opens logout modal
   - **If not authenticated**: Default color, opens login modal
   - Mobile: Shows "Felhasználó" text label

#### Mobile Menu Behavior

- **Toggle**: Checkbox input (`#mobile-nav`) controls menu visibility
- **CSS-based**: Uses `:has()` selector to show/hide menu
- **Height Animation**: Smooth transition when opening/closing
- **Collapse Arrows**: Visual indicators for collapsible items
- **Accessibility**: Keyboard navigation support (`tabindex`, `onkeydown`)

#### Scroll Behavior

- `_scrollIntoView`: Handles smooth scrolling to anchors
- Closes mobile menu before scrolling
- Adds delay for menu close animation
- Scrolls to element with offset for sticky header

### Navigation Usage in Routes

- **Nav Component**: Used in root layout (`+layout.svelte`)
- **Nav2 Component**: Used in individual page components for secondary navigation
- **Active Route**: Passed via `actual` prop to highlight current page
- **Path Matching for Title Generation**: 
  - **Purpose**: Provides fallback page titles when documents don't have a `title` property
  - **How it works**:
    1. Creates a merged navigation structure (`copycats`) combining `nav2` with additional routes (carousel items, nav1 items)
    2. Loops through all navigation categories and subcategories
    3. Matches current document path (`doc.path`) against navigation route values
    4. When a match is found, stores the navigation label (subcategory name) as `matchingSubcat`
    5. Uses fallback logic: `docstitle = doc.title || matchingSubcat`
    6. This title is used in the page `<title>` tag: `{docstitle} • {sitename}`
  - **Example**: Visiting `/receptek` without a document title will use "Receptek" from the navigation structure as the page title
  - **Benefit**: Ensures every page has a meaningful, human-readable title for SEO and user experience, even if the CMS document lacks a title field

---

## Analytics

**Files:**
- `src/app.html` — Simple Analytics script tags
- `src/lib/analytics.ts` — `trackEvent()` helper

Added in the homepage redesign 2026 (F6.1). **Simple Analytics** (cookie-free, no consent banner needed) — loaded via `<script async defer src="https://scripts.simpleanalyticscdn.com/latest.js">` in `app.html`, plus a `<noscript>` pixel fallback. Pageviews are tracked automatically by the script; no code changes needed per-route.

**Custom events** (`trackEvent(name, metadata?)` in `src/lib/analytics.ts`): thin wrapper around the global `window.sa_event()` — no-ops during SSR (`browser` check) and swallows errors (analytics must never throw or block the UI it's attached to). Wired onto the funnel's key interaction points:

| Event | Component | Fires on |
|---|---|---|
| `hero_entry_click` | `Hero.svelte` | "Kezdje itt" audience chip click (`label` metadata) |
| `hero_expert_click` | `Hero.svelte` | Featured expert-pick card click (`path` metadata) |
| `expert_card_click` | `ExpertSection.svelte` | Any "Válogatás szakértőinktől" card click (`path` metadata) |
| `newsletter_cta_click` | `NewsletterCTA.svelte` | Home newsletter band CTA → `/hirlevel` |
| `subscribe_cta_click` | `SubscribeCTA.svelte` | Home subscribe band CTA → `/elofizetes` |
| `hirlevel_submit` | `hirlevel/+page.svelte` | Successful subscribe/unsubscribe (fired inside the `use:enhance` callback on `result.data?.success`, `muvelet` metadata) |

**Testing note**: `trackEvent`/`sa_event` calls can't be reliably exercised via synthetic `click()`/`requestSubmit()` in the preview sandbox when routed through SvelteKit's `use:enhance` — verify with a real click or `dispatchEvent(new MouseEvent('click', ...))` on the anchor directly (bypassing `use:enhance`), or a native form POST for server-side behavior.

---

## Home Route (`/`)

**Files:**
- `src/routes/+page.svelte`
- `src/routes/+page.server.ts`
- `src/routes/+layout.server.ts`

### Server-Side Logic (`+page.server.ts`)

- **SSR** (not prerendered): one Firestore read of `collections/home`
- **Data Loading**:
  - Returns up to 72 article cards from `collections/home` (sorted by `publishedon` descending, `id` descending as tie-break — see `homeDocs`). **Homepage redesign 2026:** the grid is no longer "latest of everything" — `homeDocs` keeps only docs matching `isExpertDoc` (Dr.-authored + expert-tagged) or `isNewsDoc` (`hírek`/`hirek` tag), merged and date-sorted.
  - Also returns `expertCards` — up to 24 Dr.-authored, expert-tagged picks precomputed onto the same `collections/home` doc (see `expertDocs` below), so the home route stays a single Firestore read
  - `Cache-Control`: CDN-cached (`s-maxage=86400`)

### Expert picks (`expertCards`)

**Location**: `expertDocs()`, `isExpertDoc()`, `EXPERT_TAGS` in `src/lib/modx/collections.ts`

- **Purpose**: surfaces physician-authored content on the home page ("Válogatás szakértőinktől" section) ahead of the general latest-articles grid.
- **Filter** (`isExpertDoc`): a listed doc qualifies when **both** hold:
  1. At least one `tv.szerzo[].name` carries a standalone "Dr." token — prefix (`Dr. Kovács János`) or Hungarian postfix (`Kovács János dr.`), including `Prof. dr. …`. Tokenized on whitespace with trailing dots stripped, **not** a `\b`-based regex — JS `\b` only recognizes ASCII word characters, so it would false-positive inside accented names (e.g. "Drágffy") right after the "r".
  2. `tv.tags` intersects `EXPERT_TAGS` = `['edukáció','jog','kezelés','lexikon','neuropátia','piac','retinopátia','szakellátás','szövődmények','társbetegségek','vese','önellenőrzés','táplálkozás']`.
- **Selection** (`expertDocs`): top 24 (`EXPERT_LIMIT`) matching docs, sorted `publishedon` desc, `id` desc tie-break — mirrors `homeDocs`.
- **Computed at sync time**: `writeCollections()` in `scripts/sync-modx-to-firestore.mjs` calls `expertDocs(collectionDocs)` and writes the thin-card result as `expertCards` on the `collections/home` Firestore doc, alongside the existing `cards` field. No extra read at request time.
- Live corpus check (2026-07): ~373 listed docs qualify out of ~2300 (137 distinct Dr. authors) — comfortably above the 24-item selection.

### Client-Side Logic (`+page.svelte`)

- **Components**:
  - `Hero` - Home hero (homepage redesign 2026): left column = welcome copy + "Kezdje itt" audience entry-point chips (distilled from the old hardcoded Carousel cards); right column = the newest expert pick (`expertCards[0]`, LCP image `fetchpriority=high` + `<link rel=preload>` in the page head). Renders welcome + chips even when `expertCards` is empty (e.g. before the first sync). Decorative glucose-curve SVG motif; serif display type from a zero-load system stack (Charter/Georgia). Replaced the legacy `Carousel` on `/`. The old `Carousel.svelte` + `CarItem.svelte` were **deleted** in the F3.6 pass (they were only rendered here and in a dead `doc.path == '/'` branch of `[...path]/+page.svelte`, which the root route never hits — the gyökér `/` is served by `src/routes/+page.svelte`). The `copycats['carousel']` key in `[...path]/+page.svelte` is unrelated (fallback page-title lookup) and stays.
  - `BannerTop` - Shows top banners if configured
  - `Search` - Search component with document count
  - `Nav2` - Secondary navigation
  - `ExpertSection` - "Válogatás szakértőinktől" rail (homepage redesign 2026): grid of `expertCards.slice(1)` (index 0 is already shown in `Hero`, so this avoids duplicating it), each card with image, title, author name
  - `NewsletterCTA` - Home newsletter promo band (homepage redesign 2026): micro-conversion link to `/hirlevel`, same glucose-curve motif language as `Hero`
  - `TopicGrid` - "Böngésszen témák szerint" section (homepage redesign 2026): one card per `nav2.js` top-level category, sub-categories rendered as link chips
  - `Cards` - Displays article cards. On the home page it receives `docs` **deduplicated against `expertCards`** (`+page.svelte` filters out the top-24 picks already shown in `Hero` + `ExpertSection`) so no card repeats between the curated sections and the "latest" grid.
  - `SubscribeCTA` - Home subscribe promo band (homepage redesign 2026): macro-conversion link to `/elofizetes`, placed after the article grid

- **Title Logic**:
  - Matches document path against navigation structure (`nav2`)
  - Uses matching subcategory name as title if document title is missing
  - Falls back to document title or empty string

- **SEO Meta Tags**:
  - Dynamic title, description, keywords, author
  - Open Graph tags for social sharing
  - Image preloading for document images

- **Content Display**:
  - Shows the `Hero` (expert pick + audience chips) on the home page
  - Displays article cards if documents exist
  - Shows "Kapcsolódó cikkek" (Similar articles) if viewing a specific document

---

## Quiz Routes (`/kviz`)

**Files:**
- `src/routes/kviz/+page.svelte`
- `src/routes/kviz/+page.ts`
- `src/routes/kviz/+layout.server.ts`
- `src/routes/kviz/form/+page.svelte`
- `src/routes/kviz/form/+page.server.ts`
- `src/routes/kviz/[...id]/+page.svelte`
- `src/routes/kviz/[...id]/+page.server.ts`

### Quiz List Route (`/kviz`)

#### Layout Server (`+layout.server.ts`)

- Loads all quizzes via `getKviz()`
- Returns quizzes array and document metadata

#### Max Score Calculation (`getKviz()` in `src/lib/siteConf.ts`)

- **Location**: Calculated in `getKviz()` function when loading quizzes from Firestore
- **Algorithm**:
  1. Iterates through all questions in the quiz
  2. For each question, iterates through all answer options
  3. Sums all positive scores (`option.score > 0`) from all options across all questions
  4. Result stored as `max_score` property on each quiz object
- **Formula**: `max_score = sum of all positive option scores across all questions`
- **Purpose**: Represents the maximum possible score a user can achieve if they select all the highest-scoring options

#### Page Load (`+page.ts`)

- **SSR**: Disabled (`ssr = false`) - client-side only
- **Authentication Check**:
  - If user is logged out: clears `kvizScores` store and returns empty
  - If user is logged in: fetches scores from Firestore for all quizzes
- **Score Loading**:
  - Queries Firestore: `kviz/{quizId}/scores/{uid}`
  - Updates `kvizScores` store with fetched scores
  - Handles missing or invalid scores gracefully

#### Page Component (`+page.svelte`)

- **Display Logic**:
  - Lists all available quizzes
  - Shows quiz title, description (markdown parsed), and expiration date
  - Displays user's score if available

- **Quiz Status Indicators**:
  - **Expired** (at end of expiration day): Warning color, "Megtekintés" (View) button, shows score if exists
    - Retaking expired quizzes does NOT submit or record new scores
  - **Completed** (score exists): Primary color, "Kitöltés újra" (Retake) button, shows score if exists
    - Retaking completed quizzes does NOT submit or record new scores (only first submission is recorded)
  - **Available**: Accent color, "Beküldés" (Submit) button

- **Reactive Updates**:
  - Subscribes to `uid` store changes
  - Invalidates all data on login/logout to refresh scores

### Quiz Form Route (`/kviz/form`)

#### Server Action (`+page.server.ts`)

- **Prerendering**: Enabled
- **Purpose**: Hidden form endpoint for Netlify Forms integration

### Individual Quiz Route (`/kviz/[...id]`)

#### Server Load (`+page.server.ts`)

- **Actions**:
  - `default`: Handles quiz submission
    - Extracts form data (subject, title, uid, name, email, score, date)
    - Posts to Netlify Forms endpoint (`/kviz/form`)
    - Writes score to Firestore at `kviz/{id}/scores/{uid}` (subcollection under each quiz document)
    - Stores: `name`, `email`, `score`, `date`
    - Returns success status

- **Load Function**:
  - Extracts quiz ID from URL params
  - Finds matching quiz from parent's quizzes array
  - Returns quiz data and ID

#### Page Component (`+page.svelte`)

- **Quiz Display**:
  - Shows quiz title, description (markdown), image, and optional video (YouTube embed)
  - Displays related article link if available

- **Authentication Requirements**:
  - If quiz not expired and user not authenticated: Shows login prompt
  - Requires `displayName` to submit quiz

- **Question Logic**:
  - **Single Choice**: Radio buttons, score added on selection
  - **Multiple Choice**: Checkboxes, score accumulated, "Tovább" (Next) button required
  - **Score Calculation**: Numeric values add to or substract from total score
  - Questions hidden until previous is answered (CSS-based)

- **Submission Logic**:
  - Auto-submits when last question answered (if not expired and no previous score)
  - **Retake Behavior**: 
    - If quiz is expired OR already completed (has existing score): Auto-submission is prevented
    - Form can still be filled out for viewing purposes, but scores are not saved
  - Shows comparison message if score already exists:
    - Better than previous: Shows improvement
    - Worse than previous: Shows decrease
    - Same as previous: Shows match
  - Updates `kvizScores` store locally (line 59: `$kvizScores[kviz.id] = score`) for immediate UI feedback
  - Form data is sent to server action (`+page.server.ts`) which handles Firebase writing server-side
  - Server-side Firebase write only occurs for first-time submissions when not expired

- **Expiration Handling**:
  - Quizzes expire at the end of the expiration day
  - If expired: Shows message that score won't be recorded
  - Form still functional for viewing/retaking, but submission and score recording are disabled
  - Retaking expired quizzes does NOT submit or record new scores

- **Sticky Footer**:
  - Displays current score: `{score} / {max_score} pont`
  - Stays visible at bottom of viewport

---

## Search Route (`/keres`)

**Files:**
- `src/routes/keres/+page.svelte`
- `src/routes/keres/+layout.server.ts`
- `src/routes/api/search-meta/+server.ts`

### Layout Server (`+layout.server.ts`)

- **SSR** (not prerendered): **zero Firestore reads** — recipe hits are enriched from the `recipeTeaser` stored on every recipe doc inside the MiniSearch index the client downloads (identical fields to the old SSR teasers)
- Returns `{ doc: { path: 'keres', title: 'Keresés' } }`
- **Cache-Control**: CDN-cached (`s-maxage=86400`)
- `collections/rs-teasers-{year}` + `rs-teasers-index` are still written by `sync:rs-collections` purely as a rollback path; `getReceptsarokTeasers()` in `receptsarokFirestore.ts` is deprecated and unused at runtime

### Search index (client-side)

- On mount, fetches `/api/search-meta` (fallback: `/search-meta.json`)
- Downloads gzipped MiniSearch index from Firebase Storage (`meta/search.indexUrl`)
- All queries run locally in the browser (`MiniSearch.loadJSON`, fuzzy 0.2, `ellipsis` boost 2)
- If index unavailable: friendly error message; nav/search box still render

### Page Component (`+page.svelte`)

- **Display**:
  - Shows search query in title: `Keresés: "{query}"`
  - Displays results using `Cards` component (includes Receptsarok hits with lock state)
  - Empty results show no error (handled by Cards component)

---

## Pharmacy Route (`/patika`)

**Files:**
- `src/routes/patika/+page.svelte`
- `src/routes/patika/+layout.server.ts`

### Layout Server (`+layout.server.ts`)

- **SSR** (not prerendered): one Firestore read of `collections/patika`
- Returns pharmacies array and document metadata (`patikas`, `doc` with `path`, `title`, `patikas`)
- **Cache-Control**: CDN-cached (`s-maxage=86400`)
- `collections/patika` is precomputed by `npm run sync:patika:apply` from `tables/elofizetok/patika` subcollection; if missing, the helper falls back to the legacy `getPatika()` JSON pipeline

### Page Component (`+page.svelte`)

- **Client-Side Search**:
  - Initializes MiniSearch for pharmacies
  - Fields: `irsz`, `varos`, `cegnev`, `cim`, `patika`
  - Stores: `patika`, `irsz`, `varos`, `cim`, `email`
  - Fuzzy search threshold: 0.25

- **Search Functionality**:
  - Real-time search as user types
  - Searches by pharmacy name, address, city, or postal code
  - Shows all pharmacies when query is empty

- **Display**:
  - Lists pharmacies with name, postal code, city, and address
  - Each pharmacy links to Google Maps
  - Fly-in animation for results

---

## Subscription Route (`/elofizetes`)

**Files:**
- `src/routes/elofizetes/+page.svelte`

### Page Component (`+page.svelte`)

- **Shopify Integration**:
  - Loads Shopify Buy Button SDK dynamically
  - Initializes Shopify client with store domain and access token
  - Creates collection component for subscription products
  - Collection ID: `395347394795`

- **Styling**:
  - Adapts colors based on user's color scheme preference
  - Custom button styles (blue theme)
  - Responsive product grid (4 columns on desktop)

- **Content** (restructured in the homepage redesign 2026, F5):
  - **Value-proposition hero** above the Shopify embed — same visual language as the home `Hero` (serif display, glucose-curve motif, `bg-base-200` band): kicker + H1 ("A nyomtatott Diabetes magazin — házhoz szállítva", matching the home `SubscribeCTA` heading), empathetic magázó lead, three benefit cards (szakértő szerzők / évente hat lapszám / Hypertonia+különszámok féláron), CTA "Előfizetek" → `#megrendeles` anchor (app.css `*[id]` scroll-margin handles the sticky header)
  - **`#megrendeles` section** wraps the Shopify collection embed with a "Válassza ki lapszámait" heading + the half-price / max-3 note
  - **Receptsarok Prémium** pricing cards (unchanged)
  - **GYIK** — five native `<details>` FAQ items (no JS), answers grounded in the actual offer only: lapszám-tartalom, évente 6 postai megjelenés + szállítási költség a kosárban, féláras kedvezmény menete, nyomtatott vs. digitális (ingyenes cikkek + Receptsarok Prémium cross-sell), kosár "Üzenet a Kiadónak" mező
  - Copy unified to **magázó** tone (was tegező "Rendeld meg…"), including meta/og descriptions
  - Hungarian language interface

---

## Newsletter Route (`/hirlevel`)

**Files:**
- `src/routes/hirlevel/+page.svelte` — visible subscribe/unsubscribe form
- `src/routes/hirlevel/+page.server.ts` — form action (validation + Netlify relay)
- `src/routes/hirlevel/form/+page.svelte` — hidden static form for Netlify bot-detection
- `src/routes/hirlevel/form/+page.server.ts` — `prerender = true`

Added in the homepage redesign 2026 (F4), replacing the old two-line placeholder. It's the micro-conversion target of the home `NewsletterCTA`, plus a Footer link ("Magazin" nav).

### Netlify Forms wiring (same indirection as `/kviz`)

- A native form POST to this SSR route would hit SvelteKit, not Netlify's form processor. So the **server action relays** the submission (`application/x-www-form-urlencoded`, `form-name=hirlevel`) to the **prerendered `/hirlevel/form`** page, which carries the `data-netlify` form Netlify's build-time bot detects. Fields declared on the hidden form must match what the action relays: `email`, `nev`, `muvelet`, `consent`.
- In dev (`localhost`/`192.168`) the relay targets `https://diabeteshu.netlify.app` (like `/kviz`), so a real subscribe in dev POSTs to production — don't exercise the success path locally until the form is deployed.

### Server action (`+page.server.ts`)

- `muvelet`: `feliratkozas` | `leiratkozas` — drives copy and validation.
- **Validation** (before the Netlify relay, so it never wastes a POST): email regex; consent **required for subscribe only** (GDPR); honeypot `bot-field` filled ⇒ silently returns `success` without relaying (bots don't reach Netlify).
- Returns `{ success, muvelet }` on success, or `fail(4xx, { emailError | consentError | postFail, email, muvelet })`.

### Page component (`+page.svelte`)

- **Progressive enhancement**: works without JS (native POST → action re-renders with `form` prop) and with JS (`use:enhance` swaps in the confirmation without reload). Same visual language as the home (serif display, glucose-curve motif, primary/secondary theme).
- Subscribe/unsubscribe segmented toggle; name (optional) + consent shown only for subscribe; CSS-hidden honeypot (`.hp`, off-screen); success state shows a thank-you/goodbye confirmation.
- **GDPR consent text is a placeholder pending legal review** (no `adatkezelési tájékoztató` page exists yet — the link was intentionally omitted, see the comment in the consent block).

---

## Dynamic Content Routes (`/[...path]`)

**Files:**
- `src/routes/[...path]/+page.svelte`
- `src/routes/[...path]/+page.server.ts`
- `src/routes/[...path]/+layout.server.ts`

### Layout Server (`+layout.server.ts`)

- **SSR** (not prerendered): one Firestore read per request (`collections/{slug}` or `docs/{encodedPath}`)
- **Collection slugs**: precomputed `collections/{slug}` (top 72 cards)
- **Article paths**: `docs/{encodedPath}`; similar articles from `doc.relatedCards` or fallback collection read
- **Cache-Control**: CDN-cached (`s-maxage=86400`)
- Tag-collection definitions and ranking live in `src/lib/modx/collections.ts` (same logic as sync worker)

#### Collection slugs (precomputed at sync time)

- `s-o-s`: ['diabpont', 'edukáció', '-covid-19']
- `junior`: ['+junior', '-covid-19']
- `varandossag`: ['+várandósság', '+személyes']
- `gyermekvallalas`: ['+várandósság', 'edukáció']
- `inzulinok`: ['+inzulin', 'piac', 'kezelés', '-önellenőrzés']
- `gyogyszerek`: ['+gyógyszer', 'piac', 'kezelés', '-önellenőrzés']
- `technikai-eszkozok`: ['+készülék', 'piac', 'kezelés', '-önellenőrzés', '-megelőzés']
- `receptek`: ['recept', '-táplálkozás']
- `taplalkozas`: ['+táplálkozás', '+edukáció', '-recept', '-covid-19']
- `orvos-beteg`: ['+orvosok', '+személyes', 'psziché', 'kezelés', 'edukáció', 'önellenőrzés', 'társbetegségek', 'szövődmények', '-elismerés', '-covid-19']
- `onmenedzseles`: ['önellenőrzés', '-covid-19']
- `testmozgas`: ['testmozgás', '-covid-19']
- `psziche`: ['psziché', '-covid-19']
- `muveszet`: ['művészet', '-covid-19']
- `jogi-utmutatok`: ['jog', '-covid-19']
- `idegrendszer`: ['+neuropátia', 'szövődmények', 'edukáció', '-covid-19']
- `vese`: ['vese']
- `latas`: ['retinopátia']
- `vegtagok`: ['neuropátia', 'megelőzés']
- `sziv-errendszer`: ['hypertonia', '-covid-19']
- `tarsbetegsegek`: ['társbetegségek', '-covid-19']
- `megelozes`: ['+megelőzés', '+szövődmények', '-covid-19']
- `kozosseg`: ['+közösség', '+személyes', '-egyesület', '-rendezvény', '-covid-19']
- `egyesulet`: ['+egyesület', '-covid-19']
- `esemenyek`: ['beszámoló', 'közösség', 'egyesület', '-személyes', '-rendezvény', '-covid-19']
- `rendezvenyek`: ['+rendezvény', '-covid-19']
- `gyogyitok`: ['+személyes', '#orvosok', 'szakellátás', 'elismerés', '-kezelés', '-covid-19']
- `sorstarsak`: ['+személyes', 'elismerés', '-szakellátás', '-orvosok', '-önellenőrzés', '-kezelés', '-várandósság', '-közösség', '-edukáció', '-egyesület', '-covid-19']
- `hirek`: ['hírek', 'hirek'] — the news bucket. `parent==1` rows (the `modxSiteHirek` set) are auto-tagged `hírek` by the transform; editors also hand-tag other docs and frequently omit the accent, so both spellings are accepted
- `diaeuro`: ['+diaeuro']
- `all`: [] (all documents)

**Tag Query Syntax**:
- `+tag`: Required tag (high priority)
- `#tag`: Important tag (medium priority)
- `tag`: Optional tag (low priority)
- `-tag`: Excluded tag

**Ranking Algorithm** (`rankDocByTags`): each of a document's tags that matches the query scores:
1. Required (`+tag`): 11 points (1 base + 10 bonus)
2. Important (`#tag`): 3 points (1 base + 2 bonus)
3. Optional (`tag`): 1 point (base only)
4. Excluded (`-tag`): if the document carries any excluded tag, its **base** points are zeroed — but `+`/`#` **bonus** points still apply (legacy quirk). A document is dropped only when its total rank is 0
5. Sorts by rank (descending), then `publishedon` (descending, newest first) as a tie-break
   - This is what orders all-optional-tag collections like `hirek` (`['hírek', 'hirek']`), where every match ties at rank 1
6. Returns top 72 documents (18 × 4)
   - Folders (`isfolder`) are skipped by default; **collection building** passes `includeFolders: true`, so a content-tagged folder appears in every collection one of its tags matches — **except** folders whose post-`alapjav` `content` is blank (pure containers), which the sync drops up-front via `emptyContentFolderPaths` (`scripts/lib/empty-folders.mjs`). The related-cards tag fallback keeps the default (no folders).

#### Individual document routes

- Loads `docs/{encodeDocPathId(path)}` from Firestore
- If not found: `redirect(307, '/keres?q=…')` (`+layout.server.ts`)
- If found and `doc.redirect` is set: `redirect(308, doc.redirect)` — magazine recipe articles point at `/receptsarok/{year}/{id}` (see [Magazine → Receptsarok redirects](#magazine--receptsarok-redirects-storage--processing))
- Otherwise: returns document; similar articles from `doc.relatedCards` (precomputed at sync) or collection fallback
- Redirected docs are excluded from collection card lists (`isListedDoc`) and the MiniSearch article index

#### Related articles

- **Recipe link groups override everything.** When a doc's related list is a set of Receptsarok recipes (a multi-recipe "gyűjtőcikk" whose own body became several recipes, e.g. `cikkek/diabetes/1503/recept-sarok`; an editorial hub whose body lists its sibling recipes, e.g. `cikkek/hypertonia/1601/nyari-gyumolcsok`; or any article ending with a "További receptek" list), the sync writes the group's recipe keys (`{year}-{id}`) to **`doc.related`** (`scripts/lib/related-recipe-cards.mjs`, `updateDocRelatedRecipes`). `[...path]/+page.server.ts` resolves them into the `ReceptsarokWidget` ("Kapcsolódó receptek a Receptsarokban"); the tag-based "Kapcsolódó cikkek" grid is suppressed whenever a curated/derived recipe group is shown (`!rsWidgetLinked` in `+page.svelte`, plus `[...path]/+layout.server.ts` returns empty `docs` when `doc.related` is stored). Recipe siblings can't appear in the tag-based list anyway — they `redirect`, so `isListedDoc` excludes them. Detection order (`docRelatedKeys`, mirrored at runtime in `+page.server.ts`): **0. the article's own split-out dishes** (`recipe.sourceModxId == doc.id`) → 1. own `linkedModxIds` → 2. folder children → 3. a leaf whose body links its `recept` siblings. Uniform with recipe `relatedCards` (see [Cross-linking with Magazine](#cross-linking-with-magazine)).
- Otherwise the primary source is `doc.relatedCards` on the Firestore document (tag/path similar — patched by the sync worker — `scripts/lib/related-cards.mjs`)
- For folder-structured content, structural relations (derived by path) override tag similarity:
  1. A folder → its direct children (newest first)
  2. A leaf under a matching folder → that parent + all direct siblings
  3. Otherwise → top tag-matched cards from the doc's best-matching collection
  - Rule 1 wins for a folder that is itself a child (e.g. a year sub-folder). An empty-content folder (blank `content` after `alapjav`) is never shown as a related card — it is replaced by its children, recursively (`emptyContentFolderPaths`)
- Fallback: read matching `collections/{slug}` when relatedCards empty

### Page Component (`+page.svelte`)

- **Document Display**:
  - Shows document title, intro text, content (HTML)
  - Displays author(s), publication date, edit date (if different)
  - Shows category and tags
  - Displays featured image with caption
  - Renders author signatures/bios

- **Layout**:
  - **Article View**: Two-column layout (article + sidebar ads)
  - **Collection View**: Card grid layout
  - Sidebar shows prominent banners (desktop only)

- **SEO**:
  - Dynamic meta tags based on document
  - Open Graph tags for social sharing
  - Image preloading

- **Components**:
  - `Carousel`: Only on home page (`doc.path == '/'`)
  - `BannerTop`: If configured and not on article page
  - `Search`: Always shown
  - `Nav2`: Secondary navigation
  - `Cards`: For collections and related articles
  - `BannerSide`: Prominent sidebar ads on article pages

---

## Authentication Logic

**Location**: `src/lib/components/Nav.svelte`

### Authentication Methods

1. **Google Sign-In**:
   - Uses Firebase `signInWithPopup` with `GoogleAuthProvider`
   - Updates `authUser` store on success

2. **Email Link Authentication**:
   - Sends sign-in link via `sendSignInLinkToEmail`
   - Stores email in localStorage
   - Validates link on page load via `isSignInWithEmailLink`
   - Signs in via `signInWithEmailLink`
   - Prompts for display name if missing

### Authentication State

- **Auth State Listener**: `onAuthStateChanged` updates `authUser` store
- **User Store**: Contains `uid`, `email`, `displayName`
- **Email Store**: Separate store for email input

### Protected Features

- **Quiz Submission**: Requires authenticated user with `displayName`
- **Score Storage**: Scores stored per user ID in Firestore at `kviz/{quizId}/scores/{uid}` (subcollection under each quiz document in the actual quiz/scores table)
- **Score Display**: Shows user's scores on quiz list page

### Logout

- Signs out via `signOut(firebaseAuth)`
- Clears `authUser` store
- Quiz scores cleared on logout (via `+page.ts`)

---

## Receptsarok Routes (`/receptsarok`)

**Files:**
- `src/routes/receptsarok/+layout.server.ts`
- `src/routes/receptsarok/+page.svelte`
- `src/params/year.ts`, `src/params/category.ts` (disambiguate first segment)
- `src/routes/receptsarok/[category=category]/+page.svelte`
- `src/routes/receptsarok/[category=category]/+page.server.ts`
- `src/routes/receptsarok/[year=year]/[id]/+page.svelte`
- `src/routes/receptsarok/[year=year]/[id]/+page.server.ts`
- `src/routes/api/receptsarok/recipe/[year]/[id]/+server.ts` (subscriber-only full recipe JSON)

### Data Source

**SSR pattern**: each route reads ONE precomputed Firestore doc per request (mirrors `collections/{slug}` for magazine articles). Helpers in `src/lib/receptsarokFirestore.ts`:

| Route | Firestore doc | Shape |
|---|---|---|
| root layout (all pages) | `meta/stats` (1 read) | `{ articleCount, recipeCount, freeCount }` — `articleCount` merged by the search-index builder, `recipeCount`/`freeCount` merged by `sync:rs-collections`; falls back to `collections/rs-home` while the recipe fields are missing |
| `/receptsarok` layout | `collections/rs-home` | `{ categories: Category[], totalRecipes, totalFree, freeCountsByCategory }` |
| `/receptsarok/[category]` | `collections/rs-{categoryId}` | `{ cards: RecipeLayoutEntry[], count }` |
| `/receptsarok/[year]/[id]` | `recipes/{year}-{id}` (direct doc lookup) | full `Recipe`; non-free recipes go through `stripRecipeGatedFields` before serialization |
| `/keres` layout | — | zero reads; teasers come from the search index `recipeTeaser` stored field (deprecated `rs-teasers-*` shards still written as rollback) |
| `/api/receptsarok/recipe/[year]/[id]` | `recipes/{year}-{id}` (1 read, subscriber-auth) | full recipe — fresh after every sync without redeploy; bundled `recipes.json` only as fallback |
| `/api/receptsarok/recipes` | Storage `receptsarok/catalog.json.gz` (subscriber-auth) | slim `RecipeLayoutEntry[]` catalog (~190 KB gz vs the old ~4 MB full dump); built by `sync:rs-collections`; bundled-JSON slim fallback |

Source data — Firestore `recipes/{year}-{id}` (one doc per recipe, keyed by `recipeSlug()` from `receptsarok.ts`) + `categories/{id}` collection — is **uploaded by `npm run sync:recipes:apply`** from `src/lib/data/recipes.json`. The aggregate UI docs above are then computed and written by `npm run sync:rs-collections:apply`.

Fallbacks: if any aggregate doc is missing, the helpers fall back to `getRecipes()` / `getPatika()` (which themselves read JSON in production, Firestore in dev/build) so the site keeps working during transition.

Types and constants defined in `src/lib/receptsarok.ts`.

**Image schema (consolidated 2026-06)**: recipes carry ONE image field — `img: { src, pos, ext, alt?, caption? }` — the same card shape as MODX article `doc.img`, extended with optional hero metadata (`alt` only when it differs from the title; `caption` from booklet „Fotó: …” lines). The legacy `image` hero field is gone from `recipes.json`, Firestore, teasers, and `SubRecipe` (sub-recipes use `img` too). `recipeCardImg()` in `receptsarok.ts` is the canonical accessor (still folds legacy `image` from un-migrated data); the one-time migration lives in `scripts/migrate-recipe-image-to-img.mjs`.

**recipes.json format**: written by `stringifyRecipesJson()` (`src/lib/recipesJsonFormat.js`) — one minified recipe per line (~35% smaller than pretty-printed, still line-diffable). Every script that writes `recipes.json` must use this helper.

**Ingredient punctuation**: booklet lists end each item with `,` (last with `.`), and the detail page appends its own separator — so a stray trailing comma renders as `…,,`. Both parsers (`src/lib/modxToRsParser.js`, `scripts/lib/modx-to-rs-parser.mjs`) strip it at parse time, but the **create-only** pipeline (see below) never re-parses existing recipes, so older imports kept the comma. `scripts/lib/normalize-ingredient-punctuation.mjs` is the shared funnel that cleans `ingredientNames` + `ingredientGroups[].items[].text`/`.name` (incl. sub-recipes); `sync:recipes(:apply)` runs it on every upload (rewriting `recipes.json` when it changes) so Firestore never receives trailing list punctuation.

**Dev startup reads**: `getRecipes()` in dev/build first checks `meta/recipesUpload.revision` against the local `src/lib/data/.recipes-rev.json` sidecar (gitignored) — when they match, the local JSON is used (1 read instead of ~1 per recipe) and local `recipes.json` edits survive dev restarts. The full collection scan only happens when the revision changed.

**Pipeline artifacts** (dedupe audits, category patterns, review files, MODX dump `data.json`) live in `scripts/data/` — NOT `src/lib/data/`, which is bundled into the SSR lambda and holds runtime data only (`recipes.json`, `categories.json`, `conf.json`, `kviz.json`, `patika.json`, `receptsarok-redirects.json`).

### Recipe data pipeline (`recipes.json`) — create-only

`src/lib/data/recipes.json` is the source of truth for Receptsarok recipes (uploaded to Firestore by `sync:recipes:apply`). It is built by the dedupe pipeline (`npm run recipes:dedupe:manual*` → `src/lib/receptsarokDedupePipeline.js`), which reads MODX docs from **`scripts/data/data.json`** (a curated raw-content dump — a *subset*, not the full corpus) and calls `buildRecipesFromModxDoc()` (`src/lib/modxToRsParser.js`). That splitter turns a single multi-recipe **collection** article ("gyűjtőcikk", several `<h2>` dishes) into one recipe per dish, attaching the image that sits just before each dish's heading — MODX `[[nagyito]]` snippets are rendered to `<img>` by `modx/transform.ts` _before_ parsing, the dish whose heading follows an image gets it, and the first dish inherits the doc's page image.

**Candidate selection:** the pipeline processes docs with **exactly one tag `recept`** (`hasReceptTag`), **plus** *recipe-collection articles* — multi-tag docs that carry `recept` and whose body splits into ≥2 standalone recipes (e.g. `kozeleg-az-eperszezon`, `enni-jo`). Collection articles skip title-redirect matching and go straight to the create/split path. To bring corpus articles that are not in the dump into scope, fetch them with **`node scripts/import-collection-articles-to-dump.mjs`** (reads raw rows + TVs from MODX MySQL, canonical path from Firestore, appends `data.json` entries), then run `recipes:dedupe:manual:create-local`.

**Author** per dish comes from `deriveAuthor` (`modxToRsParser.js`), in priority order (`src/lib/modxAuthor.js`): `szerzo` TV → a **per-recipe `<h3>X receptje</h3>` byline** (`extractReceptjeAuthor` — the recipe's own author, e.g. `barackos-buborek` where the `alairas` "Béki János" is the *journalist* and each recipe says "Horváth Ferenc receptje") → the `<p class="alairas">Név<span>URL</span></p>` footer byline (`extractAlairasAuthor` — name before the `<span>`, trailing "Fotó: …" photo credit stripped) → description. A `(N darab/szelet/adag)` count in a dish heading is moved to `servings` (`extractTitleServings`), not kept in the title. A non-step line some imports leak into a dish's instruction flow — a nutrition summary, shorthand (`E.: N kcal Sz.: … Fehérje: … Zsír: …`, 2008 `enni-jo`) or prose (`Energia- és tápanyagtartalom 1 szeletben: energia: 122 kcal (510 kJ), …`, 2014 junior `otletek-zsurokra-bulikra`); a per-piece disclaimer (`A feltüntetett értékek … vonatkoznak.`); or a leaked ingredients header (`Hozzávalók N …hoz:`, whose items already live in `ingredientGroups`) — is dropped from derived `instructions` (`isNonStepLine` in `deriveInstructions`), not kept as a step — the values belong in the nutrition fields, which are set manually for those sets (carbs are the usual mis-parse; `kJ` is not stored — only `kcal`). The `nutritionTables` label defaults to `DEFAULT_NUTRITION_LABEL` (`1 adag energia- és tápanyagtartalma:`, accented); per-dish it is rewritten to the real basis (`1 darab`/`1 szelet`/`1 adag`). Backfill (`recipes:backfill-content`) rewrites only `img`+`instructions`, never `author`/nutrition/`servings`, so those manual fixes survive a re-parse. A photographer credit in the `alairas` (`<br>Fotó: …`) becomes the recipe image's `img.caption` (`extractPhotoCredit` → `applyPhotoCredit`); it only resolves once the image exists, so it flows in via `recipes:backfill-content` (which renders `[[nagyito]]` before parsing), not the raw-content `create-local` pass. On collection dishes the description fallback is **skipped** (`allowDescription:false`) since it holds an intro/quote, not the author. Unresolvable predicted categories go to `scripts/data/receptsarok-uncategorized-review.json`; add manual overrides to **`scripts/data/magazin-recipe-category-review.json`** (`{entries:[{year,id,category}]}`). Recurring/republished collections (same dishes across years/publications) are excluded from the import to avoid near-duplicates.

**Create-only caveat (important):** the pipeline parses a doc **only if its `{year}-{id}` key is not already in `recipes.json`** (`if (!recipeByKey.has(key))`) — existing recipes are kept verbatim and never re-parsed. The MODX→Firestore sync (`sync:modx`) also does **not** rebuild recipe content; it only updates `free` flags + redirects and reads `recipes.json` read-only. **So re-saving a MODX recipe doc, or changing the parser, does not update recipes that already exist** — they need a one-time backfill.

**Dedupe winner tie-break** (`chooseWinner`/`compareRecipeCandidates` in `src/lib/receptsarokDedupeShared.js`; used by the pipeline, `scripts/dedupe-receptsarok-internal.mjs`, and sync redirect matching): 1) **real author** — author ≠ the generic "Receptsarok" placeholder (`hasRealAuthor()`; RS booklet copies name the actual author, MODX imports don't) → 2) has video → 3) more nutrition values → 4) more recent year → 5) lexical `{year}-{id}`. `dedupe-receptsarok-internal.mjs --apply-local` unpublishes losers and sets `free: true` on the winner when it unpublishes a free loser, so dedupe never paywalls a previously free recipe. Related year rule: MODX paths never contain four-digit calendar years — a segment like `/2001/` is issue code YYMM (year 2020, issue 1; `parseIssueCodeYear` in both parser copies).

| Command | Script | When to use |
|---|---|---|
| `npm run recipes:dedupe:manual*` | `scripts/manual-receptsarok-dedupe.js` | Build/extend `recipes.json` from MODX docs (create-only; `--create-local` / `--apply-local` variants). |
| `npm run recipes:dedupe:internal` | `scripts/dedupe-receptsarok-internal.mjs` | **Dry run** — cluster published recipes by normalized title, pick a winner per cluster (`chooseWinner`), write audit to `scripts/data/receptsarok-internal-dedupe-audit.json`. |
| `npm run recipes:dedupe:internal:apply-local` | `… --apply-local` | Set `published: false` on losers in `recipes.json`; winner inherits `free: true` when a free loser is unpublished. Then `sync:recipes:apply` + `sync:rs-collections:apply`. |
| `npm run recipes:dedupe:validate` | `scripts/validate-recipe-dedupe-v2.mjs` | Regression asserts for tie-break order (author/video/nutrition/year), YYMM path-year parsing, parser entity handling. Run after touching parser or dedupe logic. |
| `npm run recipes:backfill-content` | `scripts/backfill-collection-recipe-content.mjs` | **Dry run** — re-derive `image`/`img` + `instructions` for every recipe whose source doc was split into multiple recipes, from live MODX + the same `nagyito` transform the sync uses; plus (all source docs) re-derive `linkedModxIds` from "További receptek" link lists and trim instruction lines leaked from those blocks. Prints what would change. |
| `npm run recipes:backfill-content:apply` | `… --apply` | Write changes to `recipes.json`; then run `npm run sync:recipes:apply` to push to Firestore. Curated fields (id, year, category, free) are left untouched. |
| `npm run recipes:backfill-related` | `scripts/backfill-recipe-related-cards.mjs` | **Dry run** — recompute every recipe's `relatedCards` (curated link-group keys `{year}-{id}`) from its own `linkedModxIds` (`scripts/lib/related-recipe-cards.mjs`). Prints what would change. |
| `npm run recipes:backfill-related:apply` | `… --apply` | Write `relatedCards` to `recipes.json` (local-only); then `npm run sync:recipes:apply` to push. Also recomputed automatically every `sync:modx*`. |

### Dedupe & sync process (recipes)

The end-to-end order when recipe data changes (parser fix, new MODX docs, manual edits):

1. **Edit/regenerate `recipes.json`** — `recipes:dedupe:manual*` for new docs, `recipes:backfill-content:apply` after parser fixes, or targeted manual edits. `recipes.json` is canonical; never edit Firestore `recipes/*` directly.
2. **`recipes:dedupe:internal` (dry run), then `:apply-local`** if duplicates appeared — unpublishes same-title losers, propagates `free` to winners. Losers stay in `recipes.json`/Firestore with `published: false` (doc ids are stable; nothing is deleted), they just drop out of the UI and search index. **⚠ Dedupe can introduce/promote winner entries that lack backfilled fields** (e.g. `linkedModxIds` set on the loser key only) — so re-run `recipes:backfill-content` (dry) after dedupe and apply if it reports changes, *before* syncing.
3. **`npm run sync:recipes:apply`** — **diff-based**: compares per-recipe content hashes against `meta/recipesUpload` and writes only new/changed docs; orphans (vanished `{year}-{id}` keys) are derived from the hash map without a collection scan. A no-change run costs 1 read + 0 writes. Stamps a `revision` the dev server uses to skip its startup scan. Rebuilds the projection snapshot + search index (`--reindex` is in the npm script). **`--force`** rewrites everything and re-scans for orphans — needed after manual Firestore `recipes/*` edits, which the hash map cannot see.
4. **`npm run sync:rs-collections:apply`** — reads `recipes.json` + `categories.json` **locally** (pass `--from-firestore` to read the collections instead), rebuilds `collections/rs-home`, `rs-{category}`, `rs-teasers-*`, merges `{ recipeCount, freeCount }` into `meta/stats` (root layout counts), and uploads the slim meal-planner catalog to Storage `receptsarok/catalog.json.gz`. Unchanged docs are skipped via hashes in `meta/rsCollections` (no-op run = 1 read). Required after any `free`/`published`/category change.
5. **Restart the dev server** — `getRecipes()` is memoized per process with a stable cache key; a running dev server keeps serving the pre-change recipe list indefinitely.

### Magazine → Receptsarok redirects (storage & processing)

Old magazine recipe articles (`recept` tag, or legacy MODX paths `receptsarok/{category}/{slug}`) redirect to canonical Receptsarok recipe pages instead of rendering duplicate magazine content.

#### Where redirects are stored

| Layer | Location | Role |
|---|---|---|
| **Manifest (git)** | `src/lib/data/receptsarok-redirects.json` | Version-controlled source of truth for static mappings. Shape: `{ generatedAt, sourceDocs, sourceRecipes, entries: [{ modxContentId, path, year, id }] }`. Each entry resolves to `/receptsarok/{year}/{id}`. |
| **Firestore (runtime)** | `docs/{encodeDocPathId(path)}` → field `redirect` | What the live site reads — full path string, e.g. `/receptsarok/2013/makos-es-dios-bejgli`. Written by `npm run sync:modx*`. |
| **In-memory (sync only)** | `ReceptsarokRedirectMaps` in `src/lib/modx/transform.ts` | `byContentId` + `byPath` maps built from the manifest at the start of each sync run; dynamic matches are registered in-memory and appended to the manifest before the run ends. |

There is no Netlify `_redirects` file or `netlify.toml` rule for these — SvelteKit SSR performs the redirect.

**Firestore `docs` gotcha**: the site reads `docs/{encodedPath}` (`~`-separated path). Some legacy docs also exist keyed by numeric MODX id — updating those does nothing for the live site.

#### Sync-time processing

**Files:**
- `scripts/sync-modx-to-firestore.mjs` — orchestration
- `scripts/lib/receptsarok-redirects-manifest.mjs` — `loadRedirectsManifest`, `mergeRedirectEntries`, `appendRedirectsManifest`, `registerRedirectEntries`
- `scripts/lib/receptsarok-redirect-match.mjs` — `matchReceptsarokRedirectTarget`, `resolveReceptsarokRedirect`
- `src/lib/modx/transform.ts` — `loadReceptsarokRedirectMaps`, `setReceptsarokRedirect`

**Per changed MODX row** (during `sync:modx` / `sync:modx:payload` / `sync:modx:full`):

1. Load manifest → `redirectMaps` (`byContentId`, `byPath`).
2. Batch-read existing `doc.redirect` from Firestore for changed rows that lack a cached redirect (`loadExistingRedirectsForChanged`).
3. **`resolveReceptsarokRedirect`** picks the target in this order (first hit wins):
   - Static manifest entry by `modxContentId`
   - Static manifest entry by normalized article `path`
   - Existing Firestore / in-run cached redirect (fallback)
   - **Dynamic match** against published recipes in `recipes.json` — only when none of the above apply
4. **`setReceptsarokRedirect`** sets or clears `doc.redirect` on the processed document.
5. Upsert processed doc to `docs/{encodeDocPathId(path)}`.
6. New dynamic matches → **`appendRedirectsManifest`** (merged by `modxContentId`; GitHub Actions may commit the updated file).
7. Any resolved redirect (static or dynamic) → target recipe **`free: true`** in `recipes.json` + Firestore (`applyModxLinkedRecipeFreeFlags`); when any recipe updated, **`sync:rs-collections:apply`** runs (unless `--skip-rs-collections`).

#### Dynamic matching

Eligible docs (`isMagazineRecipeDoc` in `receptsarok-redirect-match.mjs`):

- Exactly one tag: `recept`, **or**
- Legacy MODX path `receptsarok/{category}/{slug}` (no year segment)

**Match order** (`matchReceptsarokRedirectTarget` — same rules as `recipes:dedupe:manual`):

1. Legacy path alias — slug under `receptsarok/…` matched to recipe `id` (`chooseWinner` / `pickRedirectTarget`)
2. Title scoring (min 60) + author compatibility + alias-id bonus; winner picked with dedupe tie-break
3. Alias-only match on recipe `id`
4. Exact `{year from path YYMM}/{alias}` key in catalogue

**Dedupe tie-break** (shared with recipe dedupe): real author → video → nutrition count → more recent year → lexical `{year}-{id}`.

#### Runtime request handling

- **`src/routes/[...path]/+layout.server.ts`**: `doc.redirect` → HTTP 308 to Receptsarok URL; missing doc → 307 to `/keres?q=…`
- **`src/routes/[...path]/+page.server.ts`**: skips `ReceptsarokWidget` when `doc.redirect` is set
- **Excluded from listings**: `isListedDoc()` (`src/lib/modx/collections.ts`) and article MiniSearch indexing (`scripts/lib/search-index.mjs`) skip docs with `redirect`

#### Pitfalls & maintenance

- Manifest `year` differing from the article path's YYMM issue year is **normal** — the redirect targets the canonical/booklet copy.
- **Broken redirect**: manifest `{year}-{id}` missing from `recipes.json` → user lands on a 404; fix the manifest entry or restore the recipe, then re-sync.
- **After changing a recipe's `year`**: update `recipes.json`, check `receptsarok-redirects.json`, re-run `sync:recipes:apply`, then `sync:modx` so `doc.redirect` on the path-encoded Firestore doc is refreshed.
- **Static manifest entries always win** over dynamic re-matching — edit the manifest to override a bad automatic match.
- **`scripts/fix-modx-recipe-years.mjs`** can batch-update manifest `year` fields when issue-code years were misinterpreted.

### Paywall / Freemium Model

- **Free recipes**: Firestore `recipes` documents with **`free: true`** are free (full content visible); the app uses `isRecipeFree()` in `src/lib/receptsarok.ts` (`recipe.free === true` only). Sample-year recipes must set this flag in data (e.g. all 2025 booklet recipes ship with `free: true` in `recipes.json` / Firestore).
- **Other years**: Nutrition teaser visible to all, ingredients + instructions gated
- **Subscription status**: Stored in Firestore `users/{uid}.subscription.receptsarok`
- **Client-side gating**: `hasReceptsarokAccess` derived store in `authStore.ts`
- **Dev mode** (`vite dev`): any signed-in user is treated as a subscriber for UI and for `requireReceptsarokSubscriber` (after valid ID token); production behavior unchanged
- **Free trial period**: when the env var **`PUBLIC_RECEPTSAROK_TRIAL`** is `'true'`/`'1'` (set in Netlify), any signed-in user gets full access in production too — same code path as dev mode. Helper: `isReceptsarokTrialActive()` in `src/lib/receptsarokAccess.ts`, honored by `hasReceptsarokAccess` (client) and `requireReceptsarokSubscriber` (server). `PaywallCTA.svelte` (all three contexts: recipe page, `RecipeFilters`, `MealPlanner`) then shows "Ingyenes próbaidőszak" messaging with a login button (opens `#mod_login`) instead of the `/elofizetes` subscription CTA, and `/receptsarok` home swaps the free-count copy for trial messaging; category cards always show the real `freeCountsByCategory` numbers (trial does not inflate them). Card lock icons (RecipeCard via `$hasReceptsarokAccess` in category list, `/keres`, `ReceptsarokWidget`) clear automatically once the user signs in. Unset/false ⇒ normal paywall. Note: SSR still strips gated fields (`stripRecipeGatedFields`); trial users load full recipes client-side via `/api/receptsarok/recipe/...` like subscribers.
- Free magazine recipes (`recept`-tagged articles in MODX) remain free, unaffected

### Route Structure

- `/receptsarok` — Category grid (7 categories with cover images and counts), meal planner toggle
- `/receptsarok/[category]` — Recipe list filtered by category, with nutrition filters (premium) and sorting
- `/receptsarok/[year]/[id]` — Individual recipe page (`id` = recipe slug field, not Firestore doc id); shows full content if free or subscribed, paywall CTA otherwise. Also renders the meal planner toggle + `MealPlanner` at the bottom (same one as the `/receptsarok` home), passing the current recipe as the `currentRecipe` prop so the planner shows a hollow quick-add card for it under the active day

### Components

- `RecipeCard.svelte` — Card with title, image, author, compact nutrition, lock icon for gated recipes
- `NutritionTable.svelte` — Full or compact nutrition table display
- `RecipeFilters.svelte` — Combined filter form: 3 nutrition preset **toggle chips** (kalória ≤ / szénhidrát ≤ / fehérje ≥) + collapsible panel with range sliders, ingredient search and sort. Chips and sliders read/write the same bound `filters` state (chip label live-updates from slider value; toggling never resets other dimensions). Chip activation auto-sets sort for its dimension only until the user picks a sort manually (`sortTouched`). Premium-gated via the `hasAccess` prop (`$hasReceptsarokAccess` on the category page): chips are disabled with lock icons and the panel shows `PaywallCTA` without access
- `PaywallCTA.svelte` — Subscription prompt with context-specific messaging
- `ReceptsarokWidget.svelte` — Cross-link widget for magazine recipe articles ("Kapcsolódó receptek a Receptsarokban")
- `MealPlanner.svelte` — Weekly meal planner with per-day recipe list, aggregated nutrition, and shopping list (premium-gated). Loads the **slim catalog** from `/api/receptsarok/recipes` (layout entries, no ingredients/instructions); the shopping list fetches each planned recipe's `ingredientGroups` individually via `/api/receptsarok/recipe/[year]/[id]` and caches them client-side. Search input strips one kcal (energy) and one gram (carbs) nutrition filter before AND-matching the remaining words: exact (`350 kcal`, `20 g`), closed range (`100-200 kcal`), or strict `<`/`>` comparison (`<350 kcal`, `>20 g`); kcal also matches `kalória`/`kaloria` spellings, grams also `gr`/`gramm`. Its open/closed state lives in the persisted `plannerOpen` store (`mealPlannerStore.ts`, `localStorage` key `receptsarok.mealPlan.open.v1`) shared by the home page and every recipe page, so navigating between recipes doesn't collapse it

### Cross-linking with Magazine

The `[...path]/+page.svelte` shows a `ReceptsarokWidget` with matching Receptsarok recipes whenever the page server returns any (`{#if rsMatches.length}` — no longer gated on the `recept` tag, so editorial hubs render it too). Sources, in priority order:

0. **Precomputed recipe link group** (`doc.related`, keys `{year}-{id}`): set at sync (see [Related articles](#related-articles)) for hubs/articles whose related list is a set of recipes. `[...path]/+page.server.ts` resolves it first via `relatedRecipesByKey()`. The tag-based "Kapcsolódó cikkek" grid is suppressed whenever the widget shows a curated/derived group (`!rsWidgetLinked`). Falls through to the runtime detection below when unset (e.g. not yet synced).
0b. **Multi-recipe collection article** ("gyűjtőcikk"): an article whose own body was split into several Receptsarok recipes (e.g. `cikkek/diabetes/1503/recept-sarok` → 5 dishes, `cikkek/diabetes/1703/nagy-margit-gyumolcsos-receptjei` → 22). These have **no `linkedModxIds`** and the recipes are **not** path-siblings — the link is the `sourceModxId` back-reference. `recipesBySourceModxId(doc.id)` (`src/lib/server/similarRecipes.ts`) resolves them; this is also `docRelatedKeys` tier 0. Without it these fell through to title similarity (which guesses for a descriptive title, finds nothing for a generic one like "Recept-sarok"). The split happens in the dedupe pipeline (`buildRecipesFromModxDoc`); the article itself does not `redirect` (single-recipe articles do).
1. **Curated "További receptek" links** (`linkedModxIds`): many MODX recipe articles end with a `<p|h2|h3>További … receptek</…>` + `<ul>` of `[~id~]` links to related recipes (same magazine issue/series). The shared extractor `src/lib/modxLinkedRecipes.js` reads them — in the parser onto `recipe.linkedModxIds` (recipes.json/Firestore) and in `modx/transform.ts` onto the magazine doc (at the start of `alapjav`, **before** `[~id~]` → path rewriting destroys the ids). When present, `linkedRecipesFor()` resolves them via recipes' `sourceModxId` + the redirect manifest (`receptsarok-redirects.json` — covers dedupe-variant docs), and the widget shows **all of them** (not 4), heading "Kapcsolódó receptek a Receptsarokban". The same extractor strips these blocks out of derived `instructions`. Existing data needs `recipes:backfill-content:apply` (recipes) / `sync:modx:full` (magazine docs) after extractor changes.
   - **Recipe folders** (`isfolder` + `recept` tag) with no own `linkedModxIds` fall back to their **direct child recipes** — `[...path]/+page.server.ts` resolves the children's MODX ids via `getChildModxIds()` (a `parent ==` query) and feeds them to `linkedRecipesFor()`, so e.g. `cikkek/diabetes/2201/husveti-receptek` lists its 5 own recipes (heading "További receptek a Receptsarokban") instead of a title-similarity guess.
2. **Similarity fallback** — `similarRecipesFor()` in `src/lib/server/similarRecipes.ts`: a recipes-only MiniSearch index (title/searchTerms/ingredientNames; same fuzzy+prefix options as `/keres`) built in-process and memoized against the `getRecipes()` result (~100 ms once per lambda instance, sub-ms per query). When a title matches nothing (compound words like „Csicsókaleves”), it retries with the recipe's rarest own terms by corpus document frequency. Top 4, heading "Kapcsolódó receptek a Receptsarokban".

The recipe detail page uses the same priority, preferring the recipe's own precomputed **`recipe.relatedCards`** (keys `{year}-{id}`, resolved via `relatedRecipesByKey()`) over the runtime `linkedModxIds` resolution → **co-derived siblings** (`recipesBySourceModxId(recipe.sourceModxId)` minus self) → similarity. `recipe.relatedCards` (`scripts/lib/related-recipe-cards.mjs`, `recipeRelatedKeys`, published-only/minus-self) is the union of (1) `linkedModxIds` and (2) **same-`sourceModxId` siblings** — so the dishes split out of one collection article (e.g. `recept-sarok`'s 5, `nagy-margit-…`'s 22) mutually relate even with no link list. Unpublished recipes (dedupe losers) never get `relatedCards`. Backfill with `npm run recipes:backfill-related:apply` (→ `recipes.json`, then `sync:recipes:apply`); refreshed every `sync:modx*` run. Uniform with a magazine doc's `related`. Returned as slim `RecipeLayoutEntry[]`; the root layout does not ship full recipes.

---

## Magazine Content Sync (MODX → Firestore)

Magazine articles are **not** bundled in the Netlify build. MODX MySQL is read only by the sync worker (`scripts/sync-modx-to-firestore.mjs`), which writes to Firestore and Firebase Storage. The live app reads `docs/{path}`, `collections/{slug}`, and `meta/search` at SSR/browse time.

**GitHub Actions sync**: Workflow `.github/workflows/sync-modx-to-firestore.yml` — **manual** (`workflow_dispatch`) or triggered from MODX on save (`scripts/modx/modx-firestore-sync-plugin.php`). Supports **full backfill** via workflow input.

**Receptsarok redirects + free flags**: See [Magazine → Receptsarok redirects](#magazine--receptsarok-redirects-storage--processing). Summary: `sync:modx*` loads `receptsarok-redirects.json`, resolves `doc.redirect`, appends new dynamic matches to the manifest, sets linked recipes `free: true`, and may run `sync:rs-collections:apply`. GitHub Actions commits manifest + `recipes.json` when changed.

### Commands

Run from repo root (`magazin/`). Requires `.env` with `MODXDB_*`, `FIREBASE_ADMIN_KEY`; Storage uploads also need `FIREBASE_STORAGE_BUCKET` (or project id in service account → `{project}.firebasestorage.app`).

**Save-triggered path (MySQL-free)**: The MODX plugin now dispatches a `repository_dispatch` event (`modx-doc-save`) instead of a `workflow_dispatch`. The payload carries the full article row + ancestors + filtered TVs (ids 3,4,18,23,25,28,29,30,31) + matched author chunks, gzip+base64-encoded. The workflow runs `sync:modx:payload` which needs **no MySQL or cPanel**. `meta/sync.lastEdit` is **not** advanced on payload runs; the periodic manual incremental sync acts as backstop. The PAT (`magazin_github_token`) requires **Contents: write** in addition to Actions read/write.

| Command | Script | When to use |
|---------|--------|-------------|
| `npm run sync:modx` | `scripts/sync-modx-to-firestore.mjs` | **Incremental sync** — upsert changed rows; patch `meta/projections` Storage snapshot + collections/search incrementally (**~few Firestore reads**, not full `docs` scan). Rebuilds `collections/rs-home` (`freeCountsByCategory`) when recipe `free` flags change (`--skip-rs-collections` to opt out). |
| `npm run sync:modx:full` | `… --full` | **One-time / full backfill** — all published magazine rows → Firestore; also removes orphan `docs/*` whose MODX id is no longer published **and stale `docs/*` left by alias changes** (id still published but doc-id no longer matches the synced path). Also backfills `doc.tv.egyesulet` (TV 31) onto all existing docs. |
| `npm run sync:modx:payload` | `… --from-payload` | **MySQL-free save path** — reads rows from `MODX_SYNC_PAYLOAD` env var (gzip+base64 JSON); used by the `repository_dispatch` GitHub Actions trigger. Does not advance `meta/sync.lastEdit`. |
| `npm run sync:modx:finish` | `scripts/finish-modx-sync.mjs` | **Repair pass** — `docs/` already populated but search index, `relatedCards`, or `meta/search` missing (e.g. sync failed mid-run). |
| `npm run sync:rs-collections:apply` | `scripts/sync-receptsarok-collections.mjs` | **Receptsarok UI docs** — rebuild `collections/rs-home`, `rs-{category}`, `rs-teasers-*` from local `recipes.json` + `categories.json` (`--from-firestore` to override); merges counts into `meta/stats`; uploads the slim planner catalog to Storage; skips unchanged docs via `meta/rsCollections` hashes. Run after `sync:recipes:apply` or MODX `free` flag changes. Pass without `:apply` for dry run + index-entry warnings. |
| `npm run sync:patika:apply` | `scripts/sync-patika-collection.mjs` | **Patika UI doc** — rebuild `collections/patika` from `tables/elofizetok/patika` subcollection. Pass without `:apply` for dry run. |
| `npm run verify:firestore-magazine` | `scripts/verify-firestore-magazine.mjs` | **Spot-check** — counts `docs/*`, `collections/*`, `meta/search`, sample routes, index URL reachability. |
| `node scripts/backfill-junior-magazine-fields.mjs [--apply]` | `… + scripts/lib/junior-content-fields.mjs` | **Junior field backfill — chained onto `sync:modx` + `sync:modx:full`** (runs automatically after each; idempotent). Junior-template (MODX template 9) articles keep their heading fields in *content*, not the (unreliable) `site_content` columns. Writes `docs/` **directly**: `description`←`.felcim`, `introtext`←`.j_lead` (any element), set only when the element is present (an absent one leaves the existing value; it clears only a misplaced felcim the `introtext` column captured, e.g. id 1040). Scope: every published template-9 doc **except standalone recipes** (1 RS recipe); collections + plain articles included. `title`←`<h1>` when present, else the doc's `longtitle` (the junior `<h1>` is sometimes a series heading/credit, e.g. 878→"GrandmaSandy.com", but it is the chosen source of truth). The extracted `<h1>`/`.felcim`/`.j_lead` are also **stripped from the doc's `content`** (`stripJuniorFields`, matched by text so a later same-class body element is kept and re-runs converge) so the page header — which renders these from the doc fields ([`routes/[...path]/+page.svelte`](src/routes/[...path]/+page.svelte)) — doesn't repeat them in the body. The MySQL-free `sync:modx:payload` (save path) does **not** chain it, so a saved junior article is corrected on the next `sync:modx`; the search index also updates then. |

**Optional env** (sync worker): `NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN` — purge the CDN cache after sync (non-fatal if unset). Netlify's purge API (`POST /api/v1/purge`, [`scripts/lib/netlify-purge.mjs`](scripts/lib/netlify-purge.mjs)) only purges by cache tag or whole-site — there is no purge-by-path — and responses carry no cache tags, so a successful sync triggers a **whole-site** purge. The collected changed paths are used only for log context. Set `SYNC_DEBUG_PATHS=1` to re-enable the per-pass `parentDoc not found <id>` path-resolution warnings (silenced by default — they false-positive across the multi-pass ancestor/changed resolution).

**What gets written**

- `docs/{encodedPath}` — full article payload. The doc-id is derived from the article path (`encodeDocPathId`), so **changing an article's alias changes its doc-id**. On every changed row the incremental/payload sync deletes any prior `docs/*` for the same MODX id that now sits at a different doc-id, and drops the old path from the projection, search index, and CDN purge — so a rename leaves exactly one article (full sync does the same in its orphan scan).
- `collections/{slug}` + `collections/home` — top 72 thin cards per tag collection
- `meta/search` — `{ indexUrl, version, articleCount, recipeCount }`
- `meta/stats`, `meta/sync.lastEdit`
- `static/search-meta.json` — fallback for `/keres` when API unavailable

### Agent reminders

**When assisting the user, proactively remind them to run the relevant command if their task matches:**

| User situation | Remind them to run |
|----------------|-------------------|
| First deploy, new Firebase project, or empty article pages / 503 on `/api/search-meta` | `npm run sync:modx:full` then `npm run sync:rs-collections:apply` then `npm run sync:patika:apply` then `npm run verify:firestore-magazine` |
| Edited/published MODX article but live site still stale | `npm run sync:modx` or trigger GitHub Actions **Sync MODX to Firestore** (check MODX plugin + `magazin_github_token`) |
| Unpublished/deleted MODX article still visible on site | `npm run sync:modx` (incremental removes from Firestore) or `sync:modx:full` for orphan cleanup |
| Changed an article's alias (URL slug) → **two articles** now show (old + new URL) | Already auto-handled: next `sync:modx`/payload save deletes the stale old-path `docs/*`. If a leftover predates this fix, `npm run sync:modx:full` clears it. |
| `/keres` shows “index not available” but articles load | `npm run sync:modx:finish` |
| `/receptsarok` shows wrong category counts, `/keres` recipe hits missing nutrition/img, or category listing stale after `sync:recipes:apply` | `npm run sync:rs-collections:apply` (rebuilds `collections/rs-home`, `rs-{cat}`, `rs-teasers`) |
| `/patika` empty or pharmacy list outdated after editing `tables/elofizetok/patika` in Firestore | `npm run sync:patika:apply` |
| After any sync, or debugging missing/wrong article counts | `npm run verify:firestore-magazine` |
| New MODX `recept` article should redirect to Receptsarok but doesn't | Run `npm run sync:modx` — redirect + `free: true` are computed at sync time; commit updated `receptsarok-redirects.json` / `recipes.json` if changed locally |
| MODX `recept` linked in Receptsarok but still paywalled | Run `npm run sync:modx` (sets `free: true` on `recipes.json` + Firestore and rebuilds `collections/rs-home`); if counts still stale, run `npm run sync:rs-collections:apply` manually |
| Transform pipeline / collection query logic changed in code | `npm run sync:modx:full` (or incremental if only future edits matter) |
| User asks how content gets to production without Netlify rebuild | Explain MODX save → GitHub Actions `repository_dispatch` (modx-doc-save) → `sync:modx:payload` (MySQL-free); code deploys ≠ content deploy; receptsarok / patika data come from their own sync steps |
| MODX plugin dispatches but GitHub Action fails immediately (no MySQL errors) | Check PAT has Contents: write; check `MODX_SYNC_PAYLOAD` env is non-empty in the run |
| `doc.tv.egyesulet` missing on old articles after enabling TV 31 | Run `npm run sync:modx:full` to backfill all existing docs |
| Re-saved a MODX **recipe collection** (or fixed the recipe parser) but recipe content / per-recipe images didn't change | Pipeline is create-only and `sync:modx` doesn't rebuild recipes. New docs → `npm run recipes:dedupe:manual`; existing recipes after a parser fix → `npm run recipes:backfill-content:apply` then `npm run sync:recipes:apply` |
| Article's "További receptek" link list changed but the widget on the recipe page still shows old/4 similar recipes | `npm run recipes:backfill-content:apply` + `npm run sync:recipes:apply` (recipe `linkedModxIds`); magazine doc side needs `npm run sync:modx` (incremental, re-save) or `sync:modx:full` (backfill all) |
| Editorial recipe hub (e.g. `cikkek/hypertonia/1601/nyari-gyumolcsok`) or its sibling recipes show tag-based "similar" instead of the group's recipes | `doc.related` / `recipe.relatedCards` are computed by `scripts/lib/related-recipe-cards.mjs`. Backfill recipes with `npm run recipes:backfill-related:apply` + `npm run sync:recipes:apply`; backfill all `doc.related` with `npm run sync:modx:full` (both are also written/refreshed on every incremental `sync:modx`). |
| Same recipe shows up twice under different years (title duplicate) | `npm run recipes:dedupe:internal` (review audit) → `:apply-local` → `sync:recipes:apply` → `sync:rs-collections:apply`; winner = real author > video > nutrition > year |
| Recipe year looks wrong (e.g. 2001) | MODX paths carry YYMM issue codes, never four-digit years — fix the recipe's `year` in `recipes.json`, re-sync (old `{year}-{id}` doc is deleted as orphan), then check `receptsarok-redirects.json` + the article's `doc.redirect` in Firestore for the stale year |
| Recipe data changed but dev server still shows old recipes / deleted recipe still renders | Restart the dev server — `getRecipes()` is memoized per process. On restart the dev server re-scans Firestore only when `meta/recipesUpload.revision` differs from the local `.recipes-rev.json` sidecar |
| Manually edited a `recipes/*` doc in the Firestore console and `sync:recipes:apply` says "0 changed" | The diff baseline (`meta/recipesUpload`) can't see console edits — run `npm run sync:recipes -- --apply --force` (full rewrite + orphan re-scan) |
| Meal planner shows stale recipes / wrong free flags after a sync | `sync:rs-collections:apply` re-uploads the slim catalog (`receptsarok/catalog.json.gz`); clients cache it for 1h (`Cache-Control: private, max-age=3600`) |
| Article's recipe redirect points at a 404 | Manifest entry's `{year}-{id}` no longer exists in `recipes.json` — fix the entry, and update `doc.redirect` on `docs/{encodedPath}` (not the legacy numeric-id doc) |

Do **not** suggest `npm run build` to refresh article text — content updates come from the sync worker, not the SvelteKit build.

---

## Data Flow Summary

1. **Site Configuration**: Loaded in layout servers, available to all routes
2. **Documents**: Firestore `docs/` + `collections/` via `$lib/magazine/firestore` (synced from MODX by `npm run sync:modx*`). Magazine recipe redirects: manifest `src/lib/data/receptsarok-redirects.json` + sync → `doc.redirect` on path-encoded docs → SSR 308 (see [Magazine → Receptsarok redirects](#magazine--receptsarok-redirects-storage--processing)).
3. **Quizzes**: Loaded from Firestore via `getKviz()`
4. **Scores**: Stored in Firestore at `kviz/{quizId}/scores/{uid}` (subcollection under each quiz document, stores `name`, `email`, `score`, `date` to the actual quiz/scores table)
5. **Recipes**: SSR via `$lib/receptsarokFirestore` (`collections/rs-home`, `collections/rs-{category}`, `recipes/{year}-{id}` detail). `/keres` recipe teasers come from the search index itself (zero reads). Root-layout counts come from one `meta/stats` read. Populated by `sync:recipes:apply` (diff-based via `meta/recipesUpload`) + `sync:rs-collections:apply` (hash-skip via `meta/rsCollections`, slim catalog → Storage). Magazine `sync:modx` maintains `meta/projections` Storage snapshot + incremental search index (not full-catalog Firestore reads each run).
6. **Search**: Client-side MiniSearch index from Firebase Storage (`/keres`; meta via `/api/search-meta`)
7. **Navigation**: 
   - **Nav1** (Primary): Main menu with direct links and dropdowns (`nav1.js`); includes Receptsarok link
   - **Nav2** (Secondary): Categorized content sections (`nav2.js`)
   - Used for route matching and title generation
   - Active state highlighting based on current route

---

## Key Libraries & Services

- **SvelteKit**: Framework
- **Firebase**: Authentication and Firestore database
- **MiniSearch**: Full-text search
- **Shopify Buy Button SDK**: E-commerce integration
- **Marked**: Markdown parsing for quiz descriptions
- **Netlify Forms**: Form submission handling

---

## MCP Servers & AI Assistant Integration

This project is configured with three MCP (Model Context Protocol) servers available to Claude and Cursor agents. These servers provide real-time documentation, validation, and analysis tools for key libraries and services.

### Available MCP Servers

#### 1. Svelte MCP Server (`svelte`)

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@sveltejs/mcp"]
}
```

**Purpose**: Provides Svelte 5 documentation, component validation, and code analysis.

**Tools & Resources**:
- `svelte-docs`: Look up Svelte 5 API documentation and best practices
- `analyze-svelte`: Validate and analyze `.svelte` component files
- Access to official Svelte documentation and examples

**When to Use**:
- Creating or editing `.svelte` components (e.g., `Nav.svelte`, `+page.svelte` routes)
- Creating or editing `.svelte.ts` / `.svelte.js` modules
- Looking up Svelte 5 API features (runes, bindings, event handling, lifecycle)
- Validating component structure and reactivity
- Understanding Svelte best practices for performance and maintainability

**Example Use Cases**:
- "How do I use the new Svelte 5 runes for state management?"
- "Validate this component's reactivity patterns"
- "What's the best way to handle form bindings in Svelte?"

---

#### 2. Firebase MCP Server (`firebase`)

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "firebase-tools@latest", "mcp"]
}
```

**Purpose**: Provides Firebase documentation, CLI commands, and deployment guidance.

**Tools & Resources**:
- `firebase-docs`: Firebase SDK and services documentation
- `firebase-cli`: Firebase CLI command reference and usage
- Authentication, Firestore, Realtime Database, Functions, Hosting, Storage guidance

**When to Use**:
- Working with Firebase Authentication (Google Sign-In, Email Link Auth)
- Querying or managing Firestore database (`docs/`, `collections/`, `kviz/`, `recipes/`)
- Firebase Storage operations (image uploads, search index hosting)
- Understanding Firestore security rules and data structure
- Debugging Firebase-related issues (auth state, data loading, permissions)

**Example Use Cases**:
- "How do I query Firestore with specific filters?"
- "What's the best way to structure a Firestore subcollection for quiz scores?"
- "How can I implement a listener for real-time updates from Firestore?"
- "How do I upload files to Firebase Storage?"

---

#### 3. Daisy UI MCP Server (`daisyui`)

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote", "https://gitmcp.io/saadeghi/daisyui"]
}
```

**Purpose**: Provides Daisy UI component documentation, Tailwind configuration, and design system reference.

**Tools & Resources**:
- `daisyui-components`: Complete Daisy UI component library documentation
- `tailwind-config`: Tailwind CSS configuration and utilities
- HTML/CSS examples for all Daisy UI components
- Theming and customization options

**When to Use**:
- Building or styling UI components (buttons, cards, modals, forms, dropdowns)
- Implementing responsive layouts and grids
- Creating navigation menus and dropdowns
- Styling quiz components, recipe cards, and article layouts
- Applying Daisy UI themes and color schemes
- Understanding available Tailwind classes and responsive breakpoints

**Example Use Cases**:
- "How do I create a dropdown menu with Daisy UI?"
- "Show me the Daisy UI card component structure"
- "What's the best Daisy UI component for a search input?"
- "How do I customize button styles with Daisy UI?"
- "How can I create a responsive grid layout for recipe cards?"

---

### How Agents Use These MCP Servers

When an agent (Claude or Cursor) works on this project, it can automatically access these MCP servers to:

1. **Validate Code**: Check Svelte component syntax and patterns
2. **Lookup Documentation**: Get real-time API docs for Svelte 5, Firebase, and Daisy UI
3. **Provide Examples**: Retrieve working code examples from official docs
4. **Offer Best Practices**: Reference recommended patterns for each technology
5. **Troubleshoot Issues**: Get guidance on common problems and solutions

### Project-Specific MCP Usage Guidelines

**For Svelte Components**:
- Always use the Svelte MCP server when creating/editing `.svelte` files
- Validate component reactivity and event handling patterns
- Check for performance best practices (memoization, deduplication)

**For Firebase Operations**:
- Use the Firebase MCP server when implementing authentication flows
- Reference Firestore schema design and subcollection patterns
- Look up security rules and data validation strategies

**For UI Development**:
- Use Daisy UI MCP for styling magazine articles, cards, and navigation
- Reference component patterns for recipe cards, quiz forms, and pharmacy listings
- Ensure consistent theming across responsive breakpoints

---

## Route Priority

Routes are matched in this order:
1. Exact routes (`/`, `/kviz`, `/keres`, `/patika`, `/elofizetes`, `/receptsarok`)
2. Receptsarok dynamic routes (`/receptsarok/[category]`, `/receptsarok/[year]/[id]`)
3. Quiz dynamic routes (`/kviz/[...id]`)
4. Catch-all route (`/[...path]`) - handles collections and individual documents
