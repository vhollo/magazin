import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { browser } from '$app/environment';
import { firebaseAuth, db } from '$lib/firebase';
import { authUser, email, uid } from '$lib/authStore';

let initialized = false;

async function loadSubscription(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data()?.subscription ?? undefined;
    }
  } catch (e) {
    // Subscription check failed silently — user continues without premium
  }
  return undefined;
}

export function initAuth() {
  if (!browser || initialized) return;
  initialized = true;

  onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      const subscription = await loadSubscription(user.uid);
      authUser.set({ uid: user.uid, email: user.email, displayName: user.displayName ?? null, subscription });
      email.set(user.email ?? undefined);
      uid.set(user.uid);
    } else {
      authUser.set(undefined);
      email.set(undefined);
      uid.set(undefined);
    }
  });
}
