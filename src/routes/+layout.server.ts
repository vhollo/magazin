// export const prerender = true
import { getSiteConf } from '$lib/siteConf';
import { allDocs } from '$lib/modx';
const conf = await getSiteConf();

export async function load({ params, url }) {
  const doc = {'path': '/'}
  let docs:object[] = allDocs//.slice(0, 18 * 4)
  console.log('load:',docs.length, params.path, url.pathname)
  return {conf, path: url.pathname, doc, docs}
}
