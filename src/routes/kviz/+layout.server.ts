import type { email } from '$lib/authStore';
import type { LayoutServerLoad } from './$types';
import { writable } from 'svelte/store';
import { getKvizConf } from '$lib/siteConf';
const kvizzes = await getKvizConf();


/* const kvizzes = [
	{
		_id: 'egy',
		title: 'DiabKVÍZ 1',
		description: 'A többlehetőséges kérdéseknél a helyes válaszok pontot érnek, a helytelen válaszokért pontlevonás jár. Az egylehetőséges kérdéseknél a helyes válasz ér pontot.',
		questions: [
			{
				q: 'Jelöld meg a Magyar városokat!',
				d: 'A helyes válaszok 2 pontot érnek, a helytelen válaszokért 1 pont levonás jár.',
				multi: true,
				options: [
					{ option: 'Miskolc', score: 2 },
					{ option: 'München', score: -1 },
					{ option: 'Győr', score: 2 },
					{ option: 'Berlin', score: -1 },
					{ option: 'Szombathely', score: 2 },
					{ option: 'Hamburg', score: -1 },
					{ option: 'Kecskemét', score: 2 },
					{ option: 'Köln', score: -1 },
					{ option: 'Nyíregyháza', score: 2 },
				],
				// score: 0
			},
			{
				q: 'Mi Franciaország fővárosa?',
				d: 'A helyes válasz 10 pontot ér.',
				multi: false,
				options: [
					{ option: 'Berlin', score: 0, answer: 'A helyes válasz: Párizs' },
					{ option: 'London', score: 0, answer: 'A helyes válasz: Párizs' },
					{ option: 'Párizs', score: 10, answer: 'Helyes válasz!' }
				]
			},
		]
	},
	{
		_id: 'ketto',
		title: 'DiabKVÍZ 2',
		description: 'A többlehetőséges kérdéseknél a helyes válaszok pontot érnek, a helytelen válaszokért pontlevonás jár. Az egylehetőséges kérdéseknél a helyes válasz ér pontot.',
		questions: [
			{
				q: 'Jelöld meg a Német városokat!',
				d: 'A helyes válaszok 2 pontot érnek, a helytelen válaszokért 1 pont levonás jár.',
				multi: true,
				options: [
					{ option: 'Miskolc', score: -1 },
					{ option: 'München', score: 2 },
					{ option: 'Győr', score: -1 },
					{ option: 'Berlin', score: 2 },
					{ option: 'Szombathely', score: -1 },
					{ option: 'Hamburg', score: 2 },
					{ option: 'Kecskemét', score: -1 },
					{ option: 'Köln', score: 2 },
					{ option: 'Nyíregyháza', score: -1 },
				],
				// score: 0
			},
			{
				q: 'Mi Németország fővárosa?',
				d: 'A helyes válasz 10 pontot ér.',
				options: [
					{ option: 'Párizs', score: 0, answer: 'A helyes válasz: Berlin' },
					{ option: 'London', score: 0, answer: 'A helyes válasz: Berlin' },
					{ option: 'Berlin', score: 10, answer: 'Helyes válasz!' }
				]
			}
		]
	},
] */
export const load: LayoutServerLoad = () => {
	return { kvizzes }
}
