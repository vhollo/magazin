/**
 * Dense-masonry Svelte action: derives a grid item's `grid-row-end` span from its
 * rendered height so a CSS grid packs like masonry. Reads `grid-auto-rows` +
 * `row-gap` from the parent (CSS stays the source of truth) and re-measures on
 * resize / image `load`, batched to one write per animation frame.
 *
 * Container (once JS is active): `grid-auto-rows: <small px>` + `grid-auto-flow: dense`;
 * each item: `align-self: start`. Used by Cards.svelte and ReceptsarokWidget.svelte.
 *
 * @param {HTMLElement} node
 */
export function masonryItem(node) {
  let ROW = 4
  let GAP = 0
  const parent = node.parentElement
  if (parent) {
    const cs = getComputedStyle(parent)
    ROW = parseFloat(cs.gridAutoRows) || ROW
    GAP = parseFloat(cs.rowGap) || GAP
  }
  let lastSpan = 0
  let raf = 0
  const measure = () => {
    raf = 0
    const h = node.getBoundingClientRect().height
    if (!h) return
    const span = Math.max(1, Math.ceil((h + GAP) / (ROW + GAP)))
    if (span !== lastSpan) {
      lastSpan = span
      node.style.gridRowEnd = `span ${span}`
    }
  }
  // Coalesce bursts (many images resolving at once) into one write per frame.
  const setSpan = () => {
    if (!raf) raf = requestAnimationFrame(measure)
  }
  measure() // initial span synchronously, before first paint
  const ro = new ResizeObserver(setSpan)
  ro.observe(node)
  const imgs = Array.from(node.querySelectorAll('img'))
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener('load', setSpan)
  })
  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      imgs.forEach((img) => img.removeEventListener('load', setSpan))
    },
  }
}
