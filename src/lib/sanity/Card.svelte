<script lang="ts">
	import { formatDate } from '$lib/utils';
	import { urlFor } from '$lib/sanity/image';
	import type { Quiz } from '$lib/sanity/queries';

	interface Props {
		quiz: Quiz;
	}

	let { quiz }: Props = $props();
</script>

<a class="card" href={`/kviz/${quiz.slug.current}`}>
	{#if quiz.mainImage}
		<img
			class="card__cover"
			src={urlFor(quiz.mainImage).width(500).height(300).url()}
			alt="Cover image for {quiz.title}"
		/>
	{:else}
		<div class="card__cover--none"></div>
	{/if}

	<div class="card__container">
		<h3 class="card__title">
			{quiz.title}
		</h3>
		{#if quiz.excerpt}
			<p class="card__excerpt">{quiz.excerpt}</p>
		{/if}
		<p class="card__date">
			{formatDate(quiz._createdAt)}
		</p>
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		padding: var(--space-2);
		padding: 9px;
		position: relative;
		border-bottom: 1px solid #ced2d9;
		color: var(--black);
		text-decoration: none;
	}

	.card .card__container {
		margin: 0 var(--space-1) 0;
	}

	.card .card__cover {
		width: 100%;
		height: 231px;
		-o-object-fit: cover;
		object-fit: cover;
	}

	.card .card__cover--none {
		width: 100%;
		height: 231px;
		background: var(--black);
	}

	.card .card__title {
		font-family: var(--font-family-sans);
		font-weight: 800;
		font-size: var(--font-size-7);
		line-height: var(--line-height-6);
		letter-spacing: -0.025em;
		margin: var(--space-3) 0;
	}

	.card .card__excerpt {
		font-family: var(--font-family-serif);
		font-weight: 400;
		font-size: var(--font-size-4);
		line-height: var(--line-height-3);
		margin-top: 0;
	}

	.card .card__date {
		font-weight: 600;
		font-family: var(--font-family-sans);
		font-size: var(--font-size-1);
		margin-top: calc(var(----space-4) + 7);
	}

	.card:hover .card__title {
		opacity: 0.8;
		transition: 0.2s;
	}

	.card:first-child {
		border-top-left-radius: 3px;
		border-top-right-radius: 3px;
	}

	.card:last-child {
		border-bottom-left-radius: 3px;
		border-bottom-right-radius: 3px;
	}

	@media (min-width: 575px) {
		.card {
			border: 1px solid #ced2d9;
			border-bottom: none;
		}

		.card .card__title {
			margin-top: var(--space-4);
		}

		.card:last-child {
			border-bottom: 1px solid #ced2d9;
		}
	}

	@media (min-width: 800px) {
		.card {
			flex-direction: row;
		}

		.card .card__container {
			margin: 0 var(--space-4) 0;
		}

		.card .card__cover,
		.card .card__cover--none {
			min-width: 366.5px;
			max-width: 366.5px;
			max-height: 231px;
		}
	}
</style>
