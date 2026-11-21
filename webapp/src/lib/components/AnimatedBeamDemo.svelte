<script lang="ts">
	/**
	 * Demo — red de nodos WMS unidos por AnimatedBeam.
	 */
	import AnimatedBeam from './AnimatedBeam.svelte';

	let containerEl = $state<HTMLDivElement | null>(null);
	let hubEl = $state<HTMLDivElement | null>(null);
	let nodeEls = $state<(HTMLDivElement | null)[]>([]);

	const nodes = [
		{ id: 'recv', label: 'Receiving', icon: '↓' },
		{ id: 'put', label: 'Putaway', icon: '▣' },
		{ id: 'pick', label: 'Picking', icon: '◎' },
		{ id: 'pack', label: 'Packing', icon: '▤' },
		{ id: 'ship', label: 'Shipping', icon: '→' },
		{ id: 'inv', label: 'Inventory', icon: '≡' }
	] as const;

	const beams: {
		to: number;
		curvature: number;
		reverse?: boolean;
		delay: number;
		start: string;
		stop: string;
	}[] = [
		{ to: 0, curvature: 40, delay: 0, start: '#004c8b', stop: '#0d7ab5' },
		{ to: 1, curvature: 20, delay: 0.4, start: '#0d7ab5', stop: '#c9a227' },
		{ to: 2, curvature: -10, delay: 0.8, start: '#c9a227', stop: '#004c8b' },
		{ to: 3, curvature: -25, reverse: true, delay: 0.2, start: '#9c40ff', stop: '#ffaa40' },
		{ to: 4, curvature: -45, reverse: true, delay: 0.6, start: '#ffaa40', stop: '#0d7ab5' },
		{ to: 5, curvature: 5, delay: 1.0, start: '#004c8b', stop: '#9c40ff' }
	];
</script>

<div class="abd" bind:this={containerEl}>
	{#if containerEl && hubEl}
		{#each beams as b (b.to)}
			{#if nodeEls[b.to]}
				<AnimatedBeam
					{containerEl}
					fromEl={hubEl}
					toEl={nodeEls[b.to]}
					curvature={b.curvature}
					reverse={b.reverse}
					delay={b.delay}
					duration={4.5}
					pathColor="color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent)"
					pathWidth={2}
					pathOpacity={0.35}
					gradientStartColor={b.start}
					gradientStopColor={b.stop}
				/>
			{/if}
		{/each}
	{/if}

	<div class="abd-hub" bind:this={hubEl}>
		<span class="abd-hub__mark">SW</span>
		<span class="abd-hub__label">Smart WMS</span>
	</div>

	{#each nodes as n, i (n.id)}
		<div class="abd-node" data-i={i} bind:this={nodeEls[i]}>
			<span class="abd-node__icon" aria-hidden="true">{n.icon}</span>
			<span class="abd-node__label">{n.label}</span>
		</div>
	{/each}
</div>

<style>
	.abd {
		position: relative;
		width: 100%;
		max-width: 36rem;
		margin: 0 auto;
		aspect-ratio: 1.15 / 1;
		min-height: 22rem;
	}

	.abd-hub {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 1.25rem;
		background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 22%, var(--line, #d9e2ec));
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.04),
			0 12px 28px rgba(15, 23, 42, 0.08);
	}

	.abd-hub__mark {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: -0.03em;
		color: var(--navy, #004c8b);
	}

	.abd-hub__label {
		font-size: 0.62rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.abd-node {
		position: absolute;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		width: 4.25rem;
		height: 4.25rem;
		border-radius: 1rem;
		background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
		transform: translate(-50%, -50%);
	}

	.abd-node__icon {
		font-size: 0.95rem;
		color: var(--navy, #004c8b);
		line-height: 1;
	}

	.abd-node__label {
		font-size: 0.62rem;
		font-weight: 650;
		color: var(--slate, #5c6b7d);
		letter-spacing: -0.01em;
	}

	.abd-node[data-i='0'] { left: 18%; top: 22%; }
	.abd-node[data-i='1'] { left: 50%; top: 12%; }
	.abd-node[data-i='2'] { left: 82%; top: 22%; }
	.abd-node[data-i='3'] { left: 18%; top: 78%; }
	.abd-node[data-i='4'] { left: 50%; top: 88%; }
	.abd-node[data-i='5'] { left: 82%; top: 78%; }

	@media (max-width: 480px) {
		.abd { min-height: 18rem; }
		.abd-node { width: 3.6rem; height: 3.6rem; }
		.abd-hub { width: 4.75rem; height: 4.75rem; }
	}
</style>
