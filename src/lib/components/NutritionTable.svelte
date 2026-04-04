<script lang="ts">
  import type { NutritionValues } from '$lib/receptsarok'
  export let table: NutritionValues
  export let compact = false
</script>

{#if compact}
  <div class="grid grid-cols-3 gap-1 text-xs">
    <span title="Energia"><b>{table.energy}</b> kcal</span>
    <span title="Fehérje">F: <b>{table.protein}</b> g</span>
    <span title="Szénhidrát">Sz: <b>{table.carbs}</b> g</span>
    <span title="Zsír">Zs: <b>{table.fat}</b> g</span>
    <span title="Rost">R: <b>{table.fiber}</b> g</span>
    <span title="Telített zsír">Tz: <b>{table.saturatedFat}</b> g</span>
  </div>
{:else}
  <table class="table table-xs w-full">
    <thead>
      <tr>
        <th colspan="6" class="text-left font-normal italic">{table.label}</th>
      </tr>
    </thead>
    <tbody>
      <tr class="font-medium">
        <th>Energia</th>
        <th>Fehérje</th>
        <th>Zsír</th>
        <th>Tel. zsír</th>
        <th>Szénhidrát</th>
        <th>Rost</th>
      </tr>
      <tr>
        <td>{table.energy} kcal</td>
        <td>{table.protein} g</td>
        <td>{table.fat} g</td>
        <td>{table.saturatedFat} g</td>
        <td>{table.carbs} g</td>
        <td>{table.fiber} g</td>
      </tr>
    </tbody>
  </table>
{/if}
