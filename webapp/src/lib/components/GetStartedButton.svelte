<script lang="ts">
	/**
	 * GetStartedButton — CTA con flecha que se desliza al hover.
	 * Port Svelte 5 (sin lucide-react).
	 */
	interface Props {
		text?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	}

	let { text = 'Get started', class: className = '', onclick }: Props = $props();
</script>

<div class="gsb-wrap">
	<button type="button" class="gsb {className}" {onclick}>
		<span class="gsb-label">{text}</span>
		<span class="gsb-icon" aria-hidden="true">
			<span class="gsb-icon-track">
				<svg class="gsb-arrow gsb-arrow--in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
				<svg class="gsb-arrow gsb-arrow--out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</span>
		</span>
	</button>
</div>

<style>
	.gsb-wrap {
		min-height: 3rem;
		width: 12rem;
	}

	.gsb {
		display: flex;
		height: 3rem;
		width: 10rem;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		border: none;
		border-radius: 0.5rem;
		background: #fef3c7;
		padding: 0.5rem;
		font-weight: 700;
		cursor: pointer;
		transition: background-color 100ms ease-in-out;
	}

	.gsb:hover {
		background: #ea580c;
	}

	.gsb-label {
		color: #ea580c;
		transition: color 100ms ease-in-out;
	}

	.gsb:hover .gsb-label {
		color: #fef3c7;
	}

	.gsb-icon {
		position: relative;
		display: flex;
		height: 1.75rem;
		width: 1.75rem;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 9999px;
		background: #ea580c;
		transition:
			background-color 100ms ease-in-out,
			transform 100ms ease;
	}

	.gsb:hover .gsb-icon {
		background: #fef3c7;
	}

	.gsb-icon-track {
		position: absolute;
		left: 0;
		display: flex;
		height: 1.75rem;
		width: 3.5rem;
		align-items: center;
		justify-content: center;
		transform: translateX(-50%);
		transition: transform 200ms ease-in-out;
	}

	.gsb:hover .gsb-icon-track {
		transform: translateX(0);
	}

	.gsb-arrow {
		width: 1.75rem;
		height: 1.75rem;
		padding: 0.25rem;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.gsb-arrow--in {
		color: #ea580c;
		opacity: 0;
		transition: opacity 200ms ease-in-out;
	}

	.gsb:hover .gsb-arrow--in {
		opacity: 1;
	}

	.gsb-arrow--out {
		color: #fef3c7;
		opacity: 1;
		transition: opacity 300ms ease-in-out;
	}

	.gsb:hover .gsb-arrow--out {
		opacity: 0;
	}
</style>
