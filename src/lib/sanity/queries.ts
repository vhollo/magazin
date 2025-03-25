import type { PortableTextBlock } from '@portabletext/types';
import type { ImageAsset, Slug } from '@sanity/types';
import groq from 'groq';

export const postQuery = groq`*[_type == "post" && slug.current == $slug][0]`;
export const postsQuery = groq`*[_type == "post" && defined(slug.current)] | order(_createdAt desc)`;

export const quizQuery = groq`*[_type == "quiz" && slug.current == $slug][0]`;
export const quizzesQuery = groq`*[_type == "quiz" && defined(slug.current)] | order(_createdAt desc)`;

interface Question {
	question: string;
	help: string;
	answers: string[];
}

export interface Quiz {
	_type: 'quiz';
	_createdAt: string;
	title?: string;
	slug: Slug;
	excerpt?: string;
	mainImage?: ImageAsset;
	body: PortableTextBlock[];
	questions?: Array<Question>;
}
