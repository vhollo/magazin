<script>
  import Card from '$lib/components/Card.svelte'
  export let docs
</script>

<section class="g-rid gap-x-8 gap-y-16 px-6 py-12">
  {#each docs as doc}
    {@const card = {id: doc.id, img: doc.tvs.img, pos: doc.tvs.pos, path: doc.path, desc: doc.description, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, content: doc.content, tag: doc.tvs.tag}}
    <Card {card}/>
  {/each}
</section>
<style>
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(28ch, 1fr));
    grid-auto-rows: minmax(10ch, auto);
    grid-auto-flow: dense;
  }
  </style>
  