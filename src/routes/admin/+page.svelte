<script context="module">
  import { PUBLIC_BASE_URL } from '$env/static/public'
  import { ads } from '$lib/ads.js'
</script>

<script>
  let win
  // $: console.log(ads)
  const _save = () => {
    // save
  }
  const _delete = (i) => {
    if (win?.confirm('Are you sure you want to delete this item?')) {
      ads.banners.splice(i, 1)
    }
  }
</script>

<svelte:head><title>Admin</title></svelte:head>
<svelte:window bind:this={win}/>

<section class="grid gap-x-6 gap-y-0 px-4 py-6">
  {#each ads.banners as item, i}
  <form class="form-control card card-compact rounded bg-base-100 p-2">
    <label for="title" class="label"><span class="label-text">Name</span></label>
    <input id="title" type="text" class="input input-bordered input-sm w-full max-w-xs" bind:value={item.title}>
    <label for="img" class="label"><span class="label-text">Image</span></label>
    <input id="img" type="url" class="file-input input-bordered input-sm w-full max-w-xs" bind:value={item.img}>
    <label for="video" class="label"><span class="label-text">Video</span></label>
    <input id="video" type="url" class="file-input input-bordered input-sm w-full max-w-xs" bind:value={item.video}>
    <fieldset class="flex flex-horizontal w-full max-w-xs pt-4 gap-2">
      <label for="width" class="label w-1/4"><span class="label-text">Width</span></label>
      <input id="width" type="number" class="input input-sm bg-base-200 w-1/2" bind:value={item.width}>
      <label for="height" class="label w-1/4"><span class="label-text">Height</span></label>
      <input id="height" type="number" class="input input-sm bg-base-200 w-1/2" bind:value={item.height}>
    </fieldset>
    <label for="link" class="label"><span class="label-text">Link to</span></label>
    <input id="link" type="url" class="input input-bordered input-sm w-full max-w-xs" bind:value={item.link}>
    <fieldset class="flex flex-horizontal w-full max-w-xs pt-4 gap-2">
      <button on:click={_save} class="btn btn-sm flex-1">Save</button>
      <button on:click={() => _delete(i)} class="btn btn-sm flex-1">Delete</button>
    </fieldset>
  </form>
  {/each}
</section>

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(32ch, 1fr));
    grid-auto-rows: auto;
    grid-auto-flow: dense;
    grid-template-rows: masonry;
  }
  form {
    position: unset;
    min-height: 20ch;
    /* grid-row-end: span 3; */
    margin-bottom: 3rem;
  }
</style>