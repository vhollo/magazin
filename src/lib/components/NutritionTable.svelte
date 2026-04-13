<script lang="ts">
  import type { NutritionValues } from '$lib/receptsarok'
  export let table: NutritionValues
  export let compact = false
</script>

{#if compact}
  <div class="grid grid-cols-3 gap-2 text-xs">
    <span title="Energia"><b>{table.energy}</b> kcal</span>
    <span title="Fehérje">Fehérje: <b>{table.protein}</b> g</span>
    <span title="Szénhidrát">Szénh.: <b>{table.carbs}</b> g</span>
    <span title="Zsír">Zsír: <b>{table.fat}</b> g</span>
    <span title="Rost">Rost: <b>{table.fiber}</b> g</span>
    <span title="Telített zsír">Tel. zsír: <b>{table.saturatedFat}</b> g</span>
  </div>
{:else}
  <!-- daisyUI table: https://daisyui.com/components/table/ — not-prose avoids article.prose breaking layout -->
  <div class="not-prose my-4 overflow-x-auto w-full rounded-lg border border-base-300 bg-base-200/40">
    <table class="table table-xs w-full min-w-[min(100%,32rem)]">
      <thead>
        {#if table.label}
          <tr>
            <th colspan="6" class="bg-base-200 text-left font-normal italic">{table.label}</th>
          </tr>
        {/if}
        <tr>
          <th>Energia</th>
          <th>Fehérje</th>
          <th>Zsír</th>
          <th>Telített zsír</th>
          <th>Szénhidrát</th>
          <th>Rost</th>
        </tr>
      </thead>
      <tbody>
        <tr class="bg-base-100">
          <td>{table.energy} kcal</td>
          <td>{table.protein} g</td>
          <td>{table.fat} g</td>
          <td>{table.saturatedFat} g</td>
          <td>{table.carbs} g</td>
          <td>{table.fiber} g</td>
        </tr>
      </tbody>
    </table>
  </div>
{/if}
