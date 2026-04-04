<script context="module">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
</script>

<script lang="ts">
  import { hasReceptsarokAccess } from '$lib/authStore'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

  const recipe = data.recipe
  const isFree = data.isFree
  const category = data.categories.find((c: any) => c.id === data.categoryId)

  let canView = $derived(isFree || $hasReceptsarokAccess)
</script>

<svelte:head>
  <title>{recipe.title} • Receptsarok</title>
  <meta name="description" content="{recipe.author} receptje — {recipe.energy} kcal, {recipe.protein}g fehérje, {recipe.carbs}g szénhidrát" />
  {#if recipe.image}
    <meta property="og:image" content={recipe.image.src} />
    <link rel="preload" href={recipe.image.src} as="image" />
  {/if}
</svelte:head>

<Search count={data.recipes.length} />
<Nav2 actual="/receptsarok" />

<main class="bg-base-100 max-w-prose mx-auto px-4 py-12">
  <nav class="text-sm mb-8">
    <ul class="flex gap-1 list-none p-0 m-0">
      <li><a href="/receptsarok" class="opacity-60 hover:opacity-100">Receptsarok</a></li>
      <li class="before:content-['›'] before:mx-1 before:opacity-40">
        <a href="/receptsarok/{recipe.category}" class="opacity-60 hover:opacity-100">{category?.name || recipe.category}</a>
      </li>
      <li class="before:content-['›'] before:mx-1 before:opacity-40 truncate">{recipe.title}</li>
    </ul>
  </nav>

  <article class="prose">
    <h1>{recipe.title}</h1>
    <p class="italic">{recipe.author} receptje</p>

    {#if recipe.image}
      <figure class="text-center">
        <img src={recipe.image.src} alt={recipe.image.alt} class="mx-auto" />
      </figure>
    {/if}

    <div class="flex flex-wrap gap-2 mb-4">
      <span class="badge badge-outline">{recipe.servings.amount} {recipe.servings.unit}</span>
      <span class="badge badge-outline">{recipe.year}</span>
      {#if isFree}
        <span class="badge badge-success">ingyenes</span>
      {/if}
    </div>

    {#each recipe.nutritionTables as table}
      <NutritionTable {table} />
    {/each}

    {#if recipe.nutritionTables.length === 0}
      <NutritionTable table={{
        label: '1 adag energia- és tápanyagtartalma:',
        energy: recipe.energy,
        protein: recipe.protein,
        fat: recipe.fat,
        saturatedFat: recipe.saturatedFat,
        carbs: recipe.carbs,
        fiber: recipe.fiber
      }} />
    {/if}

    {#if canView}
      {#each recipe.ingredientGroups as group}
        {#if group.section}
          <h3>{group.section}</h3>
        {:else}
          <h2>Hozzávalók {recipe.servings.amount} {recipe.servings.unit}hoz</h2>
        {/if}
        <ul>
          {#each group.items as item, i}
            <li>{item.text}{i < group.items.length - 1 ? ',' : '.'}</li>
          {/each}
        </ul>
      {/each}

      <h2>A recept elkészítése</h2>
      {#each recipe.instructions as paragraph}
        <p>{paragraph}</p>
      {/each}

      {#if recipe.subRecipes?.length}
        <hr />
        {#each recipe.subRecipes as sub}
          <h2>{sub.title}</h2>
          <p class="text-sm opacity-60">{sub.servings.amount} {sub.servings.unit}</p>

          {#each sub.nutritionTables as table}
            <NutritionTable {table} />
          {/each}

          {#each sub.ingredientGroups as group}
            {#if group.section}
              <h4>{group.section}</h4>
            {:else}
              <h3>Hozzávalók</h3>
            {/if}
            <ul>
              {#each group.items as item, i}
                <li>{item.text}{i < group.items.length - 1 ? ',' : '.'}</li>
              {/each}
            </ul>
          {/each}

          <h3>A recept elkészítése</h3>
          {#each sub.instructions as paragraph}
            <p>{paragraph}</p>
          {/each}

          {#if sub.image}
            <figure class="text-center">
              <img src={sub.image.src} alt={sub.image.alt} class="mx-auto" />
            </figure>
          {/if}
        {/each}
      {/if}
    {:else}
      <PaywallCTA context="recipe" />
    {/if}
  </article>
</main>
