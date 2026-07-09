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
  import Search from "$lib/components/Search.svelte";
  import Nav2 from "$lib/components/Nav2.svelte";
  import BannerTop from "$lib/components/BannerTop.svelte";
  export let data;

  $: conf = data.conf;
  $: doc = data.doc;
  // The Hero (expertCards[0]) and ExpertSection (expertCards[1..]) already show the
  // top 24 expert picks, so drop them from the "latest" grid to avoid repeating cards.
  $: shownExpertIds = new Set(
    (data.expertCards ?? []).map((c) => String(c.id)),
  );
  $: docs = (data.docs ?? []).filter((d) => !shownExpertIds.has(String(d.id)));

  // ── Scroll restoration ─────────────────────────────────────────────────────
  // app.html restores scroll before hydration; here we finish once the masonry
  // packs and any deeper page (#2, #5…) expands — retrying until we reach the
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
  <meta name="author" content={doc.tv?.szerzo?.join(", ") || "diabetes.hu"} />
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
  {#if data.expertCards?.[0]?.img?.src}
    <link
      rel="preload"
      href={data.expertCards[0].img.src}
      as="image"
      fetchpriority="high"
    />
  {/if}
</svelte:head>

<Hero expert={data.expertCards?.[0]} />

{#if conf.top_banners.length}
  <BannerTop banners={conf.top_banners} />
{/if}
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={data.path} />

<ExpertSection cards={(data.expertCards ?? []).slice(1)} />
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
