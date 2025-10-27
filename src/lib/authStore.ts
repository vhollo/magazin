import { writable } from 'svelte/store';

interface AuthUserType {
  uid: string;
  email: string | null;
  displayName: string | null;
}

const authUser = writable<AuthUserType | undefined>(undefined);
const email = writable<string | undefined>(undefined);
const uid = writable<string | undefined>(undefined);
const authReady = writable<boolean>(false);

export { authUser, email, uid, authReady }