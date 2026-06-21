# Graph Report - magazin  (2026-06-21)

## Corpus Check
- 170 files · ~4,513,905 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1801 nodes · 2936 edges · 117 communities (111 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f92bf9c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 128|Community 128]]

## God Nodes (most connected - your core abstractions)
1. `ify` - 89 edges
2. `scripts` - 40 edges
3. `main()` - 35 edges
4. `$lib/components/Nav.svelte` - 25 edges
5. `buildRecipeFromModxDoc()` - 24 edges
6. `buildRecipeFromModxDoc()` - 22 edges
7. `customer` - 20 edges
8. `decodeHtmlEntities()` - 20 edges
9. `normalizeText()` - 20 edges
10. `buildAndUploadSearchIndex()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `buildRsHome()` --calls--> `isRecipeFree()`  [INFERRED]
  scripts/sync-receptsarok-collections.mjs → src/lib/receptsarok.ts
- `buildRsTeaserShards()` --calls--> `toKeresTeaser()`  [INFERRED]
  scripts/sync-receptsarok-collections.mjs → src/lib/receptsarok.ts
- `loadSubscription()` --calls--> `getDoc()`  [INFERRED]
  src/lib/auth.ts → scripts/verify-firestore-magazine.mjs
- `writeCollections()` --calls--> `homeDocs()`  [INFERRED]
  scripts/sync-modx-to-firestore.mjs → src/lib/modx/collections.ts
- `main()` --calls--> `createModxTransform()`  [INFERRED]
  scripts/sync-modx-to-firestore.mjs → src/lib/modx/transform.ts

## Communities (117 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (75): ify, admin_graphql_api_id, app_id, browser_ip, buyer_accepts_marketing, cancel_reason, cancelled_at, cart_token (+67 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): getReceptsarokHome(), encodeDocPathId(), COLLECTION_SLUGS, CollectionDoc, getMagazineArticle(), getMagazineCollection(), getMagazineStats(), getSearchMeta() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (65): modx_active_user_locks, modx_active_user_sessions, modx_active_users, modx_categories, modx_diabecinn2013, modx_diabpont2014, modx_diaeuro2014, modx_diaeuro2014_player (+57 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (45): CATEGORY_IDS, CATEGORY_KEYWORDS, categoryFeaturesFromRecipe(), collectText(), DEFAULT_PATTERNS_PATH, DEFAULT_STOPWORDS, featuresFromTokens(), firstKeywordMatch() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (44): categories, categoryStats, egytaletelek, haletelek, husetelek, koretek-italok-hidegkonyha, levesek, sos-edes-sutemenyek-desszertek-tesztak (+36 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (40): scripts, build, check, check:watch, db:generate, db:introspect, db:migrate, db:push (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): admin_graphql_api_id, created_at, currency, default_address, email, email_marketing_consent, first_name, id (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (36): Adatvédelem, Ajánlat, Bejelentkezés, Bejelentkezési Módok, Cikk Megjelenítése, Cikkek és Kategóriák, Diabetes.hu Magazin - Felhasználói Útmutató, Előfizetés (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (35): modx_site_content, modx_site_htmlsnippets, modx_site_tmplvar_contentvalues, decodeDocPathId(), purgeNetlifyPaths(), parseReceptsarokRedirectPath(), appendRedirectsManifest(), loadRedirectsManifest() (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (8): encodeDocPathId(), emptyContentFolderPaths(), parentPathOf(), updateRelatedCards(), docsByTags(), deleteOrphanFirestoreDocs(), loadExistingRedirectsForChanged(), writeCollections()

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (32): CATEGORY_IDS, CATEGORY_KEYWORDS, categoryFeaturesFromRecipe(), collectText(), DEFAULT_PATTERNS_PATH, DEFAULT_STOPWORDS, featuresFromTokens(), firstKeywordMatch() (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (14): apply, AUDIT_PATH, DATA_PATH, docById, docs, EXTRA_JSON_PATHS, recipeByKey, recipes (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (19): load(), load(), toTeaser(), buildReceptsarokCategory(), buildReceptsarokTeasers(), getReceptsarokCategory(), getReceptsarokTeasers(), isPublished() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (29): devDependencies, daisyui, drizzle-kit, eslint, eslint-config-prettier, eslint-plugin-svelte, globals, postcss (+21 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (66): NutritionValues, isMagazineRecipeDoc(), isReceptsarokLegacyModxPath(), matchReceptsarokLegacyPathAlias(), matchReceptsarokRedirectTarget(), redirectPathForTarget(), resolveReceptsarokRedirect(), titleMatchScore() (+58 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (70): decodeHtmlEntities(), NAMED_HTML_ENTITIES, buildRecipeFromModxDoc(), buildRecipesFromModxDoc(), cardImgFromSrc(), cleanServingParenthetical(), countNutritionValues(), decodeHtmlEntities() (+62 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (22): allCategoryRecipes, category, categoryId, { data }, double, filtered, filters, isFiltering (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (13): dependencies, dotenv, drizzle-orm, firebase, firebase-admin, jquery, marked, minisearch (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (29): recipeTeaserFromHit(), Category, IngredientGroup, IngredientItem, isRecipeFree(), KeresRecipeTeaser, LegacyHeroImage, normalizeRecipeAssetSrc() (+21 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (22): presentment_money, presentment_money, presentment_money, presentment_money, current_subtotal_price_set, current_total_discounts_set, current_total_price_set, current_total_tax_set (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (17): [], ads, nav2, svelte, $env/dynamic/public, snapshot, $lib/ads.js, $lib/components/BannerSide.svelte (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (26): normalizeArticlePath(), loadRecipesFromJson(), addArticlesInBatches(), articleToSearchDoc(), buildAndUploadSearchIndex(), buildKeresRecipeTeaser(), changedListedPaths(), createMiniSearch() (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (11): actions, GET(), RecipePublished, @sveltejs/kit, db, getAdminBucket(), getAdminDb(), getRecipes() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (20): recipeHeroToCardImg(), buildReceptsarokHome(), Banner, consolidateRecipeImg(), getCategories(), getKviz(), getScores(), getSiteConf() (+12 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (22): cleanServingParenthetical(), countNutritionValues(), decodeHtmlEntities(), deriveServings(), emptyNutritionTable(), htmlToTextLines(), mergeSplitDecimalIngredientLines(), NAMED_HTML_ENTITIES (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (9): actionCodeSettings, google_login(), handleCollapseClick(), handleCollapseKeydown(), provider, signInWithGoogle(), nav1, $lib/components/Nav.svelte (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (17): firebase/auth, $app/environment, $app/forms, loadSubscription(), authReady, authUser, AuthUserType, email (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (16): address1, address2, city, company, country, country_code, first_name, last_name (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): shipping_address, address1, address2, city, company, country, country_code, first_name (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (14): loadProjectionDocs(), pickDocFields(), PROJECTION_FIELDS, __dirname, loadFullProjectionFromFirestore(), loadProjectionDocsForSync(), mergeProjectionSnapshot(), readMetaProjections() (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.47
Nodes (6): deriveYear(), parseIssueCodeYear(), parseValidYear(), parseYearFromIso(), parseYearFromMagazinPath(), expectedModxImportYear()

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (11): emptyPlan(), MEAL_PLANNER_DAYS, MealPlanByDay, mealPlanClearAll(), MealPlannerDay, MealPlanRef, mealPlanRefs, normalizePlan() (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.27
Nodes (10): fetchSearchIndexText(), preferSearchIndexProxy(), readGzippedIndexResponse(), ClientSearchMeta, fetchSearchMeta(), getCachedSearchIndex(), getSearchIndex(), loadIndex() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (29): applyModxLinkedRecipeFreeFlags(), targetKey(), stringifyRecipesJson(), applyLocal, AUDIT_PATH, clusters, duplicateClusters, entries (+21 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (19): player, uid, columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (13): count, autoincrement, name, notNull, primaryKey, type, columns, compositePrimaryKeys (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (6): getPatikaCollection(), Patika, PatikaDoc, getPatikaCollection(), getPatika(), load()

### Community 37 - "Community 37"
Cohesion: 0.21
Nodes (17): linkedModxIdsForRecipe(), buildRecipeFromModxDoc(), buildRecipesFromModxDoc(), cardImgFromSrc(), deriveAuthor(), deriveCategoryDecision(), deriveDocCreatedAtIso(), deriveImage() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (16): apply, CATEGORIES_PATH, deleteOrphanRecipes(), deleteRecipeDocs(), force, main(), readJson(), recipeDocId() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.30
Nodes (12): shop_money, shop_money, shop_money, shop_money, amount, currency_code, shop_money, shop_money (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (31): ensureFirebaseApp(), getFirestoreDb(), getFirebaseStorage(), resolveBucketName(), uploadPrivateFile(), uploadPublicFile(), apply, approxDocSize() (+23 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (10): entries, generatedAt, summary, applyLocal, createDrafts, createLocal, magazineCandidates, redirects (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (14): blockText(), extractLinkedModxIds(), apply, byDoc, collectionDocIds, docById, options, pageImageByDoc (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (12): Individual Quiz Route (`/kviz/[...id]`), Layout Server (`+layout.server.ts`), Max Score Calculation (`getKviz()` in `src/lib/siteConf.ts`), Page Component (`+page.svelte`), Page Component (`+page.svelte`), Page Component (`+page.svelte`), Page Load (`+page.ts`), Quiz Form Route (`/kviz/form`) (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (14): Agent reminders, Client-Side Logic (`+page.svelte`), Commands, Data Flow Summary, Home Route (`/`), Key Libraries & Services, Magazine Content Sync (MODX → Firestore), Page Component (`+page.svelte`) (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (16): magazin_evoConfig(), magazin_evoDispatchFirestoreSyncWorkflow(), magazin_evoDispatchSavePayload(), magazin_evoGetAncestors(), magazin_evoGetAuthorChunks(), magazin_evoGetDocumentRow(), magazin_evoGetTVs(), magazin_evoGithubRepositoryDispatch() (+8 more)

### Community 47 - "Community 47"
Cohesion: 0.38
Nodes (8): isMagazineCandidate(), shouldSyncRow(), classifyPayload(), gunzip, parseModxSavePayload(), queryForcedRemovalRow(), queryForcedRow(), queryRemovedRows()

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (20): RecipePublished, Recipe, recipeSlug(), similarRecipesForTitle(), toLayoutRecipe(), getChildModxIds(), getSiblingReceptModxIds(), load() (+12 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (10): columns, name, columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (19): time, tipp, columns, compositePrimaryKeys, foreignKeys, name, uniqueConstraints, columns (+11 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (9): entries, generatedAt, sourceRecipes, summary, applyLocal, duplicateClusters, losersUnpublished, publishedRecipes (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (9): ads_distance, description, main_image, side_banners, site_email, sitename, status, tags (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (7): entries, isMagazinImportedRecipe(), recipes, RECIPES_PATH, recipeTags(), review, REVIEW_PATH

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (12): Active State Highlighting, Additional Navigation Items, Collapse Logic (Mobile), Mobile Menu Behavior, Navigation Component Logic (`Nav.svelte`), Navigation Item Types, Navigation System, Navigation Usage in Routes (+4 more)

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (7): accept_language, browser_height, browser_ip, browser_width, session_hash, user_agent, client_details

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (7): autoincrement, default, name, notNull, primaryKey, type, action

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (7): elementId, autoincrement, default, name, notNull, primaryKey, type

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (7): elementType, autoincrement, default, name, notNull, primaryKey, type

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (7): ip, autoincrement, default, name, notNull, primaryKey, type

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (7): lasthit, autoincrement, default, name, notNull, primaryKey, type

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (7): sid, autoincrement, default, name, notNull, primaryKey, type

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (7): username, autoincrement, default, name, notNull, primaryKey, type

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (7): internalKey, autoincrement, default, name, notNull, primaryKey, type

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (7): columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints, modx_active_users

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (7): columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints, modx_active_user_sessions

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (13): date, autoincrement, default, name, notNull, primaryKey, type, columns (+5 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (9): name, esbuild, overrides, aria-query, axobject-query, @netlify/edge-bundler, private, type (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (15): dialect, id, columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints (+7 more)

### Community 71 - "Community 71"
Cohesion: 0.17
Nodes (12): uid, indexes, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints, indexes (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.10
Nodes (21): autoincrement, default, name, notNull, primaryKey, type, category, rank (+13 more)

### Community 74 - "Community 74"
Cohesion: 0.38
Nodes (6): daisyui, firebase, svelte, npx, mcp-remote, @sveltejs/mcp

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (7): columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints, modx_diaeuro2014

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (10): snapshot, hasReceptsarokAccess, isReceptsarokRecipePath(), $app/navigation, $lib/components/Footer.svelte, $lib/components/Search.svelte, $app/stores, ../app.css (+2 more)

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (7): 1. Svelte MCP Server (`svelte`), 2. Firebase MCP Server (`firebase`), 3. Daisy UI MCP Server (`daisyui`), Available MCP Servers, How Agents Use These MCP Servers, MCP Servers & AI Assistant Integration, Project-Specific MCP Usage Guidelines

### Community 78 - "Community 78"
Cohesion: 0.21
Nodes (10): hasReceptsarokAccessFromSubscription(), isReceptsarokTrialActive(), categories, { data }, freeCount, freeCountsByCategory, totalRecipes, trial (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.40
Nodes (5): stripLinkedRecipeBlocks(), deriveInstructions(), deriveInstructionsHtml(), parseIngredientGroups(), preInstructionContent()

### Community 80 - "Community 80"
Cohesion: 0.27
Nodes (10): Collection slugs (precomputed at sync time), Dynamic Content Routes (`/[...path]`), Individual document routes, Layout Server (`+layout.server.ts`), Layout Server (`+layout.server.ts`), Page Component (`+page.svelte`), Page Component (`+page.svelte`), Page Component (`+page.svelte`) (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (8): Components, Cross-linking with Magazine, Data Source, Dedupe & sync process (recipes), Paywall / Freemium Model, Receptsarok Routes (`/receptsarok`), Recipe data pipeline (`recipes.json`) — create-only, Route Structure

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (5): deriveSubRecipes(), hasExplicitInstructionHeading(), hasMainStyleHozzavalokH2(), isOnlyStandaloneRecipeCollection(), lastImageInHtml()

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (4): css.customData, css.lint.unknownAtRules, files.associations, *.css

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (3): atDirectives, properties, version

### Community 86 - "Community 86"
Cohesion: 0.29
Nodes (7): columns, compositePrimaryKeys, foreignKeys, indexes, name, uniqueConstraints, modx_diaeuro2015_toto

### Community 87 - "Community 87"
Cohesion: 0.11
Nodes (18): jatek, ok, autoincrement, name, notNull, primaryKey, type, columns (+10 more)

### Community 90 - "Community 90"
Cohesion: 0.13
Nodes (16): id, autoincrement, columns, name, notNull, primaryKey, type, uniqueConstraints (+8 more)

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (6): user, autoincrement, name, notNull, primaryKey, type

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (5): Authentication Logic, Authentication Methods, Authentication State, Logout, Protected Features

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (4): Building, create-svelte, Creating a project, Developing

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (6): Dynamic matching, Magazine → Receptsarok redirects (storage & processing), Pitfalls & maintenance, Runtime request handling, Sync-time processing, Where redirects are stored

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (4): entries, generatedAt, sourceDocs, sourceRecipes

### Community 98 - "Community 98"
Cohesion: 0.40
Nodes (4): articleCount, indexUrl, recipeCount, version

### Community 99 - "Community 99"
Cohesion: 0.50
Nodes (3): entries, generatedAt, instructions

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (6): Layout Server (`+layout.server.ts`), Layout Server (`+layout.server.ts`), Page Component (`+page.svelte`), Page Component (`+page.svelte`), Search index (client-side), Search Route (`/keres`)

### Community 103 - "Community 103"
Cohesion: 0.50
Nodes (3): dialect, entries, version

### Community 104 - "Community 104"
Cohesion: 0.50
Nodes (3): entries, generatedAt, instructions

### Community 124 - "Community 124"
Cohesion: 0.12
Nodes (9): PageProps, miniSearch, PageProps, patikas, query, $lib/components/Nav2.svelte, $lib/navActive.js, ./$types (+1 more)

### Community 128 - "Community 128"
Cohesion: 0.40
Nodes (5): Layout Server (`+layout.server.ts`), Layout Server (`+layout.server.ts`), Page Component (`+page.svelte`), Page Component (`+page.svelte`), Pharmacy Route (`/patika`)

## Knowledge Gaps
- **899 isolated node(s):** `config`, `id`, `name`, `note`, `tags` (+894 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stringifyRecipesJson()` connect `Community 33` to `Community 11`, `Community 43`, `Community 14`, `Community 23`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `scripts` connect `Community 5` to `Community 69`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 17` to `Community 69`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `createModxTransform()` and `loadReceptsarokRedirectMaps()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `id`, `name` to the rest of the system?**
  _899 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05070422535211268 - nodes in this community are weakly interconnected._