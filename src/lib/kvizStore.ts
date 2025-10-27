import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/* interface KvizScore {
  id: string;
  score: number;
} */

const initial = browser ? (() => {
  try {
    const raw = localStorage.getItem('kvizScores');
    return raw ? JSON.parse(raw) as {[key: string]: number} : {};
  } catch {
    return {};
  }
})() : {};

const kvizScores = writable<{[key: string]: number}>(initial);

if (browser) {
  kvizScores.subscribe((val) => {
    try { localStorage.setItem('kvizScores', JSON.stringify(val)); } catch {}
  });
}

export { kvizScores }