<script>
  function _scroll(id) {
  document.getElementById(id).scrollIntoView({behavior: 'smooth'})
}

  let score = {
    1: 0
  }

  // translate to Hungarian
  const kviz = {
    _id: 1,
    questions: [
      {
        q: 'Jelöld meg a Magyar városokat!',
        multi: [
          { choice: 'Miskolc', score: 1 },
          { choice: 'München', score: -1 },
          { choice: 'Győr', score: 1 },
          { choice: 'Berlin', score: -1 },
          { choice: 'Szombathely', score: 1 },
          { choice: 'Hamburg', score: -1 },
          { choice: 'Kecskemét', score: 1 },
          { choice: 'Köln', score: -1 },
          { choice: 'Nyíregyháza', score: 1 },
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
  }

  let form = null
	let c = kviz.questions.length
	let startnew = true
	function _score(s,i) {
		startnew = false
		if (!Boolean(i)) score[kviz._id] = 0 // if first
		if (String(s).startsWith('x') || String(s).startsWith('*')) {
			score[kviz._id] = parseFloat(score[kviz._id]) * parseFloat(s.substr(1), 10)
		} else {
			score[kviz._id] += parseFloat(s, 10)
		}
		//score[kviz._id].set(isNaN(parseInt(s,10)) && s.startsWith('x') ? score[kviz._id] * parseFloat(s.substr(1),10) : score[kviz._id] + parseInt(s,10))
    if (i == c-1) {
      form.submit()
    }
	}
  function _mscore(s,i) {
    kviz.questions[i].score += s
  }
</script>

<main class="bg-base-300">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">DiabKVÍZ</h1>
  </article>
  <form action="#thankyou" name={`kviz_${kviz._id}`} data-netlify="true" class="max-w-screen-md mx-auto py-12" bind:this={form}>
    <!-- <input type="hidden" name="form-name" value={`kviz_${kviz._id}`}> -->
    {#each kviz.questions as q, i}
      <fieldset class="grid grid-cols-2 gap-4">
        <legend id="q-{i}" class="pt-8">{q.q}</legend>
        {#if q.multi}
          {#each q.multi as ch, j}
            <input type="checkbox" id="answer-{i}-{j}" on:change={() => {_mscore(ch.score,i)/* ; _scroll(`q-${i}`) */}} value={ch.score}>
            <label for="answer-{i}-{j}" class="bg-base-100 border-1 border-secondary p-2">
              {ch.choice}
              <aside><small>({ch.score} pont)</small></aside>
            </label>
          {/each}
          <input id="tovabb-{i}" name="answer-{i}" value={q.score} type="checkbox" required on:change={() => {_score(q.score,i); _scroll(`q-${i}`)}}>
          <label for="tovabb-{i}" class="bg-outline border-1 border-primary text-center col--span-full mx--auto p-2">
            <span>Tovább</span>
            <aside class="multi">{q.score} pont</aside>
          </label>
        {:else}
          {#each q.choices as ch, j}
            <input type="radio" name="answer-{i}" id="answer-{i}-{j}" required on:change={() => {_score(ch.score,i); _scroll(`q-${i}`)}} value={ch.score}>
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
      <legend class="pt-8">Köszönjük, hogy kitöltötted a kvízt!</legend>
      <input type="submit" value="Küldés" class="btn !btn-primary text-center block mx-auto p-2">
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
fieldset:not(:valid) ~ fieldset/* , fieldset:last-of-type */ { display: none; }

legend {
	/* font-size: var(--midsize); */
	text-transform: uppercase;
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
