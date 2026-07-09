<script module>
  import { browser } from "$app/environment";
  import Search from "$lib/components/Search.svelte";
  import Nav2 from "$lib/components/Nav2.svelte";
  const lightcolor = "#222";
  const darkcolor = "#ddd";
</script>

<script lang="ts">
  import type { PageProps } from "./$types";
  // export let data
  // console.log(data)

  if (browser) {
    let color = window?.matchMedia("(prefers-color-scheme: dark)").matches
      ? darkcolor
      : lightcolor;
    /* window?.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const colorScheme = event.matches ? "dark" : "light";
    color = colorScheme === 'dark' ? darkcolor : lightcolor;
  }); */

    var scriptURL =
      "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
    if (window?.ShopifyBuy) {
      if (window?.ShopifyBuy.UI) {
        ShopifyBuyInit();
      } else {
        loadScript();
      }
    } else {
      loadScript();
    }
    function loadScript() {
      var script = document.createElement("script");
      script.async = true;
      script.src = scriptURL;
      (
        document.getElementsByTagName("head")[0] ||
        document.getElementsByTagName("body")[0]
      ).appendChild(script);
      script.onload = ShopifyBuyInit;
    }
    function ShopifyBuyInit() {
      var client = ShopifyBuy.buildClient({
        domain: "tud-kiado.myshopify.com",
        storefrontAccessToken: "94cec9c870df862494030b6f488c43a1",
      });
      ShopifyBuy.UI.onReady(client).then(function (ui) {
        ui.createComponent("collection", {
          id: "395347394795",
          node: document.getElementById("collection-component-1719931041752"),
          moneyFormat: "%7B%7Bamount_no_decimals_with_comma_separator%7D%7D",
          options: {
            product: {
              styles: {
                product: {
                  "@media (min-width: 600px)": {
                    "max-width": "calc(25% - 20px)",
                    "margin-left": "20px",
                    "margin-bottom": "50px",
                    width: "calc(25% - 20px)",
                  },
                },
                title: {
                  "font-weight": "normal",
                  color: color,
                },
                button: {
                  "font-weight": "bold",
                  ":hover": {
                    "background-color": "#3b9ce6",
                  },
                  "background-color": "#41adff",
                  ":focus": {
                    "background-color": "#3b9ce6",
                  },
                },
                price: {
                  color: color,
                },
                compareAt: {
                  color: color,
                },
                unitPrice: {
                  color: color,
                },
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
                button: {
                  "font-weight": "bold",
                  ":hover": {
                    "background-color": "#3b9ce6",
                  },
                  "background-color": "#41adff",
                  ":focus": {
                    "background-color": "#3b9ce6",
                  },
                },
                title: {
                  "font-family": "Helvetica Neue, sans-serif",
                  "font-weight": "bold",
                  "font-size": "26px",
                  color: "#4c4c4c",
                },
                price: {
                  "font-family": "Helvetica Neue, sans-serif",
                  "font-weight": "normal",
                  "font-size": "18px",
                  color: "#4c4c4c",
                },
                compareAt: {
                  "font-family": "Helvetica Neue, sans-serif",
                  "font-weight": "normal",
                  "font-size": "15.299999999999999px",
                  color: "#4c4c4c",
                },
                unitPrice: {
                  "font-family": "Helvetica Neue, sans-serif",
                  "font-weight": "normal",
                  "font-size": "15.299999999999999px",
                  color: "#4c4c4c",
                },
              },
              text: {
                button: "db-ot a kosárba",
              },
            },
            option: {},
            cart: {
              styles: {
                button: {
                  "font-weight": "bold",
                  ":hover": {
                    "background-color": "#3b9ce6",
                  },
                  "background-color": "#41adff",
                  ":focus": {
                    "background-color": "#3b9ce6",
                  },
                },
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
                  "background-color": "#41adff",
                  ":hover": {
                    "background-color": "#3b9ce6",
                  },
                  ":focus": {
                    "background-color": "#3b9ce6",
                  },
                },
              },
            },
          },
        });
      });
    }
  }
  const { data }: PageProps = $props();
  const freeCount = $derived(data.freeCount);
</script>

<svelte:head>
  <title>{"Előfizetés • " + data.conf.sitename}</title>
  <meta
    name="description"
    content="Fizessen elő a Diabetes betegtájékoztató magazinra — a Hypertonia magazint és a különszámokat féláron adjuk mellé!"
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
    content="Fizessen elő a Diabetes betegtájékoztató magazinra — a Hypertonia magazint és a különszámokat féláron adjuk mellé!"
  />
  <meta name="og:url" content={data.conf.url || "https://diabetes.hu"} />
  <meta name="og:site_name" content="Diabetes" />
  <meta name="og:type" content="article" />
  <meta name="og:locale" content="hu_HU" />
</svelte:head>

<main class="">
  <!-- Value-proposition hero (homepage redesign 2026, F5) — same visual language as the home Hero -->
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
          A nyomtatott Diabetes magazin — házhoz szállítva
        </h1>
        <p class="max-w-prose opacity-80">
          Egy jó magazin nem sürget és nem riogat: leül Önnel, és érthetően
          elmondja, mi történik a szervezetében — és mit tehet érte. Ezt kínálja
          a Diabetes, 1989 óta.
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
            Nyomtatva, a postaládájába — képernyő nélkül, kényelmesen olvasható.
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
    <header class="mb-2 text-center">
      <h2 class="display text-2xl sm:text-3xl">Válassza ki lapszámait</h2>
      <p class="mt-2 opacity-80">
        A Diabetes mellé a Hypertonia magazint és a különszámokat féláron adjuk
        — legfeljebb 3 példányt.
      </p>
    </header>
    <div id="collection-component-1719931041752"></div>
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
          <p class="text-sm opacity-60">Egyszeri díj — minden recept, örökre</p>
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

  <!-- GYIK (F5.1) — answers grounded in the actual offer: quarterly print magazine,
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
          sorstársak történeteit és a diabétesz-közösség híreit — mindezt
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
          Tegye a kosárba a Diabetes-előfizetést, majd mellé a Hypertonia
          magazint vagy a különszámokat — ezeket féláron adjuk, legfeljebb 3
          példányig.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Nyomtatott vagy digitális?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          A Diabetes nyomtatott magazin. Emellett a diabetes.hu-n folyamatosan,
          ingyenesen olvashatja szakértőink cikkeit, a Receptsarok Prémium pedig
          a teljes, 1800 recept fölötti gyűjteményt nyitja meg.
        </div>
      </details>
      <details class="faq collapse-arrow rounded-sm bg-base-200">
        <summary class="cursor-pointer px-4 py-3 font-medium"
          >Kérdésem van a megrendelésemmel kapcsolatban — kihez fordulhatok?</summary
        >
        <div class="px-4 pb-4 text-sm opacity-80">
          A kosár „Üzenet a Kiadónak" mezőjében közvetlenül írhat a Tudomány
          Kiadónak — például ha ajándékba rendel, vagy a kézbesítéssel
          kapcsolatban van kérése.
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
