import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { db } from '$lib/firebase-admin';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();

		let origin = url.origin;
		if (url.origin.includes('localhost') || url.origin.includes('192.168')) origin = 'https://diabeteshu.netlify.app';
		try {
			// const response = await fetch(`${origin}/forms.html`, {
			const response = await fetch(`${origin}/kviz/form`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: (() => {
					const params = new URLSearchParams();
					for (const [key, value] of formData) {
						if (typeof value === 'string') params.append(key, value);
					}
					return params.toString();
				})()
			});

			if (response.status !== 200) {
				console.log('POST /kviz/form failed: ', response.status);
				return fail(response.status);
			}
		} catch (err) {
			console.log('postFail: ', err);
			return fail(500, { postFail: true, err, location: url.href });
		}

		// write score into firestore-admin at tables/kviz/{kviz.id}/scores/{uid} as { name: name, email: email, score: score, date: date }
		const writeScore = async () => {
			console.log('uid: ', formData.get('uid'))
			const id = formData.get('id');
			if (!id) return;
			const docRef = db.doc(`kviz/${id}/scores/${formData.get('uid')}`);
			await docRef.set({ 'name': formData.get('name'), 'email': formData.get('email'), 'score': formData.get('score'), 'date': formData.get('date') }, { merge: true });
		}

		await writeScore();

		// Return success - Netlify will handle the form processing
		console.log('Form submitted:', Object.fromEntries(formData));
		return { success: true };
	}
}

// in the load function get the id from the url
export const load: PageServerLoad = async ({ params, parent }) => {
	const id = params.id
	const { kvizzes } = await parent()
	const kviz = kvizzes?.find((k: { id: string }) => k.id === id)
	if (!kviz) error(404, 'Kvíz nem található')
	return { id, kviz }
}