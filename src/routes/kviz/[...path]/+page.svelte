<script lang="ts">
  import type { PageProps } from './$types';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation'; // Optional: for refreshing data after submission
  import type { SubmitFunction } from '@sveltejs/kit';
  import Cards from '$lib/components/Cards.svelte';
  import { redirect } from '@sveltejs/kit';

  const { data/* , form */ }: PageProps = $props()
  // let docs = []//data.docs
  let conf = data.conf

  const path = data.doc.path

  const kvizzes = $state([{
    _id: '1',
    title: 'DiabKVÍZ 1',
    questions: [
      {
        q: 'Jelöld meg a Magyar városokat!',
        d: 'A helyes válaszok 2 pontot érnek, a helytelen válaszokért 1 pont levonás jár.',
        multi: [
          { choice: 'Miskolc', score: 2 },
          { choice: 'München', score: -1 },
          { choice: 'Győr', score: 2 },
          { choice: 'Berlin', score: -1 },
          { choice: 'Szombathely', score: 2 },
          { choice: 'Hamburg', score: -1 },
          { choice: 'Kecskemét', score: 2 },
          { choice: 'Köln', score: -1 },
          { choice: 'Nyíregyháza', score: 2 },
        ],
        score: 0
      },
      {
        q: 'Mi Franciaország fővárosa?',
        choices: [
          { choice: 'Párizs', score: 10, answer: 'Helyes válasz!' },
          { choice: 'London', score: 0, answer: 'A helyes válasz: Párizs' },
          { choice: 'Berlin', score: 0, answer: 'A helyes válasz: Párizs' }
        ]
      },
      /* {
        q: 'Mi Anglia fővárosa?',
        choices: [
          { choice: 'Párizs', score: 0, answer: 'A helyes válasz: London' },
          { choice: 'London', score: 10, answer: 'Helyes válasz!' },
          { choice: 'Berlin', score: 0, answer: 'A helyes válasz: London' }
        ]
      },
      {
        q: 'Mi Németország fővárosa?',
        choices: [
          { choice: 'Párizs', score: 0, answer: 'A helyes válasz: Berlin' },
          { choice: 'London', score: 0, answer: 'A helyes válasz: Berlin' },
          { choice: 'Berlin', score: 10, answer: 'Helyes válasz!' }
        ]
      } */
    ]
  }])
  const kviz = kvizzes.find(k => k._id === path)
  if (!kviz) {
    throw redirect(302, '/kviz')
  }

  let score = $state({
    '1': 0
  })
  // console.log($state.snapshot(score))


  function _scroll(id: string) {
    document.getElementById(id).scrollIntoView({behavior: 'smooth'})
  }

  /* const handleSubmit = event => {
    event.preventDefault();

    const myForm = event.target;
    const formData = new FormData(myForm);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    })
      .then(() => console.log("Form successfully submitted"))
      .catch(error => alert(error));
  } */

  let submitBtn: HTMLInputElement | null = null;
  let myForm: HTMLFormElement | null = null
	let c = kviz.questions.length
	let startnew = true

	function _score(s: string,i: number) {
		startnew = false
		if (!Boolean(i)) score[kviz._id] = 0 // if first
		if (String(s).startsWith('x') || String(s).startsWith('*')) {
			score[kviz._id] = parseFloat(score[kviz._id]) * parseInt(s.substring(1))
		} else {
			score[kviz._id] += parseInt(s)
		}
		//score[kviz._id].set(isNaN(parseInt(s,10)) && s.startsWith('x') ? score[kviz._id] * parseFloat(s.substr(1),10) : score[kviz._id] + parseInt(s,10))
    if (i == c-1) {
      console.log({myForm})
      // submitBtn.click();
    }
	}
  function _mscore(s,i) {
    // console.log(s)
    kviz.questions[i].score += s
  }

  /* const encode = (data) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  } */
  const handleSubmitEnhance: SubmitFunction = async ({ formData/* , formElement, action, controller, submitter */, cancel }) => {
		// `formElement` is this `<form>` element
		// `formData` is its `FormData` object that's about to be submitted
		// `action` is the URL to which the form is posted
		// calling `cancel()` will prevent the submission
		// `submitter` is the `HTMLElement` that caused the form to be submitted

    // add score[kviz._id] to formData
    // formData.set('score', score[kviz._id].toString())
    console.log('Form submission started...', Object.fromEntries(formData));
    return () => {
      cancel()
    }

    /*
    fetch("", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({ "form-name": formData.get('form-name'), ...formData })
    })
      .then(() => alert("Success!"))
      .catch(error => alert(error));
    */
    // e.preventDefault();
  }

</script>

<main class="bg-base-300">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">DiabKVÍZ</h1>
    <h2 class="text-center">{kviz.title}</h2>
  </article>

  <form method="POST" action="/kviz" use:enhance={handleSubmitEnhance} name="kviz" class="max-w-screen-md mx-auto py-12" bind:this={myForm}>
    <input type="hidden" name="form-name" value="kviz">
    <input type="hidden" name="kviz-id" value={kviz._id}>
    {#each kviz.questions as q, i}
      <fieldset class="grid grid-cols-2 gap-4">
        <legend id="q-{i}" class="uppercase pt-8 pb-2">{q.q}
          <!-- {#if q.d} -->
            <span class="block normal-case text-sm">{q.d}</span>
          <!-- {/if} -->
        </legend>
        {#if q.multi}
          {#each q.multi as ch, j}
            <input type="checkbox" id="answer-{i}-{j}" onchange={ (e) => {_mscore((e.target as HTMLInputElement).checked ? ch.score : -(ch.score), i) } }>
            <label for="answer-{i}-{j}" class="bg-base-100 border-1 border-secondary p-2">
              {ch.choice}
              <aside><small>({ch.score} pont)</small></aside>
            </label>
          {/each}
          <input id="tovabb-{i}" name="answer-{i}" value={q.score} type="checkbox" required onchange={() => {_score(q.score,i); _scroll(`q-${i}`)}}>
          <label for="tovabb-{i}" class="bg-outline border-1 border-primary text-center col--span-full mx--auto p-2">
            <span>Tovább</span>
            <aside class="multi">{q.score} pont</aside>
          </label>
        {:else}
          {#each q.choices as ch, j}
            <input type="radio" name="answer-{i}" id="answer-{i}-{j}" required onchange={() => {_score(ch.score,i); _scroll(`q-${i}`)}} value={ch.score}>
            <label for="answer-{i}-{j}" class="bg-base-100 border-1 border-secondary p-2">
              {ch.choice}
              <aside class="choice"><small>{ch.answer} ({ch.score} pont)</small></aside>
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
      <input type="hidden" name="score" value={score[kviz._id]}>
      <input id="submit" type="submit" value="Küldés" class:hidden={false} bind:this={submitBtn}>
    </fieldset>
  </form>

</main>

<footer class="bg-base-200 text-base-content py-2">
  <p class="text-center">Pontszám: <mark>{score[kviz._id] || 0}</mark>
    <!-- {#if score[kviz._id] && startnew}
    (de a jelenlegi pontszám lenullázódik)
    {/if} -->
  </p>

  <!-- {#if score_sum >= $threshold}
  <br>
  Now you've proven your authoriter values. You are allowed to <a href="/dics/{$bckid}"><button>RATE</button></a> your favorite DiCs.
  {/if} -->
</footer>

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
  color: var(--color-white);
}
input:checked + label.border-primary {
	background-color: var(--color-primary);
}
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
mark {
	padding: 0 1rem;
  background-color: var(--color-accent);
}

</style>
