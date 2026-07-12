<script module>
  import Search from "$lib/components/Search.svelte";
  import Nav2 from "$lib/components/Nav2.svelte";
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const freeCount = $derived(data.freeCount);

  // Drives the skeleton / error UI around the Shopify embed.
  let embedState = $state<"loading" | "ready" | "error">("loading");

  const scriptURL =
    "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
  const nodeId = "collection-component-1719931041752";

  // The Buy Button renders in an <iframe>, so the site's CSS variables aren't
  // available inside it. Instead we hardcode the DaisyUI light-theme colours and
  // override them in a prefers-color-scheme media block — that query evaluates
  // live *inside* the iframe, so the embed re-themes with the OS/browser dark
  // mode automatically (this replaces the old load-time matchMedia colour whose
  // change-listener was commented out, so dark-mode toggling never recoloured).
  // Both schemes are scoped in media queries (never a bare base value): the Buy
  // Button compiler emits the `dark` block *before* the base rule, so an
  // unscoped light value would win over dark at equal specificity. `light` also
  // matches the no-preference default, so exactly one block applies and source
  // order stops mattering.
  const LIGHTMQ = "@media (prefers-color-scheme: light)";
  const DARK = "@media (prefers-color-scheme: dark)";
  const LIGHT_TEXT = "oklch(21% 0.006 285.885)"; // --color-base-content (light)
  const DARK_TEXT = "oklch(97.807% 0.029 256.847)"; // --color-base-content (dark)

  const textColor = {
    [LIGHTMQ]: { color: LIGHT_TEXT },
    [DARK]: { color: DARK_TEXT },
  };

  // Matches the site's `btn-primary` (DaisyUI --color-primary), so the "Kosárba"
  // / "Megrendelés" buttons read as the same brand blue as the rest of the page.
  // Hover/focus must be a single top-level rule: the SDK compiler drops the
  // scheme `@media` both when it wraps a pseudo *and* when nested inside one, so
  // a scheme-specific hover isn't expressible here. A mid brand-blue reads as a
  // clear "darker" hover against both the light (L≈0.80) and dark (L≈0.61) base
  // — and, importantly, overrides the store's default green hover (#5f9d3e).
  const BTN_HOVER = "oklch(55% 0.13 246.91)";
  const buttonStyle = {
    "font-weight": "bold",
    "border-radius": "0.2rem", // --radius-field
    [LIGHTMQ]: {
      color: LIGHT_TEXT,
      "background-color": "oklch(80.25% 0.0589 246.91)",
    },
    [DARK]: {
      color: DARK_TEXT,
      "background-color": "oklch(60.51% 0.1178 246.91)",
    },
    ":hover": { "background-color": BTN_HOVER },
    ":focus": { "background-color": BTN_HOVER },
  };

  function initShopify(ShopifyBuy: any) {
    const node = document.getElementById(nodeId);
    if (!node) {
      embedState = "error";
      return;
    }

    // The SDK's return value isn't a reliable "done" signal across versions, so
    // flip out of the skeleton when it inserts its iframe (with a safety timeout).
    const observer = new MutationObserver(() => {
      if (node.querySelector("iframe")) {
        embedState = "ready";
        observer.disconnect();
        clearTimeout(timer);
      }
    });
    observer.observe(node, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      embedState = node.querySelector("iframe") ? "ready" : "error";
    }, 8000);

    const client = ShopifyBuy.buildClient({
      domain: "tud-kiado.myshopify.com",
      storefrontAccessToken: "94cec9c870df862494030b6f488c43a1",
    });
    ShopifyBuy.UI.onReady(client)
      .then((ui: any) => {
        ui.createComponent("collection", {
          id: "395347394795",
          node,
          moneyFormat: "%7B%7Bamount_no_decimals_with_comma_separator%7D%7D%20Ft",
          options: {
            product: {
              styles: {
                product: {
                  // Card look, aligned with the site's cards (bg-base-100 +
                  // subtle border/shadow, --radius-box corners).
                  "border-radius": "0.4rem",
                  padding: "1rem 1rem 1.25rem",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  ":hover": {
                    transform: "translateY(-2px)",
                    "box-shadow": "0 8px 20px rgba(0, 0, 0, 0.1)",
                  },
                  "@media (min-width: 600px)": {
                    "max-width": "calc(25% - 20px)",
                    "margin-left": "20px",
                    "margin-bottom": "40px",
                    width: "calc(25% - 20px)",
                  },
                  [LIGHTMQ]: {
                    "background-color": "oklch(100% 0 0)",
                    border: "1px solid oklch(21% 0.006 285.885 / 0.12)",
                    "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.06)",
                  },
                  [DARK]: {
                    "background-color": "oklch(25.33% 0.016 252.42)",
                    border: "1px solid oklch(97.807% 0.029 256.847 / 0.14)",
                    "box-shadow": "0 1px 2px rgba(0, 0, 0, 0.3)",
                  },
                },
                title: {
                  "font-weight": "normal",
                  ...textColor,
                },
                button: buttonStyle,
                price: { ...textColor },
                compareAt: { ...textColor },
                unitPrice: { ...textColor },
              },
              text: {
                button: "Kosárba",
              },
            },
            productSet: {
              styles: {
                products: {
                  "@media (min-width: 600px)": {
                    "margin-left": "-20px",
                  },
                },
              },
            },
            modalProduct: {
              contents: {
                img: false,
                imgWithCarousel: true,
                button: false,
                buttonWithQuantity: true,
              },
              styles: {
                product: {
                  "@media (min-width: 600px)": {
                    "max-width": "100%",
                    "margin-left": "0px",
                    "margin-bottom": "0px",
                  },
                },
                button: buttonStyle,
                title: {
                  "font-weight": "bold",
                  "font-size": "26px",
                  ...textColor,
                },
                price: {
                  "font-weight": "normal",
                  "font-size": "18px",
                  ...textColor,
                },
                compareAt: {
                  "font-weight": "normal",
                  "font-size": "15px",
                  ...textColor,
                },
                unitPrice: {
                  "font-weight": "normal",
                  "font-size": "15px",
                  ...textColor,
                },
              },
              text: {
                button: "db-ot a kosárba",
              },
            },
            option: {},
            cart: {
              styles: {
                button: buttonStyle,
              },
              text: {
                title: "Kosár",
                total: "Részösszeg",
                empty: "A kosár üres.",
                notice:
                  "Az adót és a szállítási költséget a megrendeléskor számítjuk ki.",
                button: "Megrendelés",
                noteDescription: "Üzenet a Kiadónak",
              },
              contents: {
                note: true,
              },
            },
            toggle: {
              styles: {
                toggle: {
                  "font-weight": "bold",
                  [LIGHTMQ]: {
                    color: LIGHT_TEXT,
                    "background-color": "oklch(80.25% 0.0589 246.91)",
                  },
                  [DARK]: {
                    color: DARK_TEXT,
                    "background-color": "oklch(60.51% 0.1178 246.91)",
                  },
                  ":hover": { "background-color": BTN_HOVER },
                  ":focus": { "background-color": BTN_HOVER },
                },
              },
            },
          },
        });
      })
      .catch(() => {
        observer.disconnect();
        clearTimeout(timer);
        embedState = "error";
      });
  }

  onMount(() => {
    const w = window as any;
    if (w.ShopifyBuy?.UI) {
      initShopify(w.ShopifyBuy);
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = scriptURL;
    script.onload = () => initShopify(w.ShopifyBuy);
    script.onerror = () => (embedState = "error");
    (document.head || document.body).appendChild(script);
  });
</script>

<svelte:head>
  <title>{"Előfizetés • " + data.conf.sitename}</title>
  <meta
    name="description"
    content="Fizess elő a Diabetes betegtájékoztató magazinra – a Hypertonia magazint és a különszámokat féláron adjuk mellé!"
  />
  <meta
    name="keywords"
    content={data.conf.tags.join(", ") ||
      "diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft"}
  />
  <meta name="author" content={data.conf.sitename} />
  <meta name="og:image" content={data.conf.ogi || "/icon.svg"} />
  <meta name="og:title" content={"Előfizetés • " + data.conf.sitename} />
  <meta
    name="og:description"
    content="Fizess elő a Diabetes betegtájékoztató magazinra – a Hypertonia magazint és a különszámokat féláron adjuk mellé!"
  />
  <meta name="og:url" content={data.conf.url || "https://diabetes.hu"} />
  <meta name="og:site_name" content="Diabetes" />
  <meta name="og:type" content="article" />
  <meta name="og:locale" content="hu_HU" />
</svelte:head>

<main class="">
  <!-- Value-proposition hero (homepage redesign 2026, F5) – same visual language as the home Hero -->
  <section class="band relative overflow-hidden bg-base-200">
    <svg
      class="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-secondary"
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,60 C90,58 140,36 210,33 C280,30 320,53 400,55 C480,57 530,25 610,22 C690,19 740,49 820,52 C900,55 950,31 1030,30 C1110,29 1160,47 1200,48"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        opacity="0.16"
      />
    </svg>
    <div class="mx-auto max-w-4xl px-4 py-12 sm:py-16 flex flex-col gap-6">
      <header class="flex flex-col gap-3">
        <p class="text-xs font-semibold tracking-[0.18em] uppercase opacity-60">
          Előfizetés
        </p>
        <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">
          A nyomtatott Diabetes magazin – házhoz szállítva
        </h1>
        <p class="max-w-prose opacity-80">
          Egy jó magazin nem sürget és nem riogat: leül veled, és érthetően
          elmondja, mi történik a szervezetedben – és mit tehetsz érte. Ezt
          kínálja a Diabetes, 1989 óta.
        </p>
      </header>
      <ul class="grid gap-4 sm:grid-cols-3">
        <li class="card rounded-sm bg-base-100 p-4 shadow-md">
          <h2 class="display text-base mb-1">Szakértő szerzők</h2>
          <p class="text-sm opacity-80">
            Cikkeink mögött gyakorló orvosok, diabetológusok és dietetikusok
            állnak.
          </p>
        </li>
        <li class="card rounded-sm bg-base-100 p-4 shadow-md">
          <h2 class="display text-base mb-1">Évente hat lapszám</h2>
          <p class="text-sm opacity-80">
            Nyomtatva, a postaládádba – képernyő nélkül, kényelmesen olvasható.
          </p>
        </li>
        <li class="card rounded-sm bg-base-100 p-4 shadow-md">
          <h2 class="display text-base mb-1">Kedvezmények</h2>
          <p class="text-sm opacity-80">
            A Diabetes mellé a Hypertonia magazint és a különszámokat féláron
            adjuk.
          </p>
        </li>
      </ul>
      <a
        href="#megrendeles"
        class="btn btn-primary btn-lg self-start rounded-sm">Előfizetek</a
      >
    </div>
  </section>

  <section id="megrendeles" class="mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <header class="mb-6 text-center">
      <h2 class="display text-2xl sm:text-3xl">Válaszd ki lapszámaidat</h2>
      <p class="mt-2 opacity-80">
        A Diabetes mellé a Hypertonia magazint és a különszámokat féláron adjuk
        – legfeljebb 3 példányt.
      </p>
    </header>

    {#if embedState === "error"}
      <div
        role="alert"
        class="alert alert-warning mx-auto max-w-xl flex-col items-start gap-2 rounded-sm sm:flex-row sm:items-center"
      >
        <span>
          A terméklista most nem tölthető be – ez általában átmeneti. Töltsd
          újra az oldalt, és próbáld ismét.
        </span>
        <button
          type="button"
          class="btn btn-sm rounded-sm"
          onclick={() => location.reload()}>Újratöltés</button
        >
      </div>
    {:else}
      <div class="relative">
        {#if embedState === "loading"}
          <div
            class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            aria-hidden="true"
          >
            {#each Array.from({ length: 4 }) as _, i (i)}
              <div
                class="flex flex-col gap-3 rounded-sm bg-base-100 p-4 shadow-md"
              >
                <div class="skeleton aspect-square w-full rounded-sm"></div>
                <div class="skeleton h-4 w-3/4"></div>
                <div class="skeleton h-4 w-1/3"></div>
                <div class="skeleton h-9 w-full rounded-sm"></div>
              </div>
            {/each}
          </div>
          <p class="sr-only" aria-live="polite">Terméklista betöltése…</p>
        {/if}
        <div id={nodeId} class:hidden={embedState !== "ready"}></div>
      </div>
    {/if}
  </section>

  <article id="receptsarok-sub" class="prose mt-16 mb-8 mx-auto w-full">
    <h2 class="text-center">Receptsarok Prémium</h2>
    <p class="text-center">
      Több mint 1800 diabétesz-barát recept, tápanyagtáblázattal,
      összetevő-kereséssel és tápanyag-szűréssel.
    </p>
    <div
      class="flex flex-col sm:flex-row gap-4 justify-center items-center not-prose mt-4"
    >
      <div class="card bg-base-300 w-64">
        <div class="card-body items-center text-center">
          <h3 class="card-title">Örök hozzáférés</h3>
          <p class="text-3xl font-bold">4 990 Ft</p>
          <p class="text-sm opacity-60">Egyszeri díj – minden recept, örökre</p>
          <a href="/receptsarok" class="btn btn-primary btn-sm mt-2">Megnézem</a
          >
        </div>
      </div>
      <div class="card bg-base-300 w-64">
        <div class="card-body items-center text-center">
          <h3 class="card-title">Éves előfizetés</h3>
          <p class="text-3xl font-bold">
            1 990 Ft<small class="text-sm font-normal">/év</small>
          </p>
          <p class="text-sm opacity-60">Minden recept, évente megújuló</p>
          <a href="/receptsarok" class="btn btn-outline btn-sm mt-2">Megnézem</a
          >
        </div>
      </div>
    </div>
    <p class="text-center text-sm mt-4 opacity-60">
      A Diabetes és Hypertonia lapokban megjelent <span
        class="text-success font-medium">{freeCount}</span
      > recept ingyenesen elérhető, regisztráció nélkül.
    </p>
  </article>

  <!-- GYIK (F5.1) – answers grounded in the actual offer: quarterly print magazine,
     Hypertonia + különszámok at half price (max 3), shipping computed at checkout,
     cart note to the publisher. -->
  <section class="mx-auto max-w-2xl px-4 py-10 sm:py-14">
    <h2 class="display mb-6 text-center text-2xl sm:text-3xl">
      Gyakori kérdések
    </h2>
    <div class="flex flex-col gap-2">
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Mit tartalmaz egy lapszám?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          Orvosi és dietetikai tanácsokat, recepteket tápanyagértékekkel,
          sorstársak történeteit és a diabétesz-közösség híreit – mindezt
          gyakorló szakemberek tollából, közérthetően.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Milyen gyakran és hogyan kapom meg?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          A Diabetes évente hat alkalommal jelenik meg, és postai úton, házhoz
          szállítva érkezik. A szállítási költséget az ár tartalmazza.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Hogyan vehetem igénybe a féláras kedvezményt?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          Tedd a kosárba a Diabetes-előfizetést, majd mellé a Hypertonia
          magazint vagy a különszámokat – ezeket féláron adjuk, legfeljebb 3
          példányig.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Nyomtatott vagy digitális?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          A Diabetes nyomtatott magazin. Emellett a diabetes.hu-n folyamatosan,
          ingyenesen olvashatod szakértőink cikkeit, a Receptsarok Prémium pedig
          a teljes, 1800 recept fölötti gyűjteményt nyitja meg.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Kérdésem van a megrendelésemmel kapcsolatban – kihez fordulhatok?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          A kosár „Üzenet a Kiadónak" mezőjében közvetlenül írhatsz a Tudomány
          Kiadónak – például ha ajándékba rendelsz, vagy a kézbesítéssel
          kapcsolatban van kérdésed.
        </div>
      </details>
    </div>
  </section>

  <Search articles={data.articleCount} recipes={data.recipeCount} />
  <Nav2 actual="elofizetes" /><!--  actual={data.doc.path} -->
</main>

<style>
  .faq summary {
    /* app.css gives summary h2 special treatment; keep ours a plain row */
    list-style: none;
  }
  .faq summary::-webkit-details-marker {
    display: none;
  }
  .faq summary::after {
    content: "+";
    float: right;
    opacity: 0.5;
  }
  .faq[open] summary::after {
    content: "–";
  }
</style>
