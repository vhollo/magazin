import { writable } from 'svelte/store';

/* interface KvizScore {
  id: string;
  score: number;
} */

const kvizScores = writable<{id: string, score: number}[]>([]);

export { kvizScores }