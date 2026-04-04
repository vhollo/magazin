import { writable, derived } from 'svelte/store';

interface ReceptsarokSubscription {
  status: 'active' | 'expired' | 'none';
  type?: 'lifetime' | 'annual';
  purchasedAt?: string;
  expiresAt?: string;
}

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

const hasReceptsarokAccess = derived(authUser, ($authUser) => {
  if (!$authUser?.subscription?.receptsarok) return false;
  const sub = $authUser.subscription.receptsarok;
  if (sub.status !== 'active') return false;
  if (sub.type === 'lifetime') return true;
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return false;
  return true;
});

export { authUser, email, uid, authReady, hasReceptsarokAccess }
export type { AuthUserType, ReceptsarokSubscription }