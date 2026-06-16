import { getSiteConf } from '$lib/siteConf';
import { getSiteStats } from '$lib/magazine/firestore';
import { getReceptsarokHome } from '$lib/receptsarokFirestore';

const conf = await getSiteConf();

export async function load({ url }) {
  const doc = { path: '/' }

  // One meta/stats read covers all counts; rs-home is only consulted while
  // sync:rs-collections has not merged the recipe counts yet.
  const stats = await getSiteStats()
  let { recipeCount, freeCount } = stats
  if (!Number.isFinite(recipeCount) || !Number.isFinite(freeCount)) {
    const rsHome = await getReceptsarokHome()
    recipeCount = rsHome.totalRecipes
    freeCount = rsHome.totalFree
  }

  return {
    conf,
    path: url.pathname,
    doc,
    articleCount: stats.articleCount,
    recipeCount,
    freeCount,
  }
}
