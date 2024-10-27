<script>
  export let img
  //console.log(img)
</script>

<figure class="{img.align}">
  <img src={img.file} alt={img.desc} class:zoom={!!img.zoom}>
  <figcaption>{@html img.desc}</figcaption>
</figure>