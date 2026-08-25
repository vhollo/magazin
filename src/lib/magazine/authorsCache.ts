import { db } from '$lib/firebase-admin';
import type { Author } from '$lib/authors';

type AuthorsSnapshot = { authors: Author[]; bySlug: Map<string, Author> };

// Same shape as getSiteStats' cache: the aggregate is one document, every article
// page needs it, and a minute-stale byline is harmless. Per serverless instance.
const AUTHORS_TTL_MS = 60_000;
let cache: { data: AuthorsSnapshot; ts: number } | null = null;
let inflight: Promise<AuthorsSnapshot> | null = null;

async function fetchAuthors(): Promise<AuthorsSnapshot> {
	const snap = await db.collection('collections').doc('authors').get();
	const raw = snap.exists ? snap.get('authors') : null;
	const authors: Author[] = Array.isArray(raw) ? raw : [];
	return { authors, bySlug: new Map(authors.map((author) => [author.slug, author])) };
}

/** The whole author list — one cached Firestore read serves every consumer. */
export async function getAuthors(): Promise<AuthorsSnapshot> {
	if (cache && Date.now() - cache.ts < AUTHORS_TTL_MS) return cache.data;
	if (inflight) return inflight;
	inflight = fetchAuthors()
		.then((data) => {
			cache = { data, ts: Date.now() };
			return data;
		})
		.catch((error) => {
			console.error('Error getting authors:', error);
			// A byline degrades to the plain name rather than failing the page.
			return cache?.data ?? { authors: [], bySlug: new Map<string, Author>() };
		})
		.finally(() => {
			inflight = null;
		});
	return inflight;
}

/** Records for a doc's `authorSlugs`, in the doc's own order; unknown slugs drop out. */
export async function getAuthorsBySlugs(slugs: string[]): Promise<Author[]> {
	if (!slugs.length) return [];
	const { bySlug } = await getAuthors();
	return slugs.map((slug) => bySlug.get(slug)).filter((author): author is Author => !!author);
}

/** One author for the profile page; `null` when the slug is unknown or unpublished. */
export async function getAuthor(slug: string): Promise<Author | null> {
	const { bySlug } = await getAuthors();
	const author = bySlug.get(slug);
	if (!author || author.published === false) return null;
	return author;
}

/** Every published author, name-sorted — the `/szerzok` listing. */
export async function getPublishedAuthors(): Promise<Author[]> {
	const { authors } = await getAuthors();
	return authors
		.filter((author) => author.published !== false)
		.sort((a, b) => String(a.name).localeCompare(String(b.name), 'hu'));
}
