import { db } from '$lib/firebase';
import { kvizScores } from '$lib/kvizStore';
import { uid } from '$lib/authStore';
import { doc, getDoc } from 'firebase/firestore/lite';
import { get } from 'svelte/store';
import type { PageLoad } from './$types';
// Configure marked for all child pages - this import runs the configuration
import '$lib/marked';

export const ssr = false;

export const load: PageLoad = async ({ parent }) => {
  const { kvizzes } = await parent();

  // If logged out: clear scores and stop
  if (!get(uid)) {
    kvizScores.set({});
    return {};
  }

  // Logged in: keep existing scores (from localStorage) to avoid flash, then repopulate

  if (get(uid) && Array.isArray(kvizzes)) {
    // console.log('uid: ', get(uid))
    try {
      await Promise.all(
        kvizzes.map(async (k) => {
          if (!k?.id) return;
          const ref = doc(db, `kviz/${k.id}/scores/${get(uid)}`);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as { score?: number | string };
            const scoreNum = data?.score != null ? Number(data.score) : undefined;
            if (!Number.isNaN(scoreNum) && typeof scoreNum === 'number') {
              kvizScores.update((curr) => ({ ...curr, [k.id]: scoreNum }));
            }
          }
        })
      );
    } catch (e) {
    }
  }

  return {};
};
