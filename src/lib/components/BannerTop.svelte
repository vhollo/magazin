<script context="module">
  import { onMount, onDestroy } from 'svelte';
  import {
	//crossfade,
	//draw,
	fade,
} from 'svelte/transition'
</script>

<script lang="ts">
type Banner = {
    name: string;
    prominent?: boolean;
    // related_banners: EntityReference[];
    link?: string;
    video?: string;
    image?: string;
    height?: number;
    starts_on?: Date;
    expires_on?: Date;
}

export let banners: Banner[] = []
  // console.log(banners)
  let count = 0;
  const n = banners.length - 1;
  let intervalId: any;
  let banner: Banner = banners[0] || {}
  const height = banners[count].height || 200

  function startCounter() {
    clearInterval(intervalId); // Clear any existing interval
    count = 0;
    intervalId = setInterval(() => {
      count++;
      if (count > n) {
        count = 0;
      }
      // console.log(count)
      // banner = banners[count] || {}
      setTimeout(() => {
      }, 1000); // Set banner back after 1 second
    }, 14000); // 10000 milliseconds = 10 seconds
  }
  $: banner = banners[count] || {}
  
  // Start the counter when the component mounts
  onMount(startCounter);

  // Clean up the interval when the component unmounts
  onDestroy(() => {
    clearInterval(intervalId);
  });
</script>

{#key count}
<a style="aspect-ratio: 960/{height};" class="flex flex-0 items-end max-w-fit mt-16 mx-auto overflow-hidden" href={banners[count].link} target={banners[count].link ? '_blank' : '_self'} aria-label={banners[count].name}>

  {#if banners[count].video}
    <video 
      class=""
      transition:fade={{ duration: 500 }}
      poster={banners[count].image || ''}
      width="960" 
      height={height} 
      muted autoplay loop
    >
      <source src={banners[count].video}
          type='video/mp4'/>
    </video>
  {/if}

  {#if banners[count].image}
    <img 
      in:fade={{ duration: 500 }}
      out:fade={{ duration: 500 }}
      class="mx-auto w--full" 
      width="960" 
      height={height} 
      src={banners[count].image} 
      alt={banners[count].name} 
    />
  {/if}

</a>
{/key}
<small class="block text-center mx-auto text-xs">Hirdetés</small>
