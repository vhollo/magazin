export const prerender = true

export async function load() {
  return {
    doc: { path: 'keres', title: 'Keresés' },
  }
}
