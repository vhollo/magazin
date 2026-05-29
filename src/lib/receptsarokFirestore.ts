/**
 * SSR readers for Receptsarok + Patika UI collections.
 *
 * Pattern mirrors $lib/magazine/firestore: every route reads ONE precomputed
 * Firestore doc that the sync worker writes (one `.get()` per request).
 * If the doc is missing (sync not run yet), each helper falls back to the
 * existing `getRecipes()` / `getPatika()` JSON pipeline so the site keeps
 * working during the transition.
 */
import { db } from '$lib/firebase-admin';
import type {
	Category,
	Recipe,
	RecipeLayoutEntry,
	RecipeTeaser,
} from '$lib/receptsarok';
import {
	isRecipeFree,
	recipeSlug,
	stripRecipeGatedFields,
	toLayoutRecipe,
	toTeaser,
} from '$lib/receptsarok';
import { getCategories, getPatika, getRecipes } from '$lib/siteConf';

const COLLECTIONS = 'collections';

export const RS_HOME_DOC = 'rs-home';
export const RS_TEASERS_DOC = 'rs-teasers';
export const PATIKA_DOC = 'patika';

/** `collections/rs-{categoryId}` */
export const rsCategoryDocId = (categoryId: string): string =>
	`rs-${categoryId}`;

export type ReceptsarokHomeDoc = {
	categories: Category[];
	totalRecipes: number;
	totalFree: number;
	freeCountsByCategory: Record<string, number>;
	generatedAt?: string;
};

export type ReceptsarokCategoryDoc = {
	category: string;
	cards: RecipeLayoutEntry[];
	count: number;
	generatedAt?: string;
};

export type ReceptsarokTeasersDoc = {
	teasersByKey: Record<string, RecipeTeaser>;
	generatedAt?: string;
};

export type Patika = {
	patika: string;
	irsz?: string;
	varos?: string;
	cim?: string;
	email?: string;
	cegnev?: string;
};

export type PatikaDoc = {
	patikas: Patika[];
	count: number;
	generatedAt?: string;
};

type RecipePublished = Recipe & { published?: boolean };
const isPublished = (r: RecipePublished): boolean => r.published !== false;

async function readDoc<T>(docId: string): Promise<T | null> {
	const snap = await db.collection(COLLECTIONS).doc(docId).get();
	if (!snap.exists) return null;
	return snap.data() as T;
}

/**
 * `/receptsarok` grid: 7 categories with cover + per-category recipe & free counts.
 *
 * Falls back to in-process aggregation from `getRecipes()` + `getCategories()`
 * when `collections/rs-home` has not been built yet.
 */
export async function getReceptsarokHome(): Promise<ReceptsarokHomeDoc> {
	const stored = await readDoc<ReceptsarokHomeDoc>(RS_HOME_DOC);
	if (stored && Array.isArray(stored.categories)) return stored;
	return buildReceptsarokHome();
}

export async function buildReceptsarokHome(): Promise<ReceptsarokHomeDoc> {
	const [allRecipes, categories] = await Promise.all([
		getRecipes() as Promise<Recipe[]>,
		getCategories() as Promise<Category[]>,
	]);

	const published = allRecipes.filter(isPublished);

	const recipeCounts: Record<string, number> = {};
	const freeCountsByCategory: Record<string, number> = {};
	let totalFree = 0;
	for (const r of published) {
		recipeCounts[r.category] = (recipeCounts[r.category] || 0) + 1;
		if (isRecipeFree(r)) {
			freeCountsByCategory[r.category] = (freeCountsByCategory[r.category] || 0) + 1;
			totalFree += 1;
		}
	}

	const enrichedCategories: Category[] = categories.map((cat) => ({
		...cat,
		recipeCount: recipeCounts[cat.id] || 0,
	}));

	return {
		categories: enrichedCategories,
		totalRecipes: published.length,
		totalFree,
		freeCountsByCategory,
	};
}

/**
 * `/receptsarok/[category]` list: thin recipe cards for a single category.
 *
 * Each card is a `RecipeLayoutEntry` (teaser + ingredientNames + searchTerms,
 * no full ingredients or instructions).
 */
export async function getReceptsarokCategory(
	categoryId: string
): Promise<ReceptsarokCategoryDoc> {
	const stored = await readDoc<ReceptsarokCategoryDoc>(rsCategoryDocId(categoryId));
	if (stored && Array.isArray(stored.cards)) return stored;
	return buildReceptsarokCategory(categoryId);
}

export async function buildReceptsarokCategory(
	categoryId: string
): Promise<ReceptsarokCategoryDoc> {
	const allRecipes = (await getRecipes()) as Recipe[];
	const cards = allRecipes
		.filter(isPublished)
		.filter((r) => r.category === categoryId)
		.map(toLayoutRecipe);
	return {
		category: categoryId,
		cards,
		count: cards.length,
	};
}

/**
 * `/keres` shell: every published recipe's teaser keyed by `${year}/${id}`.
 *
 * Used to enrich client-side MiniSearch hits with recipe metadata.
 */
export async function getReceptsarokTeasers(): Promise<ReceptsarokTeasersDoc> {
	const stored = await readDoc<ReceptsarokTeasersDoc>(RS_TEASERS_DOC);
	if (stored && stored.teasersByKey && Object.keys(stored.teasersByKey).length > 0) {
		return stored;
	}
	return buildReceptsarokTeasers();
}

export async function buildReceptsarokTeasers(): Promise<ReceptsarokTeasersDoc> {
	const recipes = (await getRecipes()) as Recipe[];
	const teasersByKey: Record<string, RecipeTeaser> = {};
	for (const r of recipes) {
		if (!isPublished(r)) continue;
		teasersByKey[`${r.year}/${r.id}`] = toTeaser(r);
	}
	return { teasersByKey };
}

/**
 * `/receptsarok/[year]/[id]` detail: single recipe via direct doc lookup.
 *
 * Existing `sync-recipes-to-firestore.mjs` already keys recipes as
 * `recipes/{year}-{id}` (see `recipeSlug()`), so we can `get()` in O(1).
 *
 * Returns gated/teaser-only form when the recipe is not free, so the SSR
 * payload never leaks ingredients/instructions to unauthenticated visitors.
 */
export type RecipeDetailResult =
	| { ok: true; recipe: Recipe; isFree: boolean }
	| { ok: false };

export async function getReceptsarokRecipe(
	year: number,
	id: string
): Promise<RecipeDetailResult> {
	if (!Number.isFinite(year)) return { ok: false };

	const direct = await db
		.collection('recipes')
		.doc(recipeSlug({ year, id }))
		.get();

	let raw: Recipe | null = direct.exists ? (direct.data() as Recipe) : null;

	if (!raw) {
		const all = (await getRecipes()) as Recipe[];
		raw = all.find((r) => r.year === year && r.id === id) ?? null;
	}

	if (!raw || (raw as RecipePublished).published === false) return { ok: false };

	const isFree = isRecipeFree(raw);
	const withFree: Recipe = { ...raw, free: isFree };
	const recipe = isFree ? withFree : stripRecipeGatedFields(withFree);
	return { ok: true, recipe, isFree };
}

/**
 * `/patika` list: aggregated single doc with every pharmacy entry.
 *
 * Falls back to `getPatika()` JSON when `collections/patika` is missing.
 */
export async function getPatikaCollection(): Promise<PatikaDoc> {
	const stored = await readDoc<PatikaDoc>(PATIKA_DOC);
	if (stored && Array.isArray(stored.patikas)) return stored;
	const patikas = (await getPatika()) as Patika[];
	return { patikas, count: patikas.length };
}
