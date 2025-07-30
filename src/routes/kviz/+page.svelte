<script lang="ts">
  import type { PageProps } from "./$types";
  import { kvizScores } from '$lib/kvizStore';
console.log({$kvizScores})

  const { data }: PageProps = $props()
  // console.log({data})
  const kvizzes = data.kvizzes
</script>

<form data-netlify="true" name="kviz" class="hidden">
  <input name="id">
  <input name="email">
  <input name="name">
  <input name="score">
  <input name="date">
</form>

{#each kvizzes as kviz}
  <p class="text-center"><a class="btn btn-outline" href={`/kviz/${kviz._id}`}>{kviz.title}</a>{$kvizScores[kviz._id]} pont</p>
{/each}

<!-- <p class="text-center"><a class="btn btn-outline" href="/kviz/egy" onclick={() => console.log('kviz btn')}>Kvíz 1</a></p>
<p class="text-center"><a class="btn btn-outline" href="/kviz/ketto" onclick={() => console.log('kviz btn')}>Kvíz 2</a></p> -->
<!-- <a href="/kviz/2">Kvíz 2</a>
<a href="/kviz/3">Kvíz 3</a>
<a href="/kviz/4">Kvíz 4</a>
<a href="/kviz/5">Kvíz 5</a>
<a href="/kviz/6">Kvíz 6</a>
<a href="/kviz/7">Kvíz 7</a>
<a href="/kviz/8">Kvíz 8</a>
<a href="/kviz/9">Kvíz 9</a>
<a href="/kviz/10">Kvíz 10</a> -->