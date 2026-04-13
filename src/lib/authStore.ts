import { writable, derived } from 'svelte/store';
import { dev } from '$app/environment';
import type { ReceptsarokSubscription } from './receptsarokAccess';
import { hasReceptsarokAccessFromSubscription } from './receptsarokAccess';

interface AuthUserType {
  uid: string;
  email: string | null;
  displayName: string | null;
  subscription?: {
    receptsarok?: ReceptsarokSubscription;
  };
}

const authUser = writable<AuthUserType | undefined>(undefined);
const email = writable<string | undefined>(undefined);
const uid = writable<string | undefined>(undefined);
const authReady = writable<boolean>(false);

/** In dev, any signed-in user gets premium UI without Firestore subscription.receptsarok. */
const hasReceptsarokAccess = derived(authUser, ($authUser) => {
  if (dev && $authUser) return true;
  return hasReceptsarokAccessFromSubscription($authUser?.subscription);
});

export { authUser, email, uid, authReady, hasReceptsarokAccess }
export type { AuthUserType }
export type { ReceptsarokSubscription } from './receptsarokAccess'