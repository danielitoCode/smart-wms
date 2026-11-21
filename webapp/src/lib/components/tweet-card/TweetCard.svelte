<script lang="ts">
	/**
	 * TweetCard — tarjeta de post X/Twitter (estilo Magic UI / react-tweet).
	 * Carga vía CDN syndication o acepta `tweet` ya resuelto.
	 */
	import { onMount } from 'svelte';
	import { fetchTweet, DEMO_TWEET } from './fetchTweet';
	import type { DisplayTweet, TweetLogo } from './types';

	interface Props {
		id?: string;
		tweet?: DisplayTweet;
		logo?: TweetLogo;
		class?: string;
		fallbackDemo?: boolean;
	}

	let {
		id,
		tweet: tweetProp,
		logo = 'x',
		class: className = '',
		fallbackDemo = true
	}: Props = $props();

	let tweet = $state<DisplayTweet | null>(tweetProp ?? null);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>(tweetProp ? 'ready' : 'idle');

	onMount(() => {
		if (tweetProp) {
			status = 'ready';
			return;
		}
		if (!id) {
			status = 'error';
			return;
		}
		status = 'loading';
		fetchTweet(id)
			.then((t) => {
				if (t) {
					tweet = t;
					status = 'ready';
				} else if (fallbackDemo) {
					tweet = { ...DEMO_TWEET, id };
					status = 'ready';
				} else {
					status = 'error';
				}
			})
			.catch(() => {
				if (fallbackDemo) {
					tweet = { ...DEMO_TWEET, id };
					status = 'ready';
				} else {
					status = 'error';
				}
			});
	});

	function truncate(str: string | null | undefined, length: number) {
		if (!str || str.length <= length) return str ?? '';
		return `${str.slice(0, length - 3)}...`;
	}
</script>

{#if status === 'loading' || status === 'idle'}
	<div class="tc tc--skel {className}" aria-busy="true">
		<div class="tc-skel-row">
			<span class="tc-skel tc-skel--avatar"></span>
			<span class="tc-skel tc-skel--head"></span>
		</div>
		<span class="tc-skel tc-skel--body"></span>
	</div>
{:else if status === 'error' || !tweet}
	<div class="tc tc--empty {className}">
		<p>Tweet no encontrado</p>
	</div>
{:else}
	<article class="tc {className}">
		<header class="tc-head">
			<div class="tc-user">
				<a class="tc-avatar-link" href={tweet.user.url} target="_blank" rel="noreferrer">
					<img
						class="tc-avatar"
						src={tweet.user.profile_image_url_https}
						alt={tweet.user.screen_name}
						width="48"
						height="48"
					/>
				</a>
				<div class="tc-meta">
					<a class="tc-name" href={tweet.user.url} target="_blank" rel="noreferrer">
						{truncate(tweet.user.name, 20)}
						{#if tweet.user.verified || tweet.user.is_blue_verified}
							<svg class="tc-verified" viewBox="0 0 24 24" aria-label="Verificado">
								<path
									fill="currentColor"
									d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"
								/>
							</svg>
						{/if}
					</a>
					<a class="tc-handle" href={tweet.user.url} target="_blank" rel="noreferrer">
						@{truncate(tweet.user.screen_name, 16)}
					</a>
				</div>
			</div>
			<a class="tc-logo" href={tweet.url} target="_blank" rel="noreferrer" aria-label="Abrir post">
				{#if logo === 'twitter'}
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
					</svg>
				{:else}
					<svg viewBox="-2 -2 28 28" fill="currentColor" aria-hidden="true">
						<path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
					</svg>
				{/if}
			</a>
		</header>

		<div class="tc-body">
			{#each tweet.entities as entity, i (i)}
				{#if entity.type === 'text'}
					{@html entity.text}
				{:else}
					<a class="tc-link" href={entity.href} target="_blank" rel="noopener noreferrer">{entity.text}</a>
				{/if}
			{/each}
		</div>

		{#if tweet.video}
			<div class="tc-media">
				<video class="tc-video" poster={tweet.video.poster} autoplay loop muted playsinline>
					<source src={tweet.video.src} type="video/mp4" />
				</video>
			</div>
		{:else if tweet.photos?.length}
			<div class="tc-photos">
				{#each tweet.photos as photo (photo.url)}
					<img class="tc-photo" src={photo.url} alt="" width={photo.width} height={photo.height} />
				{/each}
			</div>
		{/if}
	</article>
{/if}

<style>
	.tc {
		position: relative; display: flex; width: 100%; max-width: 32rem;
		flex-direction: column; gap: 1rem; overflow: hidden; border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: var(--card, #fff); padding: 1.25rem; color: var(--ink, #132234);
	}
	.tc--skel, .tc--empty { min-height: 8rem; }
	.tc--empty {
		align-items: center; justify-content: center;
		color: var(--slate, #5c6b7d); font-size: 0.9rem;
	}
	.tc-skel-row { display: flex; gap: 0.5rem; }
	.tc-skel {
		display: block; border-radius: 0.4rem;
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
		animation: tc-pulse 1.2s ease-in-out infinite;
	}
	.tc-skel--avatar { width: 2.5rem; height: 2.5rem; border-radius: 999px; flex-shrink: 0; }
	.tc-skel--head { flex: 1; height: 2.5rem; }
	.tc-skel--body { height: 5rem; width: 100%; }
	@keyframes tc-pulse { 50% { opacity: 0.55; } }
	.tc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
	.tc-user { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
	.tc-avatar {
		width: 3rem; height: 3rem; border-radius: 999px; object-fit: cover;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
	}
	.tc-meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
	.tc-name {
		display: inline-flex; align-items: center; gap: 0.2rem;
		font-weight: 650; color: inherit; text-decoration: none; white-space: nowrap;
	}
	.tc-name:hover { opacity: 0.85; }
	.tc-verified { width: 1rem; height: 1rem; color: #3b82f6; flex-shrink: 0; }
	.tc-handle { font-size: 0.875rem; color: var(--slate, #5c6b7d); text-decoration: none; }
	.tc-handle:hover { color: inherit; }
	.tc-logo {
		color: var(--slate, #5c6b7d); flex-shrink: 0;
		transition: color 0.15s ease, transform 0.15s ease;
	}
	.tc-logo:hover { color: inherit; transform: scale(1.05); }
	.tc-logo svg { width: 1.25rem; height: 1.25rem; display: block; }
	.tc-body { font-size: 0.9375rem; line-height: 1.55; word-break: break-word; }
	.tc-link { color: var(--slate, #5c6b7d); text-decoration: none; }
	.tc-link:hover { color: var(--navy, #004c8b); }
	.tc-media, .tc-photos {
		display: flex; gap: 0.5rem; overflow-x: auto; scroll-snap-type: x mandatory;
	}
	.tc-photo, .tc-video {
		max-height: 16rem; width: auto; max-width: 100%; border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		object-fit: cover; scroll-snap-align: center;
	}
	.tc-video { width: 100%; }
</style>
