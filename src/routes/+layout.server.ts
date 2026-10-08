import { getSiteConf } from '$lib/siteConf';
import { getSiteStats } from '$lib/magazine/firestore';
import { getReceptsarokHome } from '$lib/receptsarokFirestore';

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
  // Critical shell data: conf and path. conf (SEO fields + banners) comes from the
  // same meta/stats read as the counts (getSiteStats: one coalesced, 60 s cached
  // read), so it costs nothing extra. Read here, not once at module load, so a
  // „Bannerek … frissítése” sync reaches newly rendered pages without a redeploy.
  // The counts are non-critical (they only feed the <Search> placeholder and
  // PaywallCTA copy), so they are the natural thing to STREAM on a cold render.
  //
  // COLD-RENDER STREAMING — prepared, not yet enabled. To stop the shell from
  // blocking on the counts' Firestore read, return the promise unawaited:
  //     return { conf, path: url.pathname, doc: { path: '/' }, counts: resolveSiteCounts() }
  // then consume it lazily at the ~11 call sites (mostly <Search>, PaywallCTA)
  // with `{#await data.counts then c}…{/await}` (fallback: 0/0). Caveat: conf now
  // comes from the same meta/stats read, so streaming only the counts no longer
  // takes that read off the shell's critical path. Left awaited for
  // now so every existing `data.articleCount` reader keeps working unchanged.
  const [conf, counts] = await Promise.all([getSiteConf(), resolveSiteCounts()])
  return {
    conf,
    path: url.pathname,
    doc: { path: '/' },
    ...counts,
  }
}
