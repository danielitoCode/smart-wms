<script lang="ts">
	/**
	 * WaveReveal — palabra/letra con stagger up/down + blur opcional.
	 * Port Svelte 5 de animata/text/wave-reveal (sin Motion).
	 */
	interface Props {
		text: string;
		class?: string;
		direction?: 'up' | 'down';
		mode?: 'letter' | 'word';
		/** p.ej. "700ms" */
		duration?: string;
		/** delay base en ms */
		delay?: number;
		blur?: boolean;
		letterClass?: string;
	}

	let {
		text,
		class: className = '',
		direction = 'down',
		mode = 'letter',
		duration = '700ms',
		delay = 0,
		blur = true,
		letterClass = ''
	}: Props = $props();

	const STAGGER_MS = 50;

	const words = $derived(text.trim().split(/\s+/).filter(Boolean));

	type Token = { key: string; label: string; delayMs: number };

	const tokens = $derived.by(() => {
		const out: Token[] = [];
		if (mode === 'word') {
			words.forEach((w, i) => {
				out.push({ key: `w-${i}`, label: w, delayMs: delay + i * STAGGER_MS });
			});
			return out;
		}
		let idx = 0;
		words.forEach((w, wi) => {
			[...w].forEach((ch, ci) => {
				out.push({
					key: `l-${wi}-${ci}`,
					label: ch,
					delayMs: delay + idx * STAGGER_MS
				});
				idx += 1;
			});
			if (wi < words.length - 1) {
				out.push({ key: `sp-${wi}`, label: '\u00A0', delayMs: delay + idx * STAGGER_MS });
				idx += 1;
			}
		});
		return out;
	});

	const animName = $derived(
		direction === 'up'
			? blur
				? 'wr-up-blur'
				: 'wr-up'
			: blur
				? 'wr-down-blur'
				: 'wr-down'
	);
</script>

{#if text}
	<div class="wr {className}" aria-label={text}>
		{#each tokens as t (t.key)}
			<span
				class="wr-token {letterClass}"
				class:wr-space={t.label === '\u00A0'}
				style="animation-name: {animName}; animation-duration: {duration}; animation-delay: {t.delayMs}ms;"
			>{t.label}</span>
		{/each}
		<span class="sr-only">{text}</span>
	</div>
{/if}

<style>
	.wr {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		white-space: pre;
	}

	.wr-token {
		display: inline-block;
		opacity: 0;
		animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
		animation-fill-mode: both;
	}

	.wr-space {
		width: 0.28em;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes wr-up {
		from {
			opacity: 0;
			transform: translateY(0.55em);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes wr-down {
		from {
			opacity: 0;
			transform: translateY(-0.55em);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes wr-up-blur {
		from {
			opacity: 0;
			transform: translateY(0.55em);
			filter: blur(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}

	@keyframes wr-down-blur {
		from {
			opacity: 0;
			transform: translateY(-0.55em);
			filter: blur(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.wr-token {
			animation: none !important;
			opacity: 1;
			transform: none;
			filter: none;
		}
	}
</style>
