import { getSiteConf } from '$lib/siteConf';
import { getMagazineStats } from '$lib/magazine/firestore';
import { getReceptsarokHome } from '$lib/receptsarokFirestore';

const conf = await getSiteConf();

export async function load({ url }) {
  const doc = { path: '/' }

  const [stats, rsHome] = await Promise.all([
    getMagazineStats(),
    getReceptsarokHome(),
  ])

  return {
    conf,
    path: url.pathname,
    doc,
    articleCount: stats.articleCount,
    recipeCount: rsHome.totalRecipes,
    freeCount: rsHome.totalFree,
  }
}
