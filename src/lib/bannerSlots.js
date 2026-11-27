/**
 * Banners among related cards (`Cards.svelte`, `ReceptsarokWidget.svelte`) and the
 * first mobile banner sized like one of them.
 *
 * Slot rule (the one `Cards` has always used): with cards at CSS `order` 0, 1, 2, …,
 * banner k gets `order` k·distance + 1. A banner and the card with the same `order`
 * keep DOM order (cards first), so banners land after the 2nd card, then every
 * `distance` cards. Only slots up to the last card are used.
 */

/**
 * Number of banner slots a list of `cardCount` cards offers.
 * @param {number} cardCount
 * @param {number} distance `conf.ads_distance`
 * @returns {number}
 */
export function bannerSlotCount(cardCount, distance) {
  if (!(cardCount > 0) || !(distance > 0)) return 0
  return Math.floor((cardCount - 1) / distance) + 1
}

/**
 * CSS `order` of banner slot `k` (0-based).
 * @param {number} k
 * @param {number} distance
 */
export const bannerSlotOrder = (k, distance) => k * distance + 1

/**
 * Place every banner exactly once among `cardCount` cards: into the slots first, and
 * those that find no slot (a short list) after the last card, in list order.
 * @template T
 * @param {T[]} banners
 * @param {number} cardCount
 * @param {number} distance
 * @returns {{ banner: T, order: number }[]}
 */
export function placeEachOnce(banners, cardCount, distance) {
  const slots = bannerSlotCount(cardCount, distance)
  return banners.map((banner, k) => ({
    banner,
    // Cards use order 0 … cardCount-1, so cardCount + j sits after all of them.
    order: k < slots ? bannerSlotOrder(k, distance) : cardCount + (k - slots),
  }))
}

/**
 * Svelte action: give a banner wrapper the width of ONE track of the related-card
 * grids — `grid-template-columns: repeat(auto-fill, minmax(<min>, 1fr))` with column
 * gap `<gap>` — laid out across the parent's content box. Centre it with `mx-auto`.
 * On a phone that is one column (= the full content width, which is also the SSR
 * width), so nothing shifts on hydration; from ~2 columns up it is one cell wide.
 *
 * @param {HTMLElement} node
 * @param {{ min?: string, gap?: string }} [options]
 */
export function gridCellWidth(node, options = {}) {
  let { min = '24ch', gap = '1.5rem' } = options
  const parent = node.parentElement
  if (!parent) return {}

  // Lengths resolved in the node's own font (ch depends on it), like the grids'.
  const toPx = (/** @type {string} */ length) => {
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;height:0;width:${length}`
    node.appendChild(probe)
    const px = probe.getBoundingClientRect().width
    probe.remove()
    return px
  }

  const update = () => {
    const cs = getComputedStyle(parent)
    const width = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    if (!(width > 0)) return
    const track = toPx(min)
    const g = toPx(gap)
    const columns = Math.max(1, Math.floor((width + g) / (track + g)))
    node.style.width = `${(width - (columns - 1) * g) / columns}px`
  }

  update()
  const ro = new ResizeObserver(update)
  ro.observe(parent)
  return {
    /** @param {{ min?: string, gap?: string }} [next] */
    update(next = {}) {
      ;({ min = '24ch', gap = '1.5rem' } = next)
      update()
    },
    destroy() {
      ro.disconnect()
    },
  }
}
