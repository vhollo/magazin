import { allDocs } from "$lib/modx"

export const prerender = true
export const entries = () => {
  return allDocs.map(d => ({ path: `${d.path}`}))
}
