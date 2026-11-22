<script lang="ts">
	/**
	 * Lab demo — AnimatedCounter: rueda de dígitos, separators, prefix/suffix.
	 */
	import AnimatedCounter from '../../../lib/components/AnimatedCounter.svelte';

	let value = $state(1247);
	let decimals = $state(0);
	let duration = $state(0.6);
	let separator = $state(',');
	let decimalSeparator = $state('.');
	let grouping = $state<'western' | 'indian'>('western');
	let padStart = $state(1);

	const presets = [
		{ label: '+1', delta: 1 },
		{ label: '+10', delta: 10 },
		{ label: '+100', delta: 100 },
		{ label: '+1k', delta: 1000 },
		{ label: '−1', delta: -1 },
		{ label: '−10', delta: -10 },
		{ label: '−100', delta: -100 },
		{ label: 'Random', delta: 0 }
	] as const;

	function apply(delta: number) {
		if (delta === 0) {
			value = Math.floor(Math.random() * 999_999);
			return;
		}
		value = Math.max(0, value + delta);
	}

	function setMoney() {
		decimals = 2;
		value = 12890.5;
		padStart = 1;
	}

	function setPlain() {
		decimals = 0;
		value = 42;
		padStart = 2;
	}
</script>

<svelte:head>
	<title>AnimatedCounter · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">AnimatedCounter</h1>
	<p class="detail-lead">
		Contador con rueda de dígitos, spring CSS, mask de fundido, separadores western/indian,
		prefix/suffix y prefers-reduced-motion.
	</p>
</section>

<div class="stage">
	<div class="display">
		<AnimatedCounter
			{value}
			{decimals}
			{duration}
			{padStart}
			{separator}
			{decimalSeparator}
			{grouping}
			prefix="$"
			class="display-num"
		/>
	</div>

	<div class="controls">
		<div class="row">
			{#each presets as p}
				<button type="button" class="btn" onclick={() => apply(p.delta)}>{p.label}</button>
			{/each}
		</div>

		<div class="row">
			<button type="button" class="btn btn--ghost" onclick={setMoney}>Money (2 dec)</button>
			<button type="button" class="btn btn--ghost" onclick={setPlain}>Pad 2</button>
		</div>

		<label class="field">
			<span>Value</span>
			<input type="number" bind:value step="any" />
		</label>

		<label class="field">
			<span>Decimals</span>
			<input type="number" bind:value={decimals} min="0" max="6" />
		</label>

		<label class="field">
			<span>Duration (s)</span>
			<input type="number" bind:value={duration} min="0.05" max="3" step="0.05" />
		</label>

		<label class="field">
			<span>Pad start</span>
			<input type="number" bind:value={padStart} min="1" max="8" />
		</label>

		<label class="field">
			<span>Grouping</span>
			<select bind:value={grouping}>
				<option value="western">Western (1,000,000)</option>
				<option value="indian">Indian (10,00,000)</option>
			</select>
		</label>

		<label class="field">
			<span>Thousands</span>
			<input type="text" bind:value={separator} maxlength="2" />
		</label>

		<label class="field">
			<span>Decimal</span>
			<input type="text" bind:value={decimalSeparator} maxlength="2" />
		</label>
	</div>

	<div class="samples">
		<div class="sample">
			<span class="sample-label">Plain</span>
			<AnimatedCounter value={999} duration={0.5} class="sample-num" />
		</div>
		<div class="sample">
			<span class="sample-label">EUR</span>
			<AnimatedCounter
				value={4200.5}
				decimals={2}
				separator="."
				decimalSeparator=","
				duration={0.7}
				suffix=" €"
				class="sample-num"
			/>
		</div>
		<div class="sample">
			<span class="sample-label">Indian</span>
			<AnimatedCounter
				value={1000000}
				grouping="indian"
				separator=","
				duration={0.8}
				class="sample-num"
			/>
		</div>
		<div class="sample">
			<span class="sample-label">Negative</span>
			<AnimatedCounter value={-384} duration={0.55} class="sample-num" />
		</div>
	</div>
</div>

<style>
	.detail-intro {
		margin-bottom: 1.25rem;
	}
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover {
		text-decoration: underline;
	}
	.detail-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.stage {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		padding: 1.5rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, var(--navy, #004c8b) 2%);
	}

	.display {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 5.5rem;
		padding: 1.25rem;
		border-radius: 12px;
		background: #0b0f14;
		color: #f4f6f8;
	}
	.display :global(.display-num) {
		font-size: clamp(2.25rem, 6vw, 3.5rem);
		font-weight: 600;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.75rem 1rem;
		align-items: end;
	}
	.row {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.btn {
		height: 2.25rem;
		padding: 0 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--navy, #004c8b);
		color: #fff;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:hover {
		filter: brightness(1.08);
	}
	.btn--ghost {
		background: transparent;
		color: var(--navy, #004c8b);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--slate, #5c6b7d);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.field input,
	.field select {
		height: 2.25rem;
		padding: 0 0.65rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: #fff;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--head-ink, #012a50);
		text-transform: none;
		letter-spacing: 0;
	}

	.samples {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 0.75rem;
	}
	.sample {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.85rem 1rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
		background: #fff;
	}
	.sample-label {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}
	.sample :global(.sample-num) {
		font-size: 1.35rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}
</style>
