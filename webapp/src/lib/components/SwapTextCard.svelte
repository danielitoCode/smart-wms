<script lang="ts">
	/**
	 * SwapTextCard — card con SwapText (hover en desktop, stack en mobile).
	 */
	import SwapText from './SwapText.svelte';

	interface Props {
		initialText: string;
		finalText: string;
		eyebrow?: string;
		class?: string;
	}

	let {
		initialText,
		finalText,
		eyebrow = 'Animata',
		class: className = ''
	}: Props = $props();
</script>

<div class="swap-card {className}">
	<h5 class="swap-card__eyebrow">{eyebrow}</h5>
	<div class="swap-card__body">
		<div class="swap-card__mobile">
			<div class="swap-card__init">{initialText}</div>
			<div class="swap-card__final">{finalText}</div>
		</div>
		<div class="swap-card__desktop">
			<SwapText
				{initialText}
				{finalText}
				disableClick
				class="swap-card__swap"
				initialTextClass="swap-card__init-d"
				finalTextClass="swap-card__final-d"
			/>
		</div>
	</div>
</div>

<style>
	.swap-card {
		display: flex;
		min-height: 16rem;
		width: 100%;
		max-width: 31.25rem;
		flex-direction: column;
		justify-content: space-between;
		border-radius: 1.5rem;
		background: #f3f4f6;
		padding: 1.5rem;
	}

	:global(.dark) .swap-card,
	:global([data-theme='dark']) .swap-card {
		background: color-mix(in srgb, var(--card, #1a1a1e) 92%, #fff);
	}

	.swap-card__eyebrow {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #6b7280;
	}

	.swap-card__body {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	@media (min-width: 768px) {
		.swap-card__body {
			min-width: 18rem;
		}
	}

	.swap-card__mobile {
		display: block;
	}

	.swap-card__desktop {
		display: none;
	}

	@media (min-width: 768px) {
		.swap-card__mobile {
			display: none;
		}
		.swap-card__desktop {
			display: block;
		}
	}

	.swap-card__init {
		font-size: 1.125rem;
		font-weight: 600;
		color: #0a0a0a;
	}

	.swap-card__final {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	:global(.dark) .swap-card__init,
	:global([data-theme='dark']) .swap-card__init {
		color: #f5f5f5;
	}

	.swap-card__desktop :global(.swap-card__swap) {
		display: flex;
		flex-direction: column;
		width: 75%;
		min-height: 5rem;
		margin-bottom: -1.75rem;
		transition: margin 200ms ease;
	}

	.swap-card:hover .swap-card__desktop :global(.swap-card__swap) {
		margin-bottom: 0;
	}

	.swap-card__desktop :global(.swap-card__init-d) {
		font-size: 1.125rem;
		font-weight: 600;
		color: #0a0a0a;
		height: 100%;
		transition: opacity 200ms ease;
	}

	.swap-card:hover .swap-card__desktop :global(.swap-card__init-d) {
		opacity: 0;
	}

	.swap-card__desktop :global(.swap-card__final-d) {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		height: 100%;
		transition: opacity 200ms ease;
	}

	:global(.dark) .swap-card__desktop :global(.swap-card__init-d),
	:global([data-theme='dark']) .swap-card__desktop :global(.swap-card__init-d) {
		color: #f5f5f5;
	}

	@media (prefers-reduced-motion: reduce) {
		.swap-card__desktop :global(.swap-card__swap),
		.swap-card__desktop :global(.swap-card__init-d),
		.swap-card__desktop :global(.swap-card__final-d) {
			transition: none;
		}
	}
</style>
