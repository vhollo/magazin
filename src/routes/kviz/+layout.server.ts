import type { email } from '$lib/authStore';
import type { LayoutServerLoad } from './$types';
import { writable } from 'svelte/store';

const kvizzes = [
	{
		_id: 'egy',
		title: 'DiabKVÍZ 1',
		questions: [
			{
				q: 'Jelöld meg a Magyar városokat!',
				d: 'A helyes válaszok 2 pontot érnek, a helytelen válaszokért 1 pont levonás jár.',
				multi: [
					{ choice: 'Miskolc', score: 2 },
					{ choice: 'München', score: -1 },
					{ choice: 'Győr', score: 2 },
					{ choice: 'Berlin', score: -1 },
					{ choice: 'Szombathely', score: 2 },
					{ choice: 'Hamburg', score: -1 },
					{ choice: 'Kecskemét', score: 2 },
					{ choice: 'Köln', score: -1 },
					{ choice: 'Nyíregyháza', score: 2 },
				],
				// score: 0
			},
			{
				q: 'Mi Franciaország fővárosa?',
				d: 'A helyes válasz 10 pontot ér.',
				choices: [
					{ choice: 'Berlin', score: 0, answer: 'A helyes válasz: Párizs' },
					{ choice: 'London', score: 0, answer: 'A helyes válasz: Párizs' },
					{ choice: 'Párizs', score: 10, answer: 'Helyes válasz!' }
				]
			},
		]
	},
	{
		_id: 'ketto',
		title: 'DiabKVÍZ 2',
		questions: [
			{
				q: 'Jelöld meg a Német városokat!',
				d: 'A helyes válaszok 2 pontot érnek, a helytelen válaszokért 1 pont levonás jár.',
				multi: [
					{ choice: 'Miskolc', score: -1 },
					{ choice: 'München', score: 2 },
					{ choice: 'Győr', score: -1 },
					{ choice: 'Berlin', score: 2 },
					{ choice: 'Szombathely', score: -1 },
					{ choice: 'Hamburg', score: 2 },
					{ choice: 'Kecskemét', score: -1 },
					{ choice: 'Köln', score: 2 },
					{ choice: 'Nyíregyháza', score: -1 },
				],
				// score: 0
			},
			/* {
				q: 'Mi Franciaország fővárosa?',
				choices: [
					{ choice: 'Párizs', score: 10, answer: 'Helyes válasz!' },
					{ choice: 'London', score: 0, answer: 'A helyes válasz: Párizs' },
					{ choice: 'Berlin', score: 0, answer: 'A helyes válasz: Párizs' }
				]
			}, */
			/* {
				q: 'Mi Anglia fővárosa?',
				choices: [
					{ choice: 'Párizs', score: 0, answer: 'A helyes válasz: London' },
					{ choice: 'London', score: 10, answer: 'Helyes válasz!' },
					{ choice: 'Berlin', score: 0, answer: 'A helyes válasz: London' }
				]
			}, */
			{
				q: 'Mi Németország fővárosa?',
				d: 'A helyes válasz 10 pontot ér.',
				choices: [
					{ choice: 'Párizs', score: 0, answer: 'A helyes válasz: Berlin' },
					{ choice: 'London', score: 0, answer: 'A helyes válasz: Berlin' },
					{ choice: 'Berlin', score: 10, answer: 'Helyes válasz!' }
				]
			}
		]
	},
]
export const load: LayoutServerLoad = () => {
	return { kvizzes }
}

