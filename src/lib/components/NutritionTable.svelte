<script lang="ts">
  import type { NutritionValues } from '$lib/receptsarok'
  let { table, compact = false }: { table: NutritionValues; compact?: boolean } = $props()

  const columns = $derived([
    { key: 'energy', title: 'Energia', short: 'Energia', unit: 'kcal', value: table.energy },
    { key: 'protein', title: 'Fehérje', short: 'Fehérje', unit: 'g', value: table.protein },
    { key: 'fat', title: 'Zsír', short: 'Zsír', unit: 'g', value: table.fat },
    {
      key: 'saturatedFat',
      title: 'Telített zsír',
      short: 'Tel. zsír',
      unit: 'g',
      value: table.saturatedFat,
    },
    { key: 'carbs', title: 'Szénhidrát', short: 'Szénh.', unit: 'g', value: table.carbs },
    { key: 'fiber', title: 'Rost', short: 'Rost', unit: 'g', value: table.fiber },
  ])

  const visibleColumns = $derived(columns.filter((column) => column.value !== null && column.value !== undefined))
</script>

{#if visibleColumns.length > 0}
  {#if compact}
    <div class="grid grid-cols-3 gap-2 text-xs">
      {#each visibleColumns as column (column.key)}
        <span title={column.title}>{column.short}: <b>{column.value}</b> {column.unit}</span>
      {/each}
    </div>
  {:else}
    <!-- daisyUI table: https://daisyui.com/components/table/ — not-prose avoids article.prose breaking layout -->
    <div class="not-prose my-4 overflow-x-auto w-full rounded-lg border border-base-300 bg-base-200/40">
      <table class="table table-xs w-full min-w-[min(100%,32rem)]">
        <thead>
          {#if table.label}
            <tr>
              <th colspan={visibleColumns.length} class="bg-base-200 text-left font-normal italic">{table.label}</th>
            </tr>
          {/if}
          <tr>
            {#each visibleColumns as column (column.key)}
              <th>{column.title}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          <tr class="bg-base-100">
            {#each visibleColumns as column (column.key)}
              <td>{column.value} {column.unit}</td>
            {/each}
          </tr>
        </tbody>
      </table>
    </div>
  {/if}
{/if}
