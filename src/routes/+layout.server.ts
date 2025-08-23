// export const prerender = true
import { getSiteConf } from '$lib/siteConf';
// import { allDocs } from '$lib/modx';
import { building } from '$app/environment';
const conf = await getSiteConf();

export async function load({ params, url }) {
  // const doc = {'path': '/'}
  // let docs:object[]
  // if (building) {
  //   docs = allDocs
  // } else {
  //   docs = allDocs.slice(0, 18 * 4)
  // }

  // console.log('load:',docs.length, url.pathname)
  return {conf, path: url.pathname/* , doc, docs */}
}
