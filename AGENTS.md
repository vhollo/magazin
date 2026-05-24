# Route Logic Documentation

This document describes the logic and behavior of all routes in the Diabetes.hu magazine application.

## Table of Contents

1. [Navigation System](#navigation-system)
2. [Home Route (`/`)](#home-route-)
3. [Quiz Routes (`/kviz`)](#quiz-routes-kviz)
4. [Search Route (`/keres`)](#search-route-keres)
5. [Pharmacy Route (`/patika`)](#pharmacy-route-patika)
6. [Subscription Route (`/elofizetes`)](#subscription-route-elofizetes)
7. [Dynamic Content Routes (`/[...path]`)](#dynamic-content-routes-path)
8. [Authentication Logic](#authentication-logic)
9. [Magazine Content Sync (MODX → Firestore)](#magazine-content-sync-modx--firestore)

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

## Home Route (`/`)

**Files:**
- `src/routes/+page.svelte`
- `src/routes/+page.server.ts`
- `src/routes/+layout.server.ts`

### Server-Side Logic (`+page.server.ts`)

- **SSR** (not prerendered): one Firestore read of `collections/home`
- **Data Loading**:
  - Returns latest 72 article cards from `collections/home`
  - `Cache-Control`: CDN-cached (`s-maxage=86400`)

### Client-Side Logic (`+page.svelte`)

- **Components**:
  - `Carousel` - Displays featured content carousel
  - `BannerTop` - Shows top banners if configured
  - `Search` - Search component with document count
  - `Nav2` - Secondary navigation
  - `Cards` - Displays article cards

- **Title Logic**:
  - Matches document path against navigation structure (`nav2`)
  - Uses matching subcategory name as title if document title is missing
  - Falls back to document title or empty string

- **SEO Meta Tags**:
  - Dynamic title, description, keywords, author
  - Open Graph tags for social sharing
  - Image preloading for document images

- **Content Display**:
  - Shows carousel on home page
  - Displays article cards if documents exist
  - Shows "Hasonló cikkek" (Similar articles) if viewing a specific document

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

- **Prerendering**: Enabled (`prerender = true`) — static page shell only
- Returns `{ doc: { path: 'keres', title: 'Keresés' } }`; no document index on the server

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

- **Prerendering**: Enabled
- Loads pharmacy data via `getPatika()`
- Returns pharmacies array and document metadata (`patikas`, `doc` with path and title)

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

- **Content**:
  - Explains subscription offer (Diabetes magazine + Hypertonia at half price)
  - Limits to maximum 3 items
  - Hungarian language interface

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
- `hirek`: ['hírek']
- `diaeuro`: ['+diaeuro']
- `all`: [] (all documents)

**Tag Query Syntax**:
- `+tag`: Required tag (high priority)
- `#tag`: Important tag (medium priority)
- `tag`: Optional tag (low priority)
- `-tag`: Excluded tag

**Ranking Algorithm**:
1. Required tags (`+`): 100 points each
2. Important tags (`#`): 10 points each
3. Optional tags: 1 point each
4. Excludes documents with excluded tags (`-`)
5. Sorts by rank (descending)
6. Returns top 72 documents (18 × 4)

#### Individual document routes

- Loads `docs/{encodeDocPathId(path)}` from Firestore
- If not found: redirects to `/keres?q=…`
- If found: returns document; similar articles from `doc.relatedCards` (precomputed at sync) or collection fallback

#### Related articles

- Primary source: `doc.relatedCards` on the Firestore document (patched by sync worker)
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

Recipes are loaded from Firestore `recipes` collection via `getRecipes()` in `src/lib/siteConf.ts`, following the same pattern as quizzes and pharmacies (Firebase Admin in dev/build, JSON cache in production).

Categories from Firestore `categories` collection via `getCategories()`.

Types and constants defined in `src/lib/receptsarok.ts`.

### Paywall / Freemium Model

- **Free recipes**: Firestore `recipes` documents with **`free: true`** are free (full content visible); the app uses `isRecipeFree()` in `src/lib/receptsarok.ts` (`recipe.free === true` only). Sample-year recipes must set this flag in data (e.g. all 2025 booklet recipes ship with `free: true` in `recipes.json` / Firestore).
- **Other years**: Nutrition teaser visible to all, ingredients + instructions gated
- **Subscription status**: Stored in Firestore `users/{uid}.subscription.receptsarok`
- **Client-side gating**: `hasReceptsarokAccess` derived store in `authStore.ts`
- **Dev mode** (`vite dev`): any signed-in user is treated as a subscriber for UI and for `requireReceptsarokSubscriber` (after valid ID token); production behavior unchanged
- Free magazine recipes (`recept`-tagged articles in MODX) remain free, unaffected

### Route Structure

- `/receptsarok` — Category grid (7 categories with cover images and counts), meal planner toggle
- `/receptsarok/[category]` — Recipe list filtered by category, with nutrition filters (premium) and sorting
- `/receptsarok/[year]/[id]` — Individual recipe page (`id` = recipe slug field, not Firestore doc id); shows full content if free or subscribed, paywall CTA otherwise

### Components

- `RecipeCard.svelte` — Card with title, image, author, compact nutrition, lock icon for gated recipes
- `NutritionTable.svelte` — Full or compact nutrition table display
- `RecipeFilters.svelte` — Nutrition range filters + ingredient search + sort (premium-gated)
- `PaywallCTA.svelte` — Subscription prompt with context-specific messaging
- `ReceptsarokWidget.svelte` — Cross-link widget for magazine recipe articles ("Hasonló receptek a Receptsarokban")
- `MealPlanner.svelte` — Weekly meal planner with per-day recipe list, aggregated nutrition, and shopping list (premium-gated)

### Cross-linking with Magazine

When a magazine article has the `recept` tag, the `[...path]/+page.svelte` shows a `ReceptsarokWidget` with matching Receptsarok recipes (matched by title keywords against `searchTerms`/`ingredientNames`). Matches are computed in `[...path]/+page.server.ts` as slim `RecipeLayoutEntry[]` (`rsWidgetRecipes`) via memoized `getRecipes()` + `toLayoutRecipe`; the root layout does not ship full recipes.

---

## Magazine Content Sync (MODX → Firestore)

Magazine articles are **not** bundled in the Netlify build. MODX MySQL is read only by the sync worker (`scripts/sync-modx-to-firestore.mjs`), which writes to Firestore and Firebase Storage. The live app reads `docs/{path}`, `collections/{slug}`, and `meta/search` at SSR/browse time.

**GitHub Actions sync**: Workflow `.github/workflows/sync-modx-to-firestore.yml` — **manual** (`workflow_dispatch`) or triggered from MODX on save (`scripts/modx/modx-firestore-sync-plugin.php`). Supports **full backfill** via workflow input.

**Receptsarok redirects**: Static entries in `src/lib/data/receptsarok-redirects.json` are loaded at sync time. For new magazine `recept` docs, the sync worker also **matches against `recipes.json`** (title/author/alias, same rules as `recipes:dedupe:manual`) and sets `doc.redirect` → `/receptsarok/{year}/{id}`. New matches are appended to `receptsarok-redirects.json` during sync (commit that file when it changes locally).

### Commands

Run from repo root (`magazin/`). Requires `.env` with `MODXDB_*`, `FIREBASE_ADMIN_KEY`; Storage uploads also need `FIREBASE_STORAGE_BUCKET` (or project id in service account → `{project}.firebasestorage.app`).

| Command | Script | When to use |
|---------|--------|-------------|
| `npm run sync:modx` | `scripts/sync-modx-to-firestore.mjs` | **Incremental sync** — upsert changed published rows; **delete** magazine rows that were unpublished/deleted since `meta/sync.lastEdit`; rebuild collections/search. |
| `npm run sync:modx:full` | `… --full` | **One-time / full backfill** — all published magazine rows → Firestore; also removes orphan `docs/*` whose MODX id is no longer published. |
| `npm run sync:modx:finish` | `scripts/finish-modx-sync.mjs` | **Repair pass** — `docs/` already populated but search index, `relatedCards`, or `meta/search` missing (e.g. sync failed mid-run). |
| `npm run verify:firestore-magazine` | `scripts/verify-firestore-magazine.mjs` | **Spot-check** — counts `docs/*`, `collections/*`, `meta/search`, sample routes, index URL reachability. |

**Optional env** (sync worker): `NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN` — purge CDN cache for changed article paths after sync (non-fatal if unset).

**What gets written**

- `docs/{encodedPath}` — full article payload
- `collections/{slug}` + `collections/home` — top 72 thin cards per tag collection
- `meta/search` — `{ indexUrl, version, articleCount, recipeCount }`
- `meta/stats`, `meta/sync.lastEdit`
- `static/search-meta.json` — fallback for `/keres` when API unavailable

### Agent reminders

**When assisting the user, proactively remind them to run the relevant command if their task matches:**

| User situation | Remind them to run |
|----------------|-------------------|
| First deploy, new Firebase project, or empty article pages / 503 on `/api/search-meta` | `npm run sync:modx:full` then `npm run verify:firestore-magazine` |
| Edited/published MODX article but live site still stale | `npm run sync:modx` or trigger GitHub Actions **Sync MODX to Firestore** (check MODX plugin + `magazin_github_token`) |
| Unpublished/deleted MODX article still visible on site | `npm run sync:modx` (incremental removes from Firestore) or `sync:modx:full` for orphan cleanup |
| `/keres` shows “index not available” but articles load | `npm run sync:modx:finish` |
| After any sync, or debugging missing/wrong article counts | `npm run verify:firestore-magazine` |
| New MODX `recept` article should redirect to Receptsarok but doesn't | Run `npm run sync:modx` — redirect is computed at sync time; commit updated `receptsarok-redirects.json` if changed |
| Transform pipeline / collection query logic changed in code | `npm run sync:modx:full` (or incremental if only future edits matter) |
| User asks how content gets to production without Netlify rebuild | Explain MODX save → GitHub Actions + `sync:modx`; code deploys ≠ content deploy |

Do **not** suggest `npm run build` to refresh article text — content updates come from the sync worker, not the SvelteKit build.

---

## Data Flow Summary

1. **Site Configuration**: Loaded in layout servers, available to all routes
2. **Documents**: Firestore `docs/` + `collections/` via `$lib/magazine/firestore` (synced from MODX by `npm run sync:modx*`)
3. **Quizzes**: Loaded from Firestore via `getKviz()`
4. **Scores**: Stored in Firestore at `kviz/{quizId}/scores/{uid}` (subcollection under each quiz document, stores `name`, `email`, `score`, `date` to the actual quiz/scores table)
5. **Recipes**: Loaded from Firestore via `getRecipes()` and `getCategories()`; JSON cached as `recipes.json` and `categories.json`
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

## Route Priority

Routes are matched in this order:
1. Exact routes (`/`, `/kviz`, `/keres`, `/patika`, `/elofizetes`, `/receptsarok`)
2. Receptsarok dynamic routes (`/receptsarok/[category]`, `/receptsarok/[year]/[id]`)
3. Quiz dynamic routes (`/kviz/[...id]`)
4. Catch-all route (`/[...path]`) - handles collections and individual documents
