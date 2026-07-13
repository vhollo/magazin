import { getSiteConf } from '$lib/siteConf';
import { getSiteStats } from '$lib/magazine/firestore';
import { getReceptsarokHome } from '$lib/receptsarokFirestore';

const conf = await getSiteConf();

// One meta/stats read (TTL-cached in getSiteStats) covers all counts; rs-home is
// only consulted while sync:rs-collections has not merged the recipe counts yet.
// Kept as a single seam so cold-render streaming is a one-line flip (see load()).
async function resolveSiteCounts() {
  const stats = await getSiteStats()
  let { recipeCount, freeCount } = stats
  if (!Number.isFinite(recipeCount) || !Number.isFinite(freeCount)) {
    const rsHome = await getReceptsarokHome()
    recipeCount = rsHome.totalRecipes
    freeCount = rsHome.totalFree
  }
  return { articleCount: stats.articleCount, recipeCount, freeCount }
}

export async function load({ url }) {
  // Critical shell data (conf, path) is cached/synchronous → returns immediately.
  // The counts are non-critical (they only feed the <Search> placeholder and
  // PaywallCTA copy), so they are the natural thing to STREAM on a cold render.
  //
  // COLD-RENDER STREAMING — prepared, not yet enabled. To stop the shell from
  // blocking on the counts' Firestore read, return the promise unawaited:
  //     return { conf, path: url.pathname, doc: { path: '/' }, counts: resolveSiteCounts() }
  // then consume it lazily at the ~11 call sites (mostly <Search>, PaywallCTA)
  // with `{#await data.counts then c}…{/await}` (fallback: 0/0). Left awaited for
  // now so every existing `data.articleCount` reader keeps working unchanged.
  const counts = await resolveSiteCounts()
  return {
    conf,
    path: url.pathname,
    doc: { path: '/' },
    ...counts,
  }
}
