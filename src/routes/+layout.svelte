<script lang="ts">
	import '../app.css'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'

  import { page, navigating } from '$app/state';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();

  import { onMount } from 'svelte';
  import { initAuth } from '$lib/auth';
  onMount(() => {
    initAuth();
  });

  // import { page } from '$app/stores'
  // import { goto } from '$app/navigation'

  // console.log(data.path)
  </script>

<!-- Global navigation progress bar: gives immediate feedback that a page has
     started loading (e.g. a cold serverless instance fetching /kviz data live). -->
{#if navigating.to}
  <div class="nav-progress" role="status" aria-live="polite">
    <span class="sr-only">Betöltés folyamatban…</span>
  </div>
{/if}

<Nav actual={data.path}/>

{@render children()}
<Footer/>

<style>
  .nav-progress {
    position: fixed;
    inset: 0 0 auto 0;
    height: 3px;
    z-index: 9999;
    overflow: hidden;
    background-color: color-mix(in oklch, var(--color-primary) 20%, transparent);
  }
  .nav-progress::after {
    content: '';
    position: absolute;
    inset-block: 0;
    left: 0;
    width: 40%;
    background-color: var(--color-primary);
    animation: nav-progress-slide 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  @keyframes nav-progress-slide {
    0% { left: -40%; }
    100% { left: 100%; }
  }
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  /* Reduced motion: swap the sliding segment for a gentle full-width pulse. */
  @media (prefers-reduced-motion: reduce) {
    .nav-progress::after {
      width: 100%;
      animation: nav-progress-pulse 1.2s ease-in-out infinite;
    }
    @keyframes nav-progress-pulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 1; }
    }
  }
</style>
