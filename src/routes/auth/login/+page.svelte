<script lang='ts'>
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	// let { form }: { form: ActionData } = $props();

	export let data;

</script>

<h1>Database Version</h1>
<p>{data.version}</p>

<h1>Login/Register</h1>
<form method='post' action='?/login' use:enhance>
	<label>
		Username
		<input name='username' />
	</label>
	<label>
		Password
		<input type='password' name='password' />
	</label>
	<label>
		Admin
		<input type='checkbox' name='admin' />
	</label>
	<button class="btn">Login</button>
	<button class="btn" formaction='?/register'>Register</button>
</form>
<p style='color: red'>{form?.message ?? ''}</p>
