<script lang="ts">
	/**
	 * DeliveryCard — mini tracking card (arrival, progress, location).
	 * Port Svelte 5 from React (no lucide; inline SVG).
	 */
	interface Props {
		class?: string;
		progress?: number;
		arrivalTime?: string;
		location?: string;
		timeAgo?: string;
		/** Demo-only: animates progress on an interval. */
		simulateProgress?: boolean;
	}

	let {
		class: className = '',
		progress = 42,
		arrivalTime = '09:26',
		location = 'Pokhara',
		timeAgo = '30 min',
		simulateProgress = false
	}: Props = $props();

	let demoProgress = $state(0);

	$effect(() => {
		if (simulateProgress) {
			demoProgress = progress;
		}
	});

	const displayProgress = $derived(simulateProgress ? demoProgress : progress);
	const clamped = $derived(Math.min(100, Math.max(0, displayProgress)));
	const status = $derived(
		clamped <= 0 ? 'Processing' : clamped >= 100 ? 'Delivered' : 'In transit'
	);
	const headline = $derived(clamped >= 100 ? 'Arrived' : 'Arrives today');

	$effect(() => {
		if (!simulateProgress) return;
		const id = setInterval(() => {
			demoProgress = demoProgress >= 100 ? 0 : Math.min(100, demoProgress + 30);
		}, 3000);
		return () => clearInterval(id);
	});
</script>

<div class="dc {className}">
	<div class="dc-stub" aria-hidden="true">
		<div class="dc-stub-notch"></div>
	</div>

	<div class="dc-body">
		<header class="dc-head">
			<div class="dc-head-line" aria-hidden="true"></div>
			<p class="dc-headline">{headline}</p>
			<p class="dc-time">{arrivalTime}</p>
		</header>

		<div class="dc-main">
			<p class="dc-status">{status}</p>

			<div class="dc-track">
				<span class="dc-dot dc-dot--start" aria-hidden="true"></span>
				<span class="dc-dot dc-dot--end" aria-hidden="true"></span>
				<div class="dc-bar" style="width: {clamped}%">
					<span class="dc-truck" aria-hidden="true">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
							<path d="M15 18H9" />
							<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
							<circle cx="17" cy="18" r="2" />
							<circle cx="7" cy="18" r="2" />
						</svg>
					</span>
				</div>
			</div>

			<div class="dc-loc">
				<svg
					class="dc-pin"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
					<circle cx="12" cy="10" r="3" />
				</svg>
				<div class="dc-loc-text">
					<p class="dc-place">{location}</p>
					<p class="dc-ago">{timeAgo} ago</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dc {
		position: relative;
		width: 13rem;
		height: 13rem;
		overflow: hidden;
		border-radius: 1.5rem;
		border: 1px solid color-mix(in srgb, #18181b 50%, transparent);
		background: #27272a;
		color: #fff;
		font-family: system-ui, -apple-system, sans-serif;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	}

	:global(.dark) .dc,
	:global([data-theme='dark']) .dc {
		border-color: #09090b;
		background: #18181b;
	}

	.dc-stub {
		position: absolute;
		right: 0.5rem;
		z-index: 10;
		height: 7rem;
		width: 1.25rem;
		background: color-mix(in srgb, #fff 30%, transparent);
	}

	.dc-stub-notch {
		position: absolute;
		bottom: -0.5rem;
		z-index: 0;
		height: 1rem;
		width: 100%;
		transform: rotate(45deg);
		background: #3f3f46;
	}

	:global(.dark) .dc-stub-notch,
	:global([data-theme='dark']) .dc-stub-notch {
		background: #27272a;
	}

	.dc-body {
		display: flex;
		height: 100%;
		flex-direction: column;
	}

	.dc-head {
		position: relative;
		flex-shrink: 0;
		background: #52525b;
		padding: 1rem 1rem 0.625rem;
	}

	:global(.dark) .dc-head,
	:global([data-theme='dark']) .dc-head {
		background: #3f3f46;
	}

	.dc-head-line {
		position: absolute;
		right: 0.5rem;
		top: 0;
		display: flex;
		height: 100%;
		width: 1.25rem;
		justify-content: center;
	}

	.dc-head-line::after {
		content: '';
		z-index: 20;
		width: 2px;
		background: #52525b;
	}

	:global(.dark) .dc-head-line::after,
	:global([data-theme='dark']) .dc-head-line::after {
		background: #3f3f46;
	}

	.dc-headline {
		margin: 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 1;
		color: color-mix(in srgb, #fff 85%, transparent);
	}

	.dc-time {
		margin: 0.25rem 0 0;
		font-size: 22px;
		font-weight: 400;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}

	.dc-main {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		border-top: 2px solid color-mix(in srgb, #18181b 80%, transparent);
		background: #3f3f46;
		padding: 0.5rem 1rem 1rem;
	}

	:global(.dark) .dc-main,
	:global([data-theme='dark']) .dc-main {
		border-top-color: #09090b;
		background: #27272a;
	}

	.dc-status {
		margin: 0;
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 1;
		color: #fbbf24;
	}

	:global(.dark) .dc-status,
	:global([data-theme='dark']) .dc-status {
		color: #fcd34d;
	}

	.dc-track {
		position: relative;
		margin: 1rem 0.125rem 1.25rem;
		flex-shrink: 0;
		height: 0.125rem;
		background: #71717a;
	}

	:global(.dark) .dc-track,
	:global([data-theme='dark']) .dc-track {
		background: #52525b;
	}

	.dc-dot {
		position: absolute;
		top: 50%;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 9999px;
		transform: translateY(-50%);
	}

	.dc-dot--start {
		left: 0;
		background: #fbbf24;
	}

	:global(.dark) .dc-dot--start,
	:global([data-theme='dark']) .dc-dot--start {
		background: #fcd34d;
	}

	.dc-dot--end {
		right: 0;
		z-index: 10;
		background: #52525b;
	}

	:global(.dark) .dc-dot--end,
	:global([data-theme='dark']) .dc-dot--end {
		background: #3f3f46;
	}

	.dc-bar {
		position: relative;
		height: 0.125rem;
		background: #fbbf24;
		transition: width 500ms ease-in-out;
	}

	:global(.dark) .dc-bar,
	:global([data-theme='dark']) .dc-bar {
		background: #fcd34d;
	}

	.dc-truck {
		position: absolute;
		right: 0;
		top: 50%;
		z-index: 50;
		display: flex;
		width: 2rem;
		height: 2rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: #fbbf24;
		color: #451a03;
		transform: translate(50%, -50%);
	}

	:global(.dark) .dc-truck,
	:global([data-theme='dark']) .dc-truck {
		background: #fcd34d;
	}

	.dc-truck :global(svg) {
		width: 1.15rem;
		height: 1.15rem;
	}

	.dc-loc {
		margin-top: auto;
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
	}

	.dc-pin {
		margin-top: 0.125rem;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: #a1a1aa;
	}

	:global(.dark) .dc-pin,
	:global([data-theme='dark']) .dc-pin {
		color: #71717a;
	}

	.dc-loc-text {
		min-width: 0;
	}

	.dc-place {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 15px;
		font-weight: 600;
		line-height: 1.2;
		color: #fff;
	}

	.dc-ago {
		margin: 0.125rem 0 0;
		font-size: 13px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: #a1a1aa;
	}

	:global(.dark) .dc-ago,
	:global([data-theme='dark']) .dc-ago {
		color: #71717a;
	}

	@media (prefers-reduced-motion: reduce) {
		.dc-bar {
			transition: none;
		}
	}
</style>
