/**
 * Article body HTML fixups applied to the CMS string on the way out of Firestore.
 *
 * Regex on the raw string rather than a DOM parser — deliberately. The MODX bodies
 * contain malformed markup (e.g. `<td><th>…</th></td>` inside a `<tr>`), and a
 * parse5/linkedom round-trip would silently "repair" it across ~2300 documents.
 * Rewriting only what we match keeps every other byte identical.
 */

/** Float tokens a CMS table may carry; the wrapper takes over the floating. */
const FLOAT_LEFT = ['left', 'boxleft'];
const FLOAT_RIGHT = ['right', 'boxright'];

const TABLE_TAG = /<(\/?)table\b[^>]*>/gi;
const CLASS_ATTR = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
/** A `.table-scroll` opening tag immediately before the table we are looking at. */
const ALREADY_WRAPPED = /<div\b[^>]*\bclass="[^"]*\btable-scroll\b[^"]*"[^>]*>\s*$/i;

/**
 * The float MOVES to the wrapper — it is not copied. Left on the table it would
 * keep matching `article table.right { float: right; margin-top: .75em }` and the
 * generic `.right { width: calc(50% - 1rem) !important; margin-left: 1rem !important }`,
 * fighting the wrapper that now owns the geometry.
 *
 * `boxleft`/`boxright` must not land on the wrapper verbatim either: `app.css`
 * styles `article :not(table).boxleft/.boxright` as a blue daisyUI primary card,
 * so the wrapper would turn into one. `.left`/`.right` are the plain float classes
 * with no card styling — that is what the wrapper gets.
 */
function takeFloat(table: string): { table: string; floatClass: string } {
	const close = table.indexOf('>') + 1;
	const openTag = table.slice(0, close);
	const m = openTag.match(CLASS_ATTR);
	if (!m) return { table, floatClass: '' };

	const tokens = (m[1] ?? m[2] ?? '').split(/\s+/).filter(Boolean);
	const floatClass = tokens.some((t) => FLOAT_LEFT.includes(t))
		? ' left'
		: tokens.some((t) => FLOAT_RIGHT.includes(t))
			? ' right'
			: '';
	if (!floatClass) return { table, floatClass };

	const kept = tokens.filter((t) => !FLOAT_LEFT.includes(t) && !FLOAT_RIGHT.includes(t));
	const quote = m[1] !== undefined ? '"' : "'";
	// Drop the attribute entirely rather than leaving `class=""` behind.
	const replacement = kept.length ? ` class=${quote}${kept.join(' ')}${quote}` : '';
	const rewritten = openTag.replace(m[0], replacement);
	return { table: rewritten + table.slice(close), floatClass };
}

function wrapOne(table: string): string {
	const moved = takeFloat(table);
	return (
		`<div class="table-scroll${moved.floatClass}" role="region"` +
		` aria-label="Táblázat, vízszintesen görgethető" tabindex="0">${moved.table}</div>`
	);
}

/**
 * Wrap each outermost `<table>` in a horizontally scrollable box, mirroring the
 * wrapper/table pair `NutritionTable.svelte` already renders on recipe pages.
 *
 * Only the outermost tables are wrapped (a depth counter tracks nesting), the
 * table's own markup is copied through untouched, and unbalanced tags degrade to
 * "no wrap" rather than corrupting the body. Idempotent: a table already inside a
 * `.table-scroll` wrapper is left alone.
 */
export function wrapArticleTables(html: string): string {
	if (!html || !/<table\b/i.test(html)) return html;

	let out = '';
	let last = 0;
	let depth = 0;
	let start = -1;
	let match: RegExpExecArray | null;

	TABLE_TAG.lastIndex = 0;
	while ((match = TABLE_TAG.exec(html))) {
		const isClosing = match[1] === '/';
		if (!isClosing) {
			if (depth++ === 0) start = match.index;
			continue;
		}
		if (depth === 0) continue; // stray </table> — emit verbatim
		if (--depth > 0) continue; // still inside a nested table

		const end = match.index + match[0].length;
		const table = html.slice(start, end);
		const before = html.slice(last, start);
		out += before + (ALREADY_WRAPPED.test(before) ? table : wrapOne(table));
		last = end;
	}

	// An unclosed <table> leaves `depth > 0`; its bytes are in the tail below.
	return out + html.slice(last);
}
