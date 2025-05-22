<script context="module">
  import { PUBLIC_BASE_URL } from '$env/static/public'
</script>

<script>
  import { ads } from '$lib/ads.js'
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

<section class="grid gap-x-6 gap-y-6 px-4 py-6">
  {#key ads.banners}
  {#each ads.banners as item, i}
  <div class="sm:card sm:card-side card-sm bg-base-100 gap-0 h-min">
    <figure class="bg-base-100 sm:w-1/2 !w-[{item.width}px]">
      <img class="!object-contain mx-auto"
        src={item.img}
        alt="Album" 
        width={item.width}
        />
    </figure>
    
    <form class="form-control card-body sm:w-1/2">
      <fieldset class="fieldset">
        <label for={`title-${i}`} class="input input-sm w-full pl-2 pr-0">Name
        <input id={`title-${i}`} type="text" class="grow bg-base-200 rounded-r pl-2" bind:value={item.title}></label>
      </fieldset>
      <fieldset class="fieldset">
        <label for={`img-${i}`} class="input input-sm w-full pl-2 pr-0">Image
        <input id={`img-${i}`} type="url" class="grow bg-base-200 rounded-r pl-2" bind:value={item.img}></label>
      </fieldset>
      <fieldset class="fieldset">
        <label for={`video-${i}`} class="input input-sm w-full pl-2 pr-0">Video
        <input id={`video-${i}`} type="url" class="grow bg-base-200 rounded-r pl-2" bind:value={item.video}></label>
      </fieldset>
      <fieldset class="fieldset flex">
        <label for={`width-${i}`} class="input input-sm flex-1 py-2">Width
        <input id={`width-${i}`} type="number" class="grow px-1 bg-base-200 w-1/2" bind:value={item.width}></label>
        <!-- <label for={`height-${i}`} class="input flex-1 py-2">Height
        <input id={`height-${i}`} type="number" class="grow px-1 bg-base-200 w-1/2" bind:value={item.height}></label> -->
        <label for={`prominent-${i}`} class="input input-sm flex-0 py-2">
        <input id={`prominent-${i}`} type="checkbox" class="checkbox checkbox-sm" bind:checked={item.prominent}>Pro</label>
      </fieldset>
      <fieldset class="fieldset">
        <label for={`link-${i}`} class="input input-sm w-full pl-2 pr-0">Link
        <input id={`link-${i}`} type="url" class="grow bg-base-200 rounded-r pl-2" bind:value={item.link}></label>
      </fieldset>
      <fieldset class="fieldset flex">
        <button on:click={_save} class="btn btn-sm">Save</button>
        <button on:click={() => _delete(i)} class="btn btn-sm">Delete</button>
      </fieldset>
    </form>
  </div>
  {/each}
  {/key}
</section>

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(32rem, 1fr));
    grid-auto-rows: auto;
    /* grid-auto-flow: dense; */
    /* grid-template-rows: masonry; */
  }
  /* form {
    position: unset;
    min-height: 20ch;
    margin-bottom: 3rem;
  } */
</style>