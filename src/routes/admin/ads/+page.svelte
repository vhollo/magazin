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
      console.log(ads.banners)
    }
  }
  // $: console.log(ads.banners)
</script>

<svelte:head><title>Admin</title></svelte:head>
<svelte:window bind:this={win}/>

<section class="grid gap-x-6 gap-y-0 px-4 py-6">
  {#key ads.banners}
  {#each ads.banners as item, i}
  <form class="form-control card card-compact rounded bg-base-100 mx-auto p-2">
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <label for={`title-${i}`} class="label w-1/5"><span class="label-text">Name</span></label>
      <input id={`title-${i}`} type="text" class="input input-bordered input-sm flex-1" bind:value={item.title}>
    </fieldset>
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <label for={`img-${i}`} class="label w-1/5"><span class="label-text">Image</span></label>
      <input id={`img-${i}`} type="url" class="file-input input-bordered input-sm flex-1" bind:value={item.img}>
    </fieldset>
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <label for={`video-${i}`} class="label w-1/5"><span class="label-text">Video</span></label>
      <input id={`video-${i}`} type="url" class="file-input input-bordered input-sm flex-1" bind:value={item.video}>
    </fieldset>
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <label for={`width-${i}`} class="label w-1/5"><span class="label-text">Width</span></label>
      <input id={`width-${i}`} type="number" class="input input-sm px-1 bg-base-200 w-1/3" bind:value={item.width}>
      <label for={`height-${i}`} class="label w-1/5"><span class="label-text">Height</span></label>
      <input id={`height-${i}`} type="number" class="input input-sm px-1 bg-base-200 w-1/3" bind:value={item.height}>
      <label for={`prominent-${i}`} class="label w-1/5"><span class="label-text">Prominent</span></label>
      <input id={`prominent-${i}`} type="checkbox" class="input input-sm bg-base-2005" bind:checked={item.prominent}>
    </fieldset>
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <label for={`link-${i}`} class="label w-1/5"><span class="label-text">Link</span></label>
      <input id={`link-${i}`} type="url" class="input input-bordered input-sm flex-1" bind:value={item.link}>
    </fieldset>
    <fieldset class="flex flex-horizontal w-full max-w-md pt-4 gap-2">
      <button on:click={_save} class="btn btn-sm flex-1">Save</button>
      <button on:click={() => _delete(i)} class="btn btn-sm flex-1">Delete</button>
    </fieldset>
  </form>
  {/each}
  {/key}
</section>

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(36ch, 1fr));
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