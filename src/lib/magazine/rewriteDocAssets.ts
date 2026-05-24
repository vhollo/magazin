import { resolveAssetUrl, rewriteModxAssetHtml } from '$lib/assetUrl';
import type { MagazineArticle, CollectionDoc } from '$lib/magazine/firestore';
import type { ThinCard } from '$lib/modx/collections';

type CardImg = { src?: string; [key: string]: unknown };

function rewriteImg(img: unknown): unknown {
	if (!img || typeof img !== 'object') return img;
	const o = img as CardImg;
	if (typeof o.src !== 'string') return img;
	return { ...o, src: resolveAssetUrl(o.src) };
}

function rewriteHtmlField(value: string | undefined): string | undefined {
	if (!value) return value;
	return rewriteModxAssetHtml(value);
}

export function rewriteThinCard(card: ThinCard): ThinCard {
	return {
		...card,
		img: rewriteImg(card.img) as ThinCard['img'],
		video: rewriteHtmlField(card.video),
		ellipsis: rewriteHtmlField(card.ellipsis)
	};
}

export function rewriteMagazineArticle(doc: MagazineArticle): MagazineArticle {
	const tv = doc.tv ? { ...doc.tv } : doc.tv;
	if (tv?.ogi) tv.ogi = resolveAssetUrl(tv.ogi);
	if (tv?.szerzo) {
		tv.szerzo = tv.szerzo.map((s) => ({
			...s,
			full: s.full ? rewriteModxAssetHtml(s.full) : s.full
		}));
	}

	return {
		...doc,
		img: rewriteImg(doc.img) as MagazineArticle['img'],
		content: rewriteHtmlField(doc.content as string | undefined),
		video: rewriteHtmlField(doc.video),
		introtext: rewriteHtmlField(doc.introtext as string | undefined),
		description: rewriteHtmlField(doc.description as string | undefined),
		ellipsis: rewriteHtmlField(doc.ellipsis),
		tv,
		relatedCards: doc.relatedCards?.map(rewriteThinCard)
	};
}

export function rewriteCollectionDoc(col: CollectionDoc): CollectionDoc {
	return {
		...col,
		cards: col.cards?.map(rewriteThinCard) ?? []
	};
}
