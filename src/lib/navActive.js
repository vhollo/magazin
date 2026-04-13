// @ts-check
/** True when current URL path equals `href` or continues under it (e.g. /kviz/quiz-id → /kviz). External URLs: exact match only.
 * @param {string | null | undefined} current
 * @param {unknown} href
 */
export function navLinkActive(current, href) {
	if (href == null || typeof href !== 'string') return false
	if (href.startsWith('http://') || href.startsWith('https://')) return `${current}` === href
	if (href.startsWith('#')) return false
	let c = `${current ?? ''}`
	if (!c.startsWith('/')) c = `/${c}`
	let h = href.startsWith('/') ? href : `/${href}`
	if (h === '/') return c === '/' || c === ''
	return c === h || c.startsWith(`${h}/`)
}

/** True when current route matches any link in a dropdown (parent highlights with the active child).
 * @param {string | null | undefined} current
 * @param {Record<string, string> | null | undefined} group
 */
export function navSubgroupActive(current, group) {
	if (group == null || typeof group !== 'object') return false
	return Object.keys(group).some((k) => navLinkActive(current, group[k]))
}
