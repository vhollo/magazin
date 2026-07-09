<script>
  // Home subscribe CTA module (homepage redesign 2026, F3.4) — macro-conversion
  // toward `/elofizetes`. Placed at the bottom of the home page, after the
  // latest-articles grid.
  import { trackEvent } from "$lib/analytics";
</script>

<section class="band relative overflow-hidden bg-primary text-primary-content">
  <div
    class="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-16"
  >
    <div class="flex flex-col gap-2">
      <p
        class="kicker text-xs font-semibold tracking-[0.18em] uppercase opacity-70"
      >
        Előfizetés
      </p>
      <h2 class="display text-2xl sm:text-3xl">
        A nyomtatott Diabetes magazin — házhoz szállítva
      </h2>
      <p class="max-w-prose opacity-90">
        Minden lapszámunk tele van orvosi és dietetikai tanácsokkal, receptekkel
        és sorstársak történeteivel — évente hatszor a postaládájában.
      </p>
    </div>
    <a
      href="/elofizetes"
      class="btn btn-lg btn-secondary shrink-0 rounded-sm"
      on:click={() => trackEvent("subscribe_cta_click", { source: "home" })}
    >
      Előfizetek
    </a>
  </div>
</section>

<style>
  .display {
    font-family:
      Charter, "Iowan Old Style", "Palatino Linotype", Georgia, Cambria, serif;
    font-weight: 600;
  }
</style>
