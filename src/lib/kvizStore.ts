import { writable } from 'svelte/store';

/* interface KvizScore {
  id: string;
  score: number;
} */

const kvizScores = writable<{[key: string]: number}>({});

export { kvizScores }