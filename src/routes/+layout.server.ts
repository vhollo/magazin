import { getSiteConf, getRecipes } from '$lib/siteConf';
import { listedDocs } from '$lib/modx';
// import { building } from '$app/environment';
const conf = await getSiteConf();

export async function load({ params, url }) {
  const doc = {'path': '/'}
  let docs:object[]
  // if (building) {
  //   docs = allDocs
  // } else {
    docs = listedDocs.slice(0, 18 * 4)
  // }

  const recipes = await getRecipes()
  const recipeCount = recipes.filter((r: { published?: boolean }) => r.published !== false).length
  const freeCount = recipes.filter((r: { published?: boolean; free?: boolean }) => r.published !== false && r.free === true).length
  // console.log('load:',docs.length, url.pathname)
  return {
    conf,
    path: url.pathname,
    doc,
    docs,
    count: listedDocs.length,
    articleCount: listedDocs.length,
    recipeCount,
    freeCount,
  }
}
