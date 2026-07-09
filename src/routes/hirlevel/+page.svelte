<script>
  // Newsletter subscribe / unsubscribe page (homepage redesign 2026, F4).
  // Progressive enhancement: works without JS (native form POST → action), and
  // with JS `use:enhance` swaps in a confirmation without a full reload.
  import { enhance } from "$app/forms";
  import { trackEvent } from "$lib/analytics";

  export let form;

  // 'feliratkozas' | 'leiratkozas' — drives the copy and whether consent is required.
  let muvelet = form?.muvelet ?? "feliratkozas";
  let submitting = false;
</script>

<svelte:head>
  <title>Hírlevél • Diabetes</title>
  <meta
    name="description"
    content="Iratkozzon fel a Diabetes magazin hírlevelére: havonta egy összefoglaló a legfontosabb szakértői cikkekről és hírekről. Leiratkozás bármikor."
  />
</svelte:head>

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
  <div class="mx-auto max-w-2xl px-4 py-12 sm:py-16">
    {#if form?.success}
      <!-- Confirmation state -->
      <div class="flex flex-col gap-4 text-center">
        <h1 class="display text-3xl sm:text-4xl">
          {form.muvelet === "leiratkozas"
            ? "Leiratkozott"
            : "Köszönjük a feliratkozást!"}
        </h1>
        <p class="mx-auto max-w-prose opacity-80">
          {#if form.muvelet === "leiratkozas"}
            Töröltük a címét a hírlevél-listáról. Ha meggondolná magát, bármikor
            újra feliratkozhat ezen az oldalon.
          {:else}
            Hamarosan megérkezik az első összefoglalónk a legfontosabb szakértői
            cikkekről és hírekről. Leiratkozni bármikor egy kattintással tud.
          {/if}
        </p>
        <a href="/" class="btn btn-outline mx-auto mt-2 rounded-sm"
          >Vissza a főoldalra</a
        >
      </div>
    {:else}
      <header class="mb-8 flex flex-col gap-3">
        <p class="text-xs font-semibold tracking-[0.18em] uppercase opacity-60">
          Hírlevél
        </p>
        <h1 class="display text-3xl leading-tight sm:text-4xl">
          Ne maradjon le a fontos cikkekről
        </h1>
        <p class="max-w-prose opacity-80">
          Havonta egy összefoglaló e-mail a legfontosabb szakértői írásokról és
          hírekről — semmi spam, leiratkozás bármikor egy kattintással.
        </p>
      </header>

      <!-- Subscribe / unsubscribe toggle -->
      <div
        class="mb-6 inline-flex rounded-sm border border-base-300 p-1"
        role="group"
        aria-label="Művelet"
      >
        <button
          type="button"
          class="seg rounded-sm px-4 py-1.5 text-sm font-medium"
          class:seg-active={muvelet === "feliratkozas"}
          aria-pressed={muvelet === "feliratkozas"}
          on:click={() => (muvelet = "feliratkozas")}
        >
          Feliratkozás
        </button>
        <button
          type="button"
          class="seg rounded-sm px-4 py-1.5 text-sm font-medium"
          class:seg-active={muvelet === "leiratkozas"}
          aria-pressed={muvelet === "leiratkozas"}
          on:click={() => (muvelet = "leiratkozas")}
        >
          Leiratkozás
        </button>
      </div>

      <form
        method="POST"
        class="flex flex-col gap-4"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            await update();
            submitting = false;
            if (result.type === "success" && result.data?.success) {
              trackEvent("hirlevel_submit", { muvelet });
            }
          };
        }}
      >
        <input type="hidden" name="muvelet" value={muvelet} />

        <!-- Honeypot: hidden from humans; the server rejects submissions where it's filled. -->
        <div class="hp" aria-hidden="true">
          <label
            >Ezt a mezőt hagyja üresen<input
              name="bot-field"
              tabindex="-1"
              autocomplete="off"
            /></label
          >
        </div>

        {#if muvelet === "feliratkozas"}
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium"
              >Név <span class="opacity-50">(nem kötelező)</span></span
            >
            <input
              name="nev"
              type="text"
              autocomplete="name"
              class="rounded-sm border border-primary px-3 py-2"
            />
          </label>
        {/if}

        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">E-mail cím</span>
          <input
            name="email"
            type="email"
            required
            autocomplete="email"
            value={form?.email ?? ""}
            aria-invalid={form?.emailError ? "true" : undefined}
            class="rounded-sm border border-primary px-3 py-2"
          />
          {#if form?.emailError}
            <span class="text-sm text-error"
              >Adjon meg egy érvényes e-mail címet.</span
            >
          {/if}
        </label>

        {#if muvelet === "feliratkozas"}
          <label class="flex items-start gap-2">
            <input name="consent" type="checkbox" value="igen" class="mt-1" />
            <span class="text-sm opacity-80">
              <!-- GDPR: placeholder consent wording — final legal text + linked
                   adatkezelési tájékoztató page pending legal review (see F4.2). -->
              Hozzájárulok, hogy a Diabetes magazin a megadott e-mail címemre hírlevelet
              küldjön. Adataimat harmadik félnek nem adjuk át; a hozzájárulás bármikor
              visszavonható.
            </span>
          </label>
          {#if form?.consentError}
            <span class="text-sm text-error"
              >A feliratkozáshoz el kell fogadnia az adatkezelési feltételeket.</span
            >
          {/if}
        {/if}

        {#if form?.postFail}
          <p class="text-sm text-error">
            A beküldés most nem sikerült. Kérjük, próbálja újra kicsit később.
          </p>
        {/if}

        <button
          type="submit"
          class="btn btn-primary mt-2 self-start rounded-sm"
          disabled={submitting}
        >
          {#if muvelet === "leiratkozas"}
            Leiratkozom
          {:else}
            Feliratkozom
          {/if}
        </button>
      </form>
    {/if}
  </div>
</section>

<style>
  .seg {
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;
  }
  .seg-active {
    background: var(--color-primary);
    color: var(--color-primary-content);
  }
  .hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
</style>
