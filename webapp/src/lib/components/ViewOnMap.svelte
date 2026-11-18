<script lang="ts">
	/**
	 * ViewOnMap — pill that expands into an embedded map preview.
	 * Migrated from React + motion/react to Svelte 5 + CSS (no Motion).
	 *
	 * Uso:
	 *   <ViewOnMap address="75 Charles St, Boston, MA" locationName="Big Belly Burger" />
	 */
	interface Props {
		locationName?: string;
		address?: string;
		mapImageUrl?: string;
		class?: string;
		darkMap?: boolean;
	}

	let {
		locationName = '',
		address = 'Boston Public Garden',
		mapImageUrl = 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=2000&auto=format&fit=crop',
		class: className = '',
		darkMap = false
	}: Props = $props();

	let isOpen = $state(false);
	let isMapLoaded = $state(false);

	const publicMapUrl = $derived(
		`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
	);

	function open() {
		isOpen = true;
	}

	function close() {
		isOpen = false;
		isMapLoaded = false;
	}
</script>

<div class="vom {className}">
	{#if !isOpen}
		<button type="button" class="vom__pill" onclick={open} aria-expanded="false">
			<span
				class="vom__pill-bg"
				style:background-image="url({mapImageUrl})"
				aria-hidden="true"
			></span>
			<span class="vom__pill-content">
				<svg class="vom__ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M9.5 2.5 3 6v12.5l6.5 3.5L15 18.5 21 22V9.5L15 6 9.5 2.5Zm5.5 4.7 4.5 2.4v9.2l-4.5-2.4V7.2ZM11 5.1l4 2.1v9.3l-4 2.2V5.1ZM5 7.2l4-2.1v11.5l-4-2.2V7.2Z"
					/>
				</svg>
				<span class="vom__label">View on Map</span>
			</span>
		</button>
	{:else}
		<div class="vom__map" role="dialog" aria-label={locationName || address}>
			<div class="vom__map-frame">
				<iframe
					title={locationName ? `Map: ${locationName}` : 'Google Map'}
					src={publicMapUrl}
					allowfullscreen
					loading="lazy"
					referrerpolicy="no-referrer-when-downgrade"
					class="vom__iframe"
					class:vom__iframe--ready={isMapLoaded}
					class:vom__iframe--dark={darkMap}
					onload={() => {
						isMapLoaded = true;
					}}
				></iframe>
			</div>

			{#if !isMapLoaded}
				<div class="vom__loader" aria-hidden="true">
					<svg class="vom__spinner" width="32" height="32" viewBox="0 0 24 24" fill="none">
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity="0.25" />
						<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
					</svg>
				</div>
			{/if}

			<button type="button" class="vom__close" onclick={close} aria-label="Close map">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
					<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
				</svg>
			</button>

			{#if locationName || address}
				<div class="vom__caption">
					{#if locationName}
						<span class="vom__caption-title">{locationName}</span>
					{/if}
					<span class="vom__caption-addr">{address}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.vom {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100%;
		padding: 1rem;
	}

	.vom__pill {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 180px;
		height: 52px;
		padding: 0;
		border: 0;
		border-radius: 26px;
		overflow: hidden;
		cursor: pointer;
		background: #e5e4ee;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease;
		animation: vom-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.vom__pill:hover {
		transform: scale(1.02);
	}

	.vom__pill:active {
		transform: scale(0.98);
	}

	.vom__pill-bg {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		opacity: 0.2;
		filter: brightness(1.1) grayscale(1);
		transition: opacity 0.3s ease;
	}

	.vom__pill-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
	}

	.vom__ico {
		color: #6a6973;
		flex-shrink: 0;
	}

	.vom__label {
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: #3d3c43;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
	}

	.vom__map {
		position: relative;
		width: min(380px, calc(100vw - 64px));
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 32px;
		background: #dedede;
		box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.25);
		animation: vom-expand 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.vom__map-frame {
		position: absolute;
		inset: 0;
		filter: brightness(1.02) contrast(1.05) grayscale(0.9) saturate(0.8) sepia(0.1);
	}

	.vom__iframe {
		width: 100%;
		height: 100%;
		border: 0;
		opacity: 0;
		transition: opacity 0.7s ease;
		filter: invert(15%) hue-rotate(180deg);
	}

	.vom__iframe--dark {
		filter: invert(90%) hue-rotate(180deg);
	}

	.vom__iframe--ready {
		opacity: 1;
	}

	.vom__loader {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e5e5e7;
		color: #9ca3af;
	}

	.vom__spinner {
		animation: vom-spin 0.8s linear infinite;
	}

	.vom__close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: #fff;
		color: #85848b;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		cursor: pointer;
		transition: transform 0.15s ease, background 0.15s ease;
		animation: vom-in 0.35s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.vom__close:hover {
		background: #f9fafb;
	}

	.vom__close:active {
		transform: scale(0.9);
	}

	@media (min-width: 640px) {
		.vom__close {
			top: 1.5rem;
			right: 1.5rem;
			width: 2.75rem;
			height: 2.75rem;
		}
	}

	.vom__caption {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		padding: 1.25rem 1.25rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent);
		pointer-events: none;
		color: #fff;
	}

	.vom__caption-title {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
	}

	.vom__caption-addr {
		font-size: 0.75rem;
		opacity: 0.85;
	}

	@keyframes vom-in {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes vom-expand {
		from {
			opacity: 0.85;
			transform: scale(0.88);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes vom-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
