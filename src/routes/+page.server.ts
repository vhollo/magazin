// export const prerender = true
import { allDocs } from '$lib/modx';
// import { building } from '$app/environment';

export const entries = () => {
  return allDocs.map(d => ({ path: `${d.path}`}))
}

/* export async function load() {
  const doc = {'path': '/'}
  let docs:object[]
  if (building) {
    docs = allDocs
  } else {
    docs = allDocs.slice(0, 18 * 4)
  }
  console.log('load homepage:',docs.length)
  return {doc, docs}
} */
