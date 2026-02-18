<script module>
  declare const mod_login: HTMLDialogElement;
  import type { PageProps } from './$types';
  import { enhance } from '$app/forms';
  // import { invalidateAll } from '$app/navigation'; // Optional: for refreshing data after submission
  import type { SubmitFunction } from '@sveltejs/kit';
  // import Cards from '$lib/components/Cards.svelte';
  // import { redirect } from '@sveltejs/kit';
  import Search from '$lib/components/Search.svelte';
  import Nav2 from '$lib/components/Nav2.svelte';
  import { marked } from '$lib/marked';
</script>

<script lang="ts">
  import { authUser } from '$lib/authStore';
  import { kvizScores } from '$lib/kvizStore';
  // console.log($kvizScores)
  // import { firebaseAuth } from '$lib/firebase'

  const { data }: PageProps = $props()
  const count = data.count
  // let docs = []//data.docs
  // let conf = data.conf

  // console.log({data})
  // const kviz = data.kvizzes?.find(k => k.id === id)
  let kviz = $state(data.kviz)
  let score: number = $state(0)
  /* $effect(() => {
    score = $kvizScores[kviz.id] || 0;
  }) */
  function _scroll(id: string) {
    document.getElementById(id)?.scrollIntoView({behavior: 'smooth'})
  }

  let submitBtn: HTMLInputElement | null = $state(null);
	let c = kviz.questions?.length || 0
  const expired = (new Date(kviz.expires_on).getTime() + 24 * 60 * 60 * 1000) < (new Date()).getTime()
  const scoreSent = expired ? null : $kvizScores[kviz.id]
  // console.log({scoreSent})

  const handleSubmitEnhance: SubmitFunction = async ({ formData/* , formElement, action, controller, submitter */, cancel }) => {
		// `formElement` is this `<form>` element
		// `formData` is its `FormData` object that's about to be submitted
		// `action` is the URL to which the form is posted
		// calling `cancel()` will prevent the submission
		// `submitter` is the `HTMLElement` that caused the form to be submitted

    // formData.set('id', kviz.id);
    formData.set('subject', 'Kvíz: ' + kviz.title.truncate(100));
    formData.set('title', kviz.title);
    formData.set('uid', $authUser?.uid || '');
    formData.set('name', $authUser?.displayName || '');
    formData.set('email', $authUser?.email || '');
    formData.set('score', score.toString());
    formData.set('date', new Date().toLocaleDateString('hu-HU', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}));
    // console.log('Form submission started...')

    $kvizScores[kviz.id] = score

    // console.log('uid: ', $authUser?.uid)
    return () => {
      cancel()
    }
  }

	function _score(s: string,i: number) {
		// if (!Boolean(i)) score = 0 // if first
		if (String(s).startsWith('x') || String(s).startsWith('*')) {
			score = (score || 1) * parseInt(s.substring(1))
		} else {
			score += parseInt(s)
		}
    kviz.questions[i].done = true
    // console.log(kviz.questions[i])
		//score[kviz.id].set(isNaN(parseInt(s,10)) && s.startsWith('x') ? score[kviz.id] * parseFloat(s.substr(1),10) : score[kviz.id] + parseInt(s,10))
    // $kvizScores[kviz.id] = score
    if (i == c-1) {
      if (!scoreSent && !expired && submitBtn) {
        submitBtn.click()
      } else {

      }
      // myForm?.submit()
    }
	}
  function _mscore(s: number,i: number) {
    if (kviz.questions[i].score === undefined) kviz.questions[i].score = 0
    kviz.questions[i].score += s
  }

</script>

<main class="">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">DiabKVÍZ</h1>
    <h2 class="text-center">{kviz.title}</h2>
    {#if kviz.image}
    <img src={kviz.image} alt="">
    {/if}
    <div class="hyphens-auto">{@html marked.parse(kviz.description || '')}</div>

    {#if kviz.video}
    <iframe class="mx-auto my-8" width="560" height="315" src={`https://www.youtube-nocookie.com/embed/${kviz.video}`} title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    {/if}
  </article>
  {#if kviz.link}
    <p class="my-8 text-center"><a href={kviz.link} class="btn btn-outline btn-sm">Kapcsolódó cikk</a></p>
  {/if}

  <!-- form-name=kviz&id=kviz-0&answer-0=99&score=99 -->
  <!-- <form name="kviz" class="max-w-screen-md mx-auto py-12"> -->
  {#if !expired}
    <div class="grid xs:grid-cols-2 gap-4 max-w-screen-md mx-auto py-12 px-2">
      {#if $authUser?.displayName}
        <p class="border border-primary bg-base-200 !h-full w-full p-2">{$authUser.email}</p>
        <p class="border border-primary bg-base-200 !h-full w-full p-2">{$authUser.displayName}</p>
      {:else}
        <legend class="uppercase pt-8 pb-2">A teszt beküldéséhez ellenőrzött email cím és név szükséges</legend>
        <button class="btn btn-outline" onclick={(e) => {e.preventDefault(); mod_login.showModal()}}>Megadom</button>
        <a href="/kviz" class="btn btn-outline">Mégsem</a>
      {/if}
    </div>
  {/if}

  {#if $authUser?.displayName || expired}
  <form method="POST" name="kviz" use:enhance={handleSubmitEnhance} class="max-w-screen-md mx-auto py-12 px-2">
    {#each kviz.questions || [] as q, i}
    <fieldset class="grid xs:grid-cols-2 gap-4">
      <legend id="q-{i}" class="uppercase pt-8 pb-2">
        {q.q}<span class="block normal-case text-sm">{q.d}</span>
      </legend>
      {#if q.multi}
        {#each q.options as opt, j}
          <input type="checkbox" id="answer-{i}-{j}" onchange={ (e) => {_mscore((e.target as HTMLInputElement).checked ? opt.score : -(opt.score), i) } }>
          <label for="answer-{i}-{j}" class="bg-base-100 border-1 border-secondary p-2">
            {opt.option}
            {#if q.done}
              <aside><small>({opt.score} pont)</small></aside>
            {/if}
          </label>
        {/each}
        <input id="tovabb-{i}" name="answer-{i}" type="checkbox" required onchange={() => {_score(q.score || 0,i); _scroll(`q-${i}`)}}>
        <label for="tovabb-{i}" class="bg-outline border-1 border-primary text-center p-2">
          <span>Tovább</span>
          {#if q.done}
            <aside class="multi">{q.score || 0} pont</aside>
          {/if}
        </label>
      {:else}
        {#each q.options as opt, j}
          <input type="radio" name="answer-{i}" id="answer-{i}-{j}" required onchange={() => {_score(opt.score,i); _scroll(`q-${i}`)}}>
          <label for="answer-{i}-{j}" class="bg-base-100 border-1 border-secondary p-2">
            {opt.option}
            {#if q.done}
              <aside class="choice">
                <small>{opt.score} pont{opt.feedback ? ` (${opt.feedback})` : ''}</small>
              </aside>
            {/if}
          </label>
        {/each}
      {/if}
    </fieldset>
    {/each}
    <!-- <fieldset>
      <legend id="q-{c}">Is Cartman your favorite South Park character? {c}</legend>
      <input type="radio" name="answer-{c}" id="answer-{c}-0" required on:change={_score('x0',c),_scroll(`q-${c}`)}>
      <label for="answer-{c}-0">
        Absolutely not
        <aside>gotcha boy <br><small>(x0 points)</small></aside>
      </label>
      <input type="radio" name="answer-{c}" id="answer-{c}-1" required on:change={_score('x0',c),_scroll(`q-${c}`)}>
      <label for="answer-{c}-1">
        Who else?
        <aside>helyes! <br><small>(x0 points)</small></aside>
      </label>
    </fieldset> -->

    <fieldset id="thankyou">
      <legend class="uppercase pt-8 pb-2">Köszönjük, hogy kitöltötted a kvízt!</legend>
      {#if scoreSent == null}
        {#if expired}
          <p>A beküldési határidő lejárt, pontjaidat nem rögzítettük.</p>
        {:else}
          <p>Pontszámodat rögzítettük.</p>
        {/if}
      {:else}
        {#if scoreSent < score}
        <p>Beküldött pontjaidnál ({scoreSent} / {kviz.max_score} pont) jobb eredményt értél el.</p>
        {/if}
        {#if scoreSent > score}
        <p>Beküldött pontjaidnál ({scoreSent} / {kviz.max_score} pont) kevesebb pontot értél el.</p>
        {/if}
        {#if scoreSent == score}
        <p>Beküldött pontjaiddal ({scoreSent} / {kviz.max_score} pont) azonos eredményt értél el.</p>
        {/if}
      {/if}
      <a href="/kviz" class="btn btn-outline mt-8">Tovább</a>
      <input id="submit" type="submit" value="Küldés" hidden class="hidden:true;" bind:this={submitBtn}>
    </fieldset>
    <input type="hidden" name="form-name" value="kviz">
  </form>
  {/if}

</main>
<footer class="bg-base-200 text-base-content py-2">
  <p class="text-center">Pontszám: <span class="badge badge-accent">{score} / {kviz.max_score} pont</span></p>
</footer>

<Search {count}/>
<Nav2 actual={data.path}/>

<!-- {#if docs.length}
  <article class="prose mt-16 mb-8 mx-auto w-full">
    <h1 class="text-center">Kapcsolódó cikkek</h1>
  </article>
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if} -->


<style>

/* h1 {
	margin-bottom: 0;
} */

/* form {
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-gap: var(--gutter);
} */
/* fieldset {
	display: contents;
} */
/* fieldset {
	margin-inline: .5rem;
} */
fieldset:not(:valid) ~ fieldset/* , fieldset:last-of-type */ { 
  /* display: none;  */
  visibility: hidden;
}

legend {
	/* font-size: var(--midsize); */
	/* text-transform: uppercase; */
	grid-column: 1 / 3;
	/* margin-top: var(--spacer); */
}

input[type="radio"], input[type="checkbox"] { display: none; }

/* input:valid[type="radio"] ~ label {
	pointer-events: none;
	user-select: none;
} */
label {
	display: block;
	position: relative;
	cursor: pointer;
	/* padding: var(--gutter); */
	/* background-color: var(--toolbg); */
	height: max-content;
}
input:checked + label {
	background-color: var(--color-secondary);
	border-color: var(--color-secondary);
  color: var(--color-white);
}
/* input:checked + label.border-primary {
	background-color: var(--color-primary);
} */
/* input:checked + label, label:hover, label:focus { 
	background-color: var(--maincolor);
	color: inherit;
} */

fieldset:has(input:required:valid) {
	pointer-events: none;
	user-select: none;
}

label aside { display: none }

fieldset:has(input:required:valid) input:checked + label aside {
	display: block;
}
fieldset:has(input:required:valid) input:checked + label span { 
	display: none;
}

footer {
	position: sticky;
	bottom: -1px;
	/* padding: var(--gutter) var(--gutter) var(--gutter2);
	margin-top: var(--spacer); */
	border-top: 1px solid var(--color-primary);
	border-bottom: 1px solid var(--color-primary);
	background-color: #00000080;
	backdrop-filter: blur(4px);
}
/* mark {
	padding: 0 1rem;
  background-color: var(--color-accent);
} */

</style>
