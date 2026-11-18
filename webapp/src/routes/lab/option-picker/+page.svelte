<script lang="ts">
	/**
	 * Lab detail — OptionPicker
	 */
	import OptionPicker from '../../../lib/components/OptionPicker.svelte';
	import type { OptionItem } from '../../../lib/components/optionPicker.types';

	const options: OptionItem[] = [
		{ id: 'private', label: 'Private', icon: 'lock' },
		{ id: 'public', label: 'Public', icon: 'globe' }
	];

	let current = $state('private');
</script>

<svelte:head>
	<title>OptionPicker · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">OptionPicker</h1>
	<p class="detail-lead">
		Selector compacto Private / Public (u otras opciones). Migrado de React + Motion a Svelte 5 + CSS.
	</p>
	<p class="detail-note">Seleccionado: <strong>{current}</strong></p>
</section>

<section class="detail-stage">
	<OptionPicker {options} value={current} onChange={(id) => (current = id)} />
</section>

<style>
	.detail-intro {
		margin-bottom: 1rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-note {
		margin: 0.75rem 0 0;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.detail-stage {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		min-height: 280px;
		padding: 3rem 1rem 4rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}
</style>
