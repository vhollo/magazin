<script>
  // Home hero (homepage redesign 2026, F3.1) – replaces the legacy hardcoded
  // Carousel on `/`. Left: welcome + value proposition + primary/secondary CTA +
  // audience entry points ("Kezdd itt"); right: the newest expert pick from
  // `collections/home.expertCards`. A restrained social-proof strip (heritage +
  // real article/recipe counts + publisher authority) closes the section.
  import { trackEvent } from "$lib/analytics";

  /** @type {import('$lib/modx/collections').ThinCard | undefined} */
  export let expert = undefined;
  /** Total article count (from `+layout.server.ts`), used as social proof. */
  export let articles = 0;
  /** Total recipe count (from `+layout.server.ts`), used as social proof. */
  export let recipes = 0;

  // Audience entry points distilled from the old Carousel's five cards.
  const entries = [
    { label: "Most diagnosztizáltak", href: "/s-o-s" },
    { label: "Táplálkozás és receptek", href: "/taplalkozas" },
    { label: "Junior – gyerekek, fiatalok", href: "/junior" },
    { label: "Várandósság, GDM", href: "/gyermekvallalas" },
    {
      label: "Közösség, egyesületek",
      href: "/egyesulet",
    },
  ];

  // ── Social proof ──────────────────────────────────────────────────────────
  // The magazine has run since 1989 (see Footer). Compute the years live so the
  // figure never goes stale. Article/recipe counts come from real data; round
  // them DOWN to a clean figure + "+" so the claim stays true even between syncs.
  const FOUNDED = 1989;
  const yearsRunning = new Date().getFullYear() - FOUNDED;

  /**
   * Round down to a clean figure and format with a "+" (e.g. 1234 → "1 200+").
   * Returns null when the count is missing/too small to be worth boasting.
   * @param {number} n
   * @param {number} step
   */
  const proof = (n, step) => {
    if (!Number.isFinite(n) || n < step) return null;
    const floored = Math.floor(n / step) * step;
    return `${floored.toLocaleString("hu-HU")}+`;
  };

  $: articleProof = proof(articles, 100);
  $: recipeProof = proof(recipes, 100);

  $: authors = (expert?.tv?.szerzo ?? [])
    .map((s) => s?.name)
    .filter(Boolean)
    .join(", ");

  /**
   * ThinCard types `img` as unknown; the sync always writes {src, pos, ext, caption}.
   * @param {import('$lib/modx/collections').ThinCard | undefined} card
   * @returns {{ src?: string, pos?: string, ext?: string } | null | undefined}
   */
  const cardImg = (card) => /** @type {any} */ (card?.img);
  $: img = cardImg(expert);
</script>

<section class="band relative overflow-hidden bg-base-200">
  <!-- Decorative glucose-curve motif -->
  <svg
    class="curve pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-secondary"
    viewBox="0 0 1200 96"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d="M0,72 C90,70 140,44 210,40 C280,36 320,64 400,66 C480,68 530,30 610,26 C690,22 740,58 820,62 C900,66 950,38 1030,36 C1110,34 1160,56 1200,58"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      opacity="0.16"
    />
    <path
      d="M0,80 L1200,80"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-dasharray="2 6"
      opacity="0.12"
    />
  </svg>

  <div
    class="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12"
  >
    <header class="welcome flex flex-col gap-4">
      <p
        class="kicker text-xs font-semibold tracking-[0.18em] uppercase opacity-60"
      >
        A cukorbetegek magazinja · 1989 óta
      </p>
      <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">
        Megbízható válaszok a cukorbetegséggel élt mindennapokhoz
      </h1>
      <p class="lead max-w-4xl opacity-80">
        Cikkeinket orvosok és szakemberek írják – a diagnózis első napjától a
        magabiztos önellenőrzésig.
      </p>

      <!-- Primary + secondary CTA. Primary (btn-secondary = saturated blue,
           white text) is the highest-contrast control on the light band and
           points at the macro-conversion; the outlined secondary reads clearly
           as a button but stays visually subordinate. -->
      <div class="mt-1 flex flex-wrap items-center gap-3">
        <a
          href="/elofizetes"
          class="btn btn-secondary btn-lg rounded-sm"
          on:click={() => trackEvent("hero_subscribe_click", { source: "hero" })}
        >
          Előfizetek a magazinra
        </a>
        <a
          href="/hirlevel"
          class="btn btn-outline btn-lg rounded-sm"
          on:click={() => trackEvent("hero_newsletter_click", { source: "hero" })}
        >
          Ingyenes hírlevél
        </a>
      </div>

      <nav class="mt-2" aria-label="Belépési pontok">
        <span
          class="mb-2 block text-xs font-semibold tracking-[0.18em] uppercase opacity-60"
        >
          Kezdd itt:
        </span>
        <ul class="flex flex-wrap gap-2">
          {#each entries as entry (entry.href)}
            <li>
              <a
                class="chip"
                href={entry.href}
                on:click={() =>
                  trackEvent("hero_entry_click", { label: entry.label })}
              >
                {entry.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </header>

    {#if expert}
      <a
        href={`/${expert.path}`}
        class="feat card overflow-hidden rounded-sm bg-base-100 shadow-lg transition-shadow duration-300 hover:shadow-xl"
        on:click={() =>
          trackEvent("hero_expert_click", { path: String(expert.path ?? "") })}
      >
        {#if img}
          <figure class="relative m-0">
            <img
              src={img.src}
              alt=""
              width="928"
              height="548"
              fetchpriority="high"
              style={`object-fit: ${img.ext == "png" ? "contain" : "cover"}; object-position: ${img.pos || "50% 40%"}`}
            />
            <span
              class="badge badge-secondary absolute top-3 left-3 rounded-sm"
            >
              Szakértőnk írása
            </span>
          </figure>
        {:else}
          <span class="badge badge-secondary m-4 mb-0 self-start rounded-sm">
            Szakértőnk írása
          </span>
        {/if}
        <div class="card-body gap-2 p-4">
          {#if expert.description}
            <p class="text-sm italic opacity-70">{@html expert.description}</p>
          {/if}
          <h2 class="display card-title block text-xl leading-snug sm:text-2xl">
            {@html expert.longtitle || expert.title}
          </h2>
          {#if expert.ellipsis}
            <div class="ellipsis twoliner text-sm opacity-80">
              {@html expert.ellipsis}
            </div>
          {/if}
          {#if authors}
            <p class="mt-1 text-sm font-medium text-secondary">{authors}</p>
          {/if}
        </div>
      </a>
    {/if}
  </div>

  <!-- Social proof: restrained credibility strip before the fold. Real,
       verifiable signals only – heritage since 1989, live article/recipe
       counts and the publisher's authority – no invented ratings. -->
  <div class="relative mx-auto max-w-6xl px-4 pb-10 sm:pb-12">
    <dl
      class="proof flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-base-content/10 pt-5 text-sm"
    >
      <div class="stat-item">
        <dt class="display text-2xl leading-none text-secondary">1989 óta</dt>
        <dd class="opacity-70">{yearsRunning} éve hiteles forrás</dd>
      </div>
      {#if articleProof}
        <div class="stat-item">
          <dt class="display text-2xl leading-none text-secondary">
            {articleProof}
          </dt>
          <dd class="opacity-70">szakcikk orvosoktól</dd>
        </div>
      {/if}
      {#if recipeProof}
        <div class="stat-item">
          <dt class="display text-2xl leading-none text-secondary">
            {recipeProof}
          </dt>
          <dd class="opacity-70">diabetesbarát recept</dd>
        </div>
      {/if}
      <p class="publisher max-w-xs opacity-70 sm:ml-auto sm:text-right">
        Az <a class="underline-offset-2 hover:underline" href="/alapitvany"
          >Alapítvány a Cukorbetegekért</a
        > betegtájékoztató lapja
      </p>
    </dl>
  </div>
</section>

<style>
  .chip {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border: 1px solid
      color-mix(in oklch, var(--color-base-content) 25%, transparent);
    border-radius: 9999px;
    font-size: 0.85rem;
    line-height: 1.4;
    text-decoration: none;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background-color 0.2s ease;
  }
  .chip:hover,
  .chip:focus-visible {
    border-color: var(--color-secondary);
    color: var(--color-secondary);
    background-color: color-mix(
      in oklch,
      var(--color-secondary) 8%,
      transparent
    );
  }
  .feat figure,
  .feat img {
    aspect-ratio: var(--imgratio);
    width: 100%;
  }
  /* Social-proof strip: stat number over a small label. The connecting dividers
     only appear once the stats sit on a single row (md+), so a wrapped mobile
     layout never shows a divider dangling at the start of a line. */
  .proof .publisher {
    flex-basis: 100%;
  }
  @media (min-width: 48rem) {
    .proof .publisher {
      flex-basis: auto;
    }
    .proof .stat-item + .stat-item {
      position: relative;
      padding-left: 2rem;
    }
    .proof .stat-item + .stat-item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      height: 2.25rem;
      width: 1px;
      transform: translateY(-50%);
      background-color: color-mix(
        in oklch,
        var(--color-base-content) 12%,
        transparent
      );
    }
  }
  /* Orchestrated load: welcome column, then the featured card. */
  @media (prefers-reduced-motion: no-preference) {
    .welcome,
    .feat,
    .proof {
      animation: rise 0.5s ease-out backwards;
    }
    .feat {
      animation-delay: 0.15s;
    }
    .proof {
      animation-delay: 0.3s;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  }
</style>
