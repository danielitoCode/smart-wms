<script lang="ts">
	import Chips from '../../../lib/components/Chips.svelte';

	let theme = $state<'light' | 'dark'>('light');
	let rows = $state<2 | 3 | 4>(2);
	let selected = $state<string | null>('start');
	let sound = $state(true);
</script>

<svelte:head>
	<title>Chips · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="lab" data-theme={theme}>
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<div class="lab-tools">
			<label class="tog">
				<input type="checkbox" bind:checked={sound} />
				Sound
			</label>
			<select bind:value={rows} aria-label="Rows">
				<option value={2}>2 rows</option>
				<option value={3}>3 rows</option>
				<option value={4}>4 rows</option>
			</select>
			<button type="button" class="theme" onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>
				{theme === 'dark' ? 'Light' : 'Dark'}
			</button>
		</div>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive</p>
		<h1 class="lab-title">Chips</h1>
		<p class="lab-lead">
			3D chips with a real press: the lip shrinks as the face travels onto its edge. Selected stays
			pressed and inverted. {#if selected}<strong>{selected}</strong>{:else}<em>none</em>{/if}
		</p>

		<div class="lab-demo">
			<Chips
				{theme}
				{rows}
				{sound}
				defaultValue="start"
				onChange={(v) => (selected = v)}
			/>
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #f4f2ee;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.lab[data-theme='dark'] {
		background: #121110;
		color: #e4e4e7;
	}
	.lab-head {
		width: 100%;
		max-width: 56rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}
	.lab-tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.back,
	.theme,
	.lab-tools select {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, currentColor 18%, transparent);
		background: color-mix(in oklch, currentColor 6%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	.tog {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.lab-main {
		width: 100%;
		max-width: 56rem;
	}
	.lab-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.lab-lead {
		margin: 0 0 1.75rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-demo {
		width: 100%;
	}
</style>
