/**
 * Article body HTML fixups applied to the CMS string on the way out of Firestore.
 *
 * Regex on the raw string rather than a DOM parser — deliberately. The MODX bodies
 * contain malformed markup (e.g. `<td><th>…</th></td>` inside a `<tr>`), and a
 * parse5/linkedom round-trip would silently "repair" it across ~2300 documents.
 * Rewriting only what we match keeps every other byte identical.
 */

/** Embedded media that makes a body worth showing even without any text. */
const MEDIA_TAG = /<(?:img|iframe|video|audio|table|object|embed)\b/i;

/**
 * Whether a CMS body renders anything — visible text or embedded media. MODX issue
 * and group folders are stored with an empty body (or `<p></p>`-style shells).
 */
export function hasArticleBody(html: string | undefined): boolean {
	if (!html) return false;
	if (MEDIA_TAG.test(html)) return true;
	return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim().length > 0;
}

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

const HEADING_TAG = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
/** Headings inside a recipe block that do not start a new block. */
const RECIPE_SUBHEADING = /^(?:hozzavalok|elkeszites|a recept elkeszitese)\b/;
/** An image: bare, in a `<p>`, or a rendered `[[nagyito]]` figure. */
const IMAGE_ELEMENT = String.raw`(?:<p\b[^>]*>\s*)?(?:<figure\b[^>]*>(?:(?!<\/?figure\b)[\s\S])*<\/figure>|<img\b[^>]*>)\s*(?:<\/p>)?`;
const SIGNATURE_ELEMENT = String.raw`<p\b[^>]*\bclass="[^"]*\balairas\b[^"]*"[^>]*>(?:(?!<\/?p\b)[\s\S])*<\/p>`;
/** One image at the end of a string. */
const TRAILING_IMAGE = new RegExp(`${IMAGE_ELEMENT}\\s*$`, 'i');
/** One element at the end of a recipe block that stays in the article: an image or the signature. */
const TRAILING_KEPT = new RegExp(`(?:${IMAGE_ELEMENT}|${SIGNATURE_ELEMENT})\\s*$`, 'i');

function headingKey(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;|&#160;/gi, ' ')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/** Length of the run of `pattern` matches at the end of `html`. */
function trailingRun(html: string, pattern: RegExp): number {
	let rest = html;
	for (let m = rest.match(pattern); m && m[0].length; m = rest.match(pattern)) {
		rest = rest.slice(0, rest.length - m[0].length);
	}
	return html.length - rest.length;
}

/**
 * Remove the recipes that were split out of a multi-recipe article ("gyűjtőcikk",
 * e.g. cikkek/diabetes/1603/nyari-husitok) from its body — they are shown as recipe
 * cards under the article instead. A block runs from the dish heading (plus the
 * image just before it, which the splitter gives to that recipe) to the next heading
 * of the same or a higher level that is not a "Hozzávalók"/"Elkészítés" sub-heading.
 * Section lead text before the first dish, an image or the `alairas` signature
 * closing a block, and headings matching no recipe title are kept.
 *
 * @param titles the split recipes' titles; a heading may add a "(N darab)" yield.
 */
export function stripSplitRecipeBlocks(html: string, titles: string[]): string {
	if (!html || titles.length === 0) return html;
	const wanted = titles.map(headingKey).filter(Boolean);
	const isDish = (key: string) =>
		wanted.some((t) => key === t || (key.startsWith(`${t} `) && /^\d+ [a-z]+$/.test(key.slice(t.length + 1))));

	const headings = [...html.matchAll(HEADING_TAG)].map((m) => ({
		start: m.index,
		level: Number(m[1]),
		key: headingKey(m[2])
	}));
	const ranges: Array<[number, number]> = [];
	headings.forEach((h, i) => {
		if (!isDish(h.key)) return;
		let j = i + 1;
		while (j < headings.length && (headings[j].level > h.level || RECIPE_SUBHEADING.test(headings[j].key))) j++;
		let end = j < headings.length ? headings[j].start : html.length;
		end -= trailingRun(html.slice(h.start, end), TRAILING_KEPT);
		const start = h.start - trailingRun(html.slice(0, h.start), TRAILING_IMAGE);
		ranges.push([start, end]);
	});
	if (ranges.length === 0) return html;

	let out = '';
	let last = 0;
	for (const [start, end] of ranges) {
		if (start < last) {
			last = Math.max(last, end);
			continue;
		}
		out += html.slice(last, start);
		last = end;
	}
	return out + html.slice(last);
}
