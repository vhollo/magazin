<script lang="ts">
import { goto } from '$app/navigation';

import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseAuth } from '$lib/firebase';
import { authUser } from '$lib/authStore';

let email: string;
let password: string;

let success: boolean | undefined = undefined;

const login = () => {
	setPersistence(firebaseAuth, browserLocalPersistence)
		.then(() => {
			signInWithEmailAndPassword(firebaseAuth, email, password)
				.then((userCredential) => {
					$authUser = {
							uid: userCredential.user.uid,
							email: userCredential.user.email || ''
						};
					goto('/');
				})
				.catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;
					console.log(errorCode, errorMessage);

					success = false;
				})
			})
}
</script>

<form
  class="flex md:flex-row gap-4 p-8 max-md:space-y-4 sm:w-10/12 mx-auto justify-center"
  on:submit|preventDefault={login}
>
  <input
    type="email"
    placeholder="Email"
    class="px-2 border border-primary rounded-md"
    required
    bind:value={email}
  />
  <input
    type="password"
    placeholder="Password"
    class="px-2 border border-primary rounded-md"
    required
    bind:value={password}
  />

  <button type="submit" class="btn btn-sm">Login</button>
</form>
{#if success === false}
	<div class="p-4 bg-error text-error-content text-center">Hiba történt. Kérlek, próbáld újra.</div>
{/if}
