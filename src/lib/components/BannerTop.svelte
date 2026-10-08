<script module>
  import { onMount, onDestroy } from 'svelte';
  import {
	//crossfade,
	//draw,
	fade,
} from 'svelte/transition'
</script>

<script lang="ts">
import { lazyVideo } from '$lib/lazyVideo.js'

type Banner = {
    name: string;
    prominent?: boolean;
    videoext?: string;
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
  let intervalId: any;
  // The list can change while mounted (client navigation between two pages that the
  // CDN cached before and after a banner sync), so the index is clamped reactively.
  $: if (count >= banners.length) count = 0;
  // let banner: Banner = banners[0] || {}
  // const height = banners[count].height || 200

  function startCounter() {
    clearInterval(intervalId); // Clear any existing interval
    count = 0;
    intervalId = setInterval(() => {
      count = banners.length ? (count + 1) % banners.length : 0;
    }, 14000); // 14 s per banner
  }
  // $: banner = banners[count] || {}
  
  // Start the counter when the component mounts
  onMount(startCounter);

  // Clean up the interval when the component unmounts
  onDestroy(() => {
    clearInterval(intervalId);
  });
</script>

<aside class="bg---base-300">
{#key count}
<a style="aspect-ratio: 960/{banners[count].height || '200'};" class="bg-primary flex flex-0 items-end max-w-fit mt-8 mx-auto overflow-hidden border-y border-gray-200" href={banners[count].link} target={banners[count].link ? '_blank' : '_self'} aria-label={banners[count].name}>

  {#if banners[count].video}
    <!-- No `autoplay`: it would override preload="none" and fetch the video even when
         hidden. lazyVideo sets the src and plays it once it is on screen. -->
    <video
      use:lazyVideo={banners[count].video}
      preload="none"
      transition:fade={{ duration: 500 }}
      poster={banners[count].image || ''}
      width="960"
      height={banners[count].height || '200'}
      muted loop playsinline
    ></video>
  {/if}

  {#if banners[count].image}
    <img 
      loading="lazy"
      in:fade={{ duration: 500 }}
      out:fade={{ duration: 500 }}
      width="960" 
      height={banners[count].height || '200'} 
      src={banners[count].image} 
      alt={banners[count].name} 
    />
  {/if}

</a>
{/key}
<small class="block text-center mx-auto text-xs mb-12">Hirdetés</small>
</aside>