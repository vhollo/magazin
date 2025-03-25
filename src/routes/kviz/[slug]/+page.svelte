<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import { useQuery } from '@sanity/svelte-loader';
	import { formatDate } from '$lib/utils';
	import { urlFor } from '$lib/sanity/image';
	import type { PageData } from './$types';
	import { browser } from '$app/environment';

	interface Props {
		data: PageData;
	}
	let activeElement: HTMLFieldSetElement | null = null;

	let { data }: Props = $props();
	const uq = useQuery(data);
	// console.log($uq.data.questions);

	let { data: quiz } = $derived($uq);

	function _scroll(id: string) {
		console.log(id)
		if (browser) document.getElementById(id)?.scrollIntoView({behavior: 'smooth'})
		// activeElement = document.getElementById(id)
	}

</script>

<!-- <svelte:document bind:activeElement={activeElement} /> -->
<section class="post">
	{#if quiz.mainImage}
		<img
			class="post__cover"
			src={urlFor(quiz.mainImage).url()}
			alt="Cover image for {quiz.title}"
		/>
	{:else}
		<div class="post__cover--none"></div>
	{/if}
	<div class="post__container">
		<h1 class="post__title">{quiz.title}</h1>
		{#if quiz.excerpt}
			<p class="post__excerpt">{quiz.excerpt}</p>
		{/if}
		<p class="post__date">
			{formatDate(quiz._createdAt)}
		</p>
		{#if quiz.body}
			<div class="post__content">
				<PortableText components={{}} value={quiz.body} />
			</div>
		{/if}
		{#if quiz.questions}
			<!-- <div class="post__questions">
				{#each quiz.questions as q}
					<h2 class="post__question">{q.question}</h2>
					<ul class="post__answers">
						{#each q.answers as answer}
							<li class="post__answer">{answer}</li>
						{/each}
					</ul>
				{/each}
			</div> -->

			<form>
				{#each quiz.questions as q, i}
				<fieldset>
					<legend id="q-{i}">{q.question}</legend>
					{#each q.answers as ch, j}
					<input type="radio" name="answer-{i}" id="answer-{i}-{j}" required oninput={() => _scroll(`q-${i}`)}><!-- oninput={_scroll(`q-${i}`)} -->
					<label for="answer-{i}-{j}">
						{ch}
						<aside>{q.help}</aside>
					</label>
					{/each}
				</fieldset>
				{/each}
			</form>
			
		{/if}
	</div>
</section>

<style>
	form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-gap: var(--gutter);
	}
	fieldset {
		display: contents;
	}
	fieldset:not(:valid) + fieldset { display: none; }

	legend {
		font-size: var(--midsize);
		text-transform: uppercase;
		grid-column: 1 / 3;
		margin-top: var(--spacer);
	}

	input[type="radio"] { display: none; }

	input:valid ~ label {
		pointer-events: none;
		user-select: none;
		background-color: var(--infobg);
		color: var(--toolbg);
	}

	label {
		display: block;
		position: relative;
		cursor: pointer;
		padding: var(--gutter);
		background-color: var(--toolbg);
		height: max-content;
	}
	input:checked + label, label:hover, label:focus { 
		background-color: var(--maincolor);
		color: inherit;
	}

	label aside { display: none }
	input:checked + label aside { 
		display: block;
		font-size: var(--midsize);
		line-height: var(--headsize);
	}

	.post {
		width: 100%;
		margin: var(--space-1) 0 var(--space-4);
	}

	.post .post__cover,
	.post .post__cover--none {
		width: 100%;
		height: 200px;
		-o-object-fit: cover;
		object-fit: cover;
	}

	.post .post__cover--none {
		background: var(--black);
	}

	.post .post__container {
		padding: 0 var(--space-3);
	}

	.post .post__content {
		font-family: var(--font-family-serif);
		font-weight: 400;
		font-size: var(--font-size-4);
		line-height: var(--line-height-5);
		letter-spacing: -0.02em;
		margin-top: var(--space-6);
	}

	.post .post__content blockquote {
		border-left: 5px solid var(--black);
		padding-left: var(--space-3);
		margin-left: var(--space-4);
	}

	.post .post__content a {
		color: var(--blue-600);
		text-decoration: none;
	}

	.post .post__title {
		font-family: var(--font-family-sans);
		font-size: var(--font-size-7);
		line-height: var(--line-height-6);
		margin: var(--space-4) 0;
		font-weight: 800;
	}

	.post .post__excerpt {
		font-family: var(--font-family-serif);
		font-size: var(--font-size-5);
		line-height: var(--line-height-4);
		margin-top: 0;
		font-weight: 400;
	}

	.post .post__date {
		font-family: var(--font-family-sans);
		font-weight: 600;
		font-family: var(--font-family-sans);
		font-size: var(--font-size-1);
		line-height: var(--line-height-1);
		margin-top: var(--space-4);
	}

	@media (min-width: 800px) {
		.post .post__cover,
		.post .post__cover--none {
			width: 750px;
			height: 380px;
		}

		.post .post__title {
			font-size: var(--font-size-10);
			line-height: var(--line-height-10);
			margin: var(--space-6) 0 0;
			letter-spacing: -0.025em;
		}

		.post .post__excerpt {
			font-size: var(--font-size-5);
			line-height: var(--line-height-5);
			margin-top: var(--space-3);
			margin-bottom: var(--space-3);
		}

		.post .post__date {
			font-size: var(--font-size-3);
			line-height: var(--line-height-2);
			margin-top: var(--space-0);
		}

		.post .post__content {
			margin-top: var(--space-7);
		}
	}
</style>
