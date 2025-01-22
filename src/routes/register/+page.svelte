<script lang="ts">
import { goto } from '$app/navigation';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '$lib/firebase';

let email: string;
let password: string;

let success: boolean | undefined = undefined;

const register = () => {
  createUserWithEmailAndPassword(firebaseAuth, email, password)
    .then((userCredentials) => {
      console.log(userCredentials)
      goto('/login');
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);

      success = false;
    });
};
</script>

<form
  class="flex flex-col flex-col md:flex-row gap-4 p-8 max-md:space-y-4 sm:w-10/12 mx-auto justify-center"
  on:submit|preventDefault={register}
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

  <button type="submit" class="btn btn-sm">Register</button>
</form>
{#if success === false}
	<div class="p-4 bg-error text-error-content text-center">Hiba történt. Kérlek, próbáld újra.</div>
{/if}
