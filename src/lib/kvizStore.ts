import { writable } from 'svelte/store';

/* interface KvizScore {
  id: string;
  score: number;
} */

const kvizScores = writable<object[]>([]);

export { kvizScores }