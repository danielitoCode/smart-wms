<script lang="ts">
	import HeatCalendar from '../../../lib/components/HeatCalendar.svelte';

	/** Deterministic occupancy field: weekdays fuller, weekends quieter. */
	function occupancy(week: number, day: number) {
		const s = Math.sin(week * 12.9898 + day * 78.233) * 43758.5453;
		const r = s - Math.floor(s);
		if (day >= 5) return Math.max(0, Math.min(1, (r - 0.45) * 1.2));
		return Math.max(0, Math.min(1, 0.25 + r * 0.75));
	}

	const weeks = 18;
	const values = Array.from({ length: weeks }, (_, w) =>
		Array.from({ length: 7 }, (_, d) => occupancy(w, d))
	);

	let color = $state('#f59e0b');
	let unit = $state('bins');

	const palette = [
		{ id: 'amber', hex: '#f59e0b', label: 'Amber' },
		{ id: 'navy', hex: '#004c8b', label: 'Navy' },
		{ id: 'teal', hex: '#0d9488', label: 'Teal' },
		{ id: 'rose', hex: '#e11d48', label: 'Rose' }
	] as const;
</script>

<svelte:head>
	<title>HeatCalendar · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>
	<main class="lab-main">
		<p class="lab-kicker">Charts · Occupancy</p>
		<h1 class="lab-title">HeatCalendar</h1>
		<p class="lab-lead">
			Calendario de ocupación de stock: la intensidad 0–1 colorea cada celda con un solo tono.
			Más saturado = más lleno; más translúcido = más vacío. Click ancla un rango; segundo click lo
			fija; Escape limpia. Leyenda filtra por nivel.
		</p>

		<div class="lab-tools">
			{#each palette as p}
				<button
					type="button"
					class:is-on={color === p.hex}
					style:--swatch={p.hex}
					onclick={() => (color = p.hex)}
				>
					<span class="dot"></span>
					{p.label}
				</button>
			{/each}
		</div>

		<div class="lab-card">
			<div class="lab-card-head">
				<div>
					<p class="lab-card-kicker">Warehouse occupancy</p>
					<h2 class="lab-card-title">Bins filled · last {weeks} weeks</h2>
				</div>
				<p class="lab-card-hint">
					Hover for day detail · click twice for range total
				</p>
			</div>
			<div class="lab-chart">
				<HeatCalendar
					{values}
					{weeks}
					{color}
					unit={unit}
					maxCount={100}
					label="Warehouse stock occupancy by day"
				/>
			</div>
			<ul class="lab-key">
				<li><span class="k empty"></span> Empty / low</li>
				<li><span class="k mid" style:background="color-mix(in srgb, {color} 46%, transparent)"></span> Partial</li>
				<li><span class="k full" style:background="color-mix(in srgb, {color} 94%, transparent)"></span> Near full</li>
			</ul>
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #f4f4f5;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab-head {
		max-width: 56rem;
		margin: 0 auto 1.25rem;
	}
	.back {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	.lab-main {
		max-width: 56rem;
		margin: 0 auto;
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
		margin: 0 0 1.25rem;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.72;
	}
	.lab-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.lab-tools button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: #fff;
		color: inherit;
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.lab-tools button.is-on {
		background: #18181b;
		color: #fafafa;
		border-color: #18181b;
	}
	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--swatch);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
	}
	.lab-tools button.is-on .dot {
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
	}
	.lab-card {
		padding: 1.25rem;
		border-radius: 1rem;
		background: #fff;
		border: 1px solid rgba(24, 24, 27, 0.06);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}
	.lab-card-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1.1rem;
	}
	.lab-card-kicker {
		margin: 0 0 0.2rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #71717a;
	}
	.lab-card-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.lab-card-hint {
		margin: 0;
		font-size: 0.75rem;
		color: #71717a;
	}
	.lab-chart {
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}
	.lab-key {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.75rem;
		color: #52525b;
	}
	.lab-key li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.k {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		display: inline-block;
	}
	.k.empty {
		background: color-mix(in srgb, #18181b 7%, transparent);
	}
</style>
