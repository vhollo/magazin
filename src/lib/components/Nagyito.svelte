<script>
// @ts-nocheck

  export let img
/*  let kep
  $: (kep) => {
    console.log(kep)
    if (document.body.requestFullscreen || document.body.webkitRequestFullscreen || document.body.mozRequestFullScreen) {
      // If there is a fullscreen element, exit full screen.
      document.exitFullscreen()
      return
    }
    // Make the .element div fullscreen.
    document.querySelector(e.target).requestFullscreen();

  }
*/</script>

<aside class="card card-compact bg-base-200 {img.align}">
  <figure class="card-body">
    <img src={img.file} alt="{img.desc}" class:zoom={!!img.zoom}>
    {#if img.desc}
    <figcaption class="">{@html img.desc}</figcaption>
    {/if}
  </figure>
  <!--{#if img.desc}
  <p class=" not-prose italic">
    {@html img.desc}
  </p>
  {/if}-->
</aside>

<!--<style>
</style>-->