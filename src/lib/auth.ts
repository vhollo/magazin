import { onAuthStateChanged } from 'firebase/auth';
import { browser } from '$app/environment';
import { firebaseAuth } from '$lib/firebase';
import { authUser, email, uid } from '$lib/authStore';

let initialized = false;

export function initAuth() {
  if (!browser || initialized) return;
  initialized = true;

  onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      authUser.set({ uid: user.uid, email: user.email, displayName: user.displayName ?? null });
      email.set(user.email ?? undefined);
      uid.set(user.uid);
    } else {
      authUser.set(undefined);
      email.set(undefined);
      uid.set(undefined);
    }
  });
}
