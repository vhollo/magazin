export const prerender = true
import { getSiteConf } from '$lib/siteConf';
const conf = await getSiteConf();

export async function load({ /* params,  */url }) {
  // console.log(url)
  return {conf, path: url.pathname}
}
