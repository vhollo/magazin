<script>
  // Home newsletter CTA band (homepage redesign 2026, F3.3) — micro-conversion
  // toward `/hirlevel`. Placed between ExpertSection and TopicGrid.
  import { trackEvent } from "$lib/analytics";
</script>

<section
  class="band relative overflow-hidden bg-secondary text-secondary-content"
>
  <svg
    class="curve pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
    viewBox="0 0 1200 64"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d="M0,48 C90,46 140,28 210,26 C280,24 320,44 400,46 C480,48 530,20 610,18 C690,16 740,40 820,42 C900,44 950,26 1030,24 C1110,22 1160,38 1200,40"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      opacity="0.18"
    />
  </svg>
  <div
    class="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12"
  >
    <div class="flex flex-col gap-2">
      <h2 class="display text-2xl sm:text-3xl">
        Ne maradjon le a fontos cikkekről
      </h2>
      <p class="max-w-prose opacity-90">
        Havonta egy összefoglaló e-mail a legfontosabb szakértői írásokról és
        hírekről — leiratkozás bármikor egy kattintással.
      </p>
    </div>
    <a
      href="/hirlevel"
      class="btn btn-lg shrink-0 rounded-sm bg-base-100 text-base-content border-none hover:bg-base-200"
      on:click={() => trackEvent("newsletter_cta_click", { source: "home" })}
    >
      Feliratkozom
    </a>
  </div>
</section>
