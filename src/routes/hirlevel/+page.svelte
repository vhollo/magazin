<script>
  // Newsletter subscribe / unsubscribe page (homepage redesign 2026, F4).
  // Progressive enhancement: works without JS (native form POST → action), and
  // with JS `use:enhance` swaps in a confirmation without a full reload.
  import { enhance } from "$app/forms";
  import { trackEvent } from "$lib/analytics";
  import { authUser } from "$lib/authStore";

  export let form;

  // 'feliratkozas' | 'leiratkozas' — drives the copy and whether consent is required.
  let muvelet = form?.muvelet ?? "feliratkozas";
  let submitting = false;

  // Editable field values. Seed email from a failed-submit echo (form.email) so the
  // user's input survives a validation error.
  let nev = "";
  let email = form?.email ?? "";

  // Prefill name + email from the signed-in user once Firebase auth resolves
  // (client-side, so $authUser is undefined during SSR and fills in after hydration).
  // Runs once and only into still-empty fields, so it never clobbers typed input or
  // the failed-submit echo.
  let prefilled = false;
  $: if (!prefilled && $authUser) {
    if (!email && $authUser.email) email = $authUser.email;
    if (!nev && $authUser.displayName) nev = $authUser.displayName;
    prefilled = true;
  }
</script>

<svelte:head>
  <title>Hírlevél • Diabetes</title>
  <meta
    name="description"
    content="Iratkozz fel a Diabetes magazin hírlevelére: havonta egy összefoglaló a legfontosabb szakértői cikkekről és hírekről. Leiratkozás bármikor."
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
            ? "Leiratkoztál"
            : "Köszönjük a feliratkozást!"}
        </h1>
        <p class="mx-auto max-w-prose opacity-80">
          {#if form.muvelet === "leiratkozas"}
            Töröltük a címedet a hírlevél-listáról. Ha meggondolod magad,
            bármikor újra feliratkozhatsz ezen az oldalon.
          {:else}
            Hamarosan megérkezik az első összefoglalónk a legfontosabb szakértői
            cikkekről és hírekről. Leiratkozni bármikor egy kattintással tudsz.
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
          Ne maradj le a fontos cikkekről
        </h1>
        <p class="max-w-prose opacity-80">
          Havonta egy összefoglaló e-mail a legfontosabb szakértői írásokról és
          hírekről — semmi spam, leiratkozás bármikor egy kattintással.
        </p>
      </header>

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
        <!-- Honeypot: hidden from humans; the server rejects submissions where it's filled. -->
        <div class="hp" aria-hidden="true">
          <label
            >Ezt a mezőt hagyd üresen<input
              name="bot-field"
              tabindex="-1"
              autocomplete="off"
            /></label
          >
        </div>

        {#if form?.postFail}
          <p class="text-sm text-error">
            A beküldés most nem sikerült. Kérlek, próbáld újra kicsit később.
          </p>
        {/if}

        <!-- daisyUI radio tabs-box: the checked radio carries `muvelet` on submit and
             (via CSS) reveals its `.tab-content` panel — the toggle works without JS.
             Each panel is the full form for its mode, so the email lives inside the box.
             The inactive panel's inputs are `disabled` so only the active mode's fields
             submit (and a hidden `required` email can't block submission); both email
             inputs `bind:value={email}`, so they stay in sync and prefill either one. -->
        <div class="tabs tabs-box">
          <input
            type="radio"
            name="muvelet"
            value="feliratkozas"
            bind:group={muvelet}
            class="tab"
            aria-label="Feliratkozás"
          />
          <div class="tab-content border-base-300 bg-base-100 p-4 sm:p-6">
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium"
                  >Név <span class="opacity-50">(nem kötelező)</span></span
                >
                <!-- Not disabled on unsubscribe: a single `nev` input with no `required`,
                     so it can stay enabled and still submit the (prefilled) name on
                     unsubscribe too — matching the pre-tabs behavior. -->
                <input
                  name="nev"
                  type="text"
                  autocomplete="name"
                  bind:value={nev}
                  class="rounded-sm border border-primary px-3 py-2"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">E-mail cím</span>
                <input
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  bind:value={email}
                  disabled={muvelet !== "feliratkozas"}
                  aria-invalid={form?.emailError ? "true" : undefined}
                  class="rounded-sm border border-primary px-3 py-2"
                />
                {#if form?.emailError}
                  <span class="text-sm text-error"
                    >Add meg egy érvényes e-mail címet.</span
                  >
                {/if}
              </label>
              <label class="flex items-start gap-2">
                <input
                  name="consent"
                  type="checkbox"
                  value="igen"
                  disabled={muvelet !== "feliratkozas"}
                  class="mt-1"
                />
                <span class="text-sm opacity-80">
                  <!-- GDPR: placeholder consent wording — final legal text + linked
                       adatkezelési tájékoztató page pending legal review (see F4.2). -->
                  Hozzájárulok, hogy a Diabetes magazin a megadott e-mail címemre
                  hírlevelet küldjön. Adataimat harmadik félnek nem adjuk át; a hozzájárulás
                  bármikor visszavonható.
                </span>
              </label>
              {#if form?.consentError}
                <span class="text-sm text-error"
                  >A feliratkozáshoz el kell fogadnod az adatkezelési
                  feltételeket.</span
                >
              {/if}
              <button
                type="submit"
                class="btn btn-primary mt-2 self-start rounded-sm"
                disabled={submitting}
              >
                Feliratkozom
              </button>
            </div>
          </div>

          <input
            type="radio"
            name="muvelet"
            value="leiratkozas"
            bind:group={muvelet}
            class="tab"
            aria-label="Leiratkozás"
          />
          <div class="tab-content border-base-300 bg-base-100 p-4 sm:p-6">
            <div class="flex flex-col gap-4">
              <p class="text-sm opacity-80">
                Add meg az e-mail címed, és töröljük a hírlevél-listáról.
              </p>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">E-mail cím</span>
                <input
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  bind:value={email}
                  disabled={muvelet !== "leiratkozas"}
                  aria-invalid={form?.emailError ? "true" : undefined}
                  class="rounded-sm border border-primary px-3 py-2"
                />
                {#if form?.emailError}
                  <span class="text-sm text-error"
                    >Add meg egy érvényes e-mail címet.</span
                  >
                {/if}
              </label>
              <button
                type="submit"
                class="btn btn-primary mt-2 self-start rounded-sm"
                disabled={submitting}
              >
                Leiratkozom
              </button>
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
</section>

<style>
  .hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
</style>
