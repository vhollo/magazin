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

<!--<aside class="card card-hollow {img.align}">
  <figure class="card-body">-->
  <figure class="{img.align}">
    <img src={img.file} alt="{img.desc}" class:zoom={!!img.zoom} data-theme="nord" style="background-color: {img.bg}" >
    {#if img.desc}
    <figcaption class="">{@html img.desc}</figcaption>
    {/if}
  </figure>
<!--</aside>-->

<!--<style>
</style>-->