import { getSiteConf, getRecipes } from '$lib/siteConf';
import { getMagazineStats } from '$lib/magazine/firestore';
const conf = await getSiteConf();

export async function load({ url }) {
  const doc = { path: '/' }

  const [stats, recipes] = await Promise.all([
    getMagazineStats(),
    getRecipes(),
  ])

  const recipeCount = recipes.filter((r: { published?: boolean }) => r.published !== false).length
  const freeCount = recipes.filter((r: { published?: boolean; free?: boolean }) => r.published !== false && r.free === true).length

  return {
    conf,
    path: url.pathname,
    doc,
    articleCount: stats.articleCount,
    recipeCount,
    freeCount,
  }
}
