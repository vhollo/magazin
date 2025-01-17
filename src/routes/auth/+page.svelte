<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

{#if data.user}
<h1>Hi, {data.user.username}!</h1>
<p>Your user ID is {data.user.id}.</p>
<form method='post' action='?/logout' use:enhance>
	<button class="btn">Sign out</button>
</form>
<h1>Tartalom a bejelentkezetteknek</h1>
{:else}
<h1>Tartalom a be nem jelentkezetteknek</h1>
<p><a href='/login'>Bejelentkezés</a></p>
{/if}