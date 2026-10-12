<script module>
  import { browser } from "$app/environment";
</script>

<script>
  // @ts-nocheck
  import { afterNavigate } from "$app/navigation";
  import { tick } from "svelte";
  import Cards from "$lib/components/Cards.svelte";
  import Hero from "$lib/components/Hero.svelte";
  import ExpertSection from "$lib/components/ExpertSection.svelte";
  import NewsletterCTA from "$lib/components/NewsletterCTA.svelte";
  import TopicGrid from "$lib/components/TopicGrid.svelte";
  import SubscribeCTA from "$lib/components/SubscribeCTA.svelte";
  import BannerTop from "$lib/components/BannerTop.svelte";
  export let data;

  $: conf = data.conf;
  $: doc = data.doc;
  // The Hero shows the newest expert pick that has an image (an image-less card
  // would leave the hero's right column empty and skip the LCP preload); only
  // when no pick has an image does it fall back to the newest one. ExpertSection
  // gets the remaining picks, still newest first.
  $: heroIndex = Math.max(
    0,
    (data.expertCards ?? []).findIndex((c) => c?.img?.src),
  );
  $: heroCard = data.expertCards?.[heroIndex];
  $: restExpertCards = (data.expertCards ?? []).filter((_, i) => i !== heroIndex);
  // Hero + ExpertSection together show the top 24 expert picks, so drop them
  // from the "latest" grid to avoid repeating cards.
  $: shownExpertIds = new Set(
    (data.expertCards ?? []).map((c) => String(c.id)),
  );
  $: docs = (data.docs ?? []).filter((d) => !shownExpertIds.has(String(d.id)));

  // ── Scroll restoration ─────────────────────────────────────────────────────
  // app.html restores scroll before hydration; here we finish once the masonry
  // packs and any deeper page (#2, #5…) expands – retrying until we reach the
  // saved Y so it can "scroll further when ready". behavior:'instant' avoids the
  // global scroll-behavior:smooth animating each retry. (browser comes from the
  // module script above.) Mirrors [...path]/+page.svelte.
  let pendingScrollY = null;

  async function restoreScrollWhenReady() {
    if (pendingScrollY == null || !browser) return;
    const y = pendingScrollY;
    await tick();
    await tick();
    let attempts = 0;
    const tryScroll = () => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      attempts++;
      if (window.scrollY >= y - 2 || attempts >= 12) {
        pendingScrollY = null;
        return;
      }
      setTimeout(tryScroll, 50);
    };
    requestAnimationFrame(() => requestAnimationFrame(tryScroll));
  }

  export const snapshot = {
    capture: () => ({ scrollY: browser ? window.scrollY : 0 }),
    restore: (value) => {
      if (browser && typeof value?.scrollY === "number")
        pendingScrollY = value.scrollY;
    },
  };

  afterNavigate((navigation) => {
    if (!browser) return;
    if (navigation.type !== "enter" && navigation.type !== "popstate") return;
    if (pendingScrollY == null) {
      try {
        const idx = history.state?.["sveltekit:history"];
        const map = JSON.parse(sessionStorage["sveltekit:scroll"] || "{}");
        const pos = idx != null ? map[idx] : null;
        if (pos && typeof pos.y === "number") pendingScrollY = pos.y;
      } catch (e) {
        /* ignore */
      }
    }
    if (pendingScrollY != null) restoreScrollWhenReady();
  });
</script>

<svelte:head>
  <title>{conf.sitename}</title>
  <meta
    name="description"
    content={doc.ellipsis ||
      conf.description ||
      "www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft."}
  />
  <meta
    name="keywords"
    content={doc.tv?.tags?.join(", ") ||
      conf.tags.join(", ") ||
      "diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft"}
  />
  <meta
    name="author"
    content={doc.tv?.szerzo?.map((sze) => sze?.name).filter(Boolean).join(", ") ||
      "diabetes.hu"}
  />
  <meta name="og:image" content={doc.tv?.ogi || conf.ogi || "/icon.svg"} />
  <meta
    name="og:title"
    content={doc.longtitle || doc.title || conf.sitename || "Diabetes"}
  />
  <meta
    name="og:description"
    content={doc.description ||
      conf.description ||
      "www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft."}
  />
  <meta name="og:url" content={doc.url || "https://diabetes.hu"} />
  <meta name="og:site_name" content="Diabetes" />
  <meta name="og:type" content="article" />
  <meta name="og:locale" content="hu_HU" />
  {#if doc.img}
    <link rel="preload" href={doc.img.src} as="image" />
  {/if}
  {#if heroCard?.img?.src}
    <link
      rel="preload"
      href={heroCard.img.src}
      as="image"
      fetchpriority="high"
    />
  {/if}
</svelte:head>

<Hero
  expert={heroCard}
  articles={data.articleCount}
  recipes={data.recipeCount}
/>

<!-- The hero is followed directly by content: the search sits inside the Hero,
     the top banner after the first row of ExpertSection, and the Nav2 topic menu
     is left out here because the "Kezdd itt" chips and TopicGrid cover it. -->
<ExpertSection cards={restExpertCards} banners={conf.top_banners} />
{#if conf.top_banners.length && !restExpertCards.length}
  <!-- No expert rail (e.g. before the first sync): keep the banner on the page. -->
  <BannerTop banners={conf.top_banners} />
{/if}
<NewsletterCTA />
<TopicGrid />

{#if docs.length}
  <Cards
    cards={docs}
    banners={conf.side_banners}
    ads_distance={conf.ads_distance}
  />
{/if}

<SubscribeCTA />
