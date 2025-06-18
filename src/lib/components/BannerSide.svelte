<script>
  export let banner
</script>

<a class="w-full block mx-auto" href={banner.link} target={banner.link ? '_blank' : '_self'} aria-label={banner.name}>
  {#if banner.video}
    <video 
      preload="none"
      class="mx--auto w-full"
      poster={banner.image || ''}
      width="300" 
      height="260" 
      muted autoplay loop controls
    >
      <source src={banner.video}
          type='video/mp4'/>
    </video>
  {/if}
  {#if banner.image}
    <img 
      loading="lazy"
      class="mx-auto w-full" 
      width="300" 
      height="260" 
      src={banner.image} 
      alt={banner.name} 
    />
  {/if}
</a>
<small class="block text-center mx-auto text-xs">Hirdetés</small>
