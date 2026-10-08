/**
 * Visibility-gated autoplay Svelte action for banner videos: the video gets its `src`
 * and starts playing (muted, no user gesture) only once it is on screen, and pauses
 * when it scrolls out. A video that is never visible — `display:none` (e.g. the
 * `max-md:hidden` ad rail), below the fold, or inside a hidden/0×0 iframe — is never
 * downloaded.
 *
 * Do NOT put the `autoplay` attribute back on banner videos: per the HTML spec it
 * overrides `preload="none"`, so every video on the page (hidden ones included) is
 * fetched on load. That cost ~5 MB per page view.
 *
 * Usage: `<video use:lazyVideo={url} muted loop playsinline preload="none">`.
 * Used by BannerSide.svelte and BannerTop.svelte.
 *
 * @param {HTMLVideoElement} node
 * @param {string | undefined} url
 */
export function lazyVideo(node, url) {
  let src = url
  let visible = false
  const play = () => {
    if (!src) return
    if (node.getAttribute('src') !== src) node.src = src
    // Muted playback is what browsers allow without a user gesture; set the property
    // too, independent of how the `muted` attribute was rendered.
    node.muted = true
    node.play().catch(() => {})
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visible = entry.isIntersecting
      if (visible) play()
      else if (!node.paused) node.pause()
    }
  })
  io.observe(node)
  return {
    /** @param {string | undefined} next */
    update(next) {
      if (next === src) return
      src = next
      if (visible) play()
      else node.removeAttribute('src')
    },
    destroy() {
      io.disconnect()
    },
  }
}
