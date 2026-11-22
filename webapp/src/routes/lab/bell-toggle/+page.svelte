<script lang="ts">
	/**
	 * Lab demo — BellToggle: notify toggle with ring animation and badge.
	 */
	import BellToggle from '../../../lib/components/BellToggle.svelte';

	let theme = $state<'dark' | 'light'>('dark');
	let size = $state<'sm' | 'md' | 'lg'>('md');
	let count = $state(3);
	let waves = $state(true);
	let clapper = $state(false);
	let pressed = $state(false);
	let last = $state('—');

	const colors = $derived(
		theme === 'dark'
			? {
					color: '#F5EFE9',
					background: '#3A312A',
					onColor: '#1D1814',
					onBackground: '#C9A227'
				}
			: {
					color: '#012A50',
					background: '#E8EEF5',
					onColor: '#FFF',
					onBackground: '#004C8B'
				}
	);
</script>

<svelte:head>
	<title>BellToggle · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">BellToggle · WMS</h1>
	<p class="detail-lead">
		Toggle de notificaciones con ring WAAPI, badge de contador, waves y clapper opcional. Labels
		WMS: alertas de wave / inventario.
	</p>
</section>

<div class="toolbar">
	<button type="button" class="btn" class:active={theme === 'dark'} onclick={() => (theme = 'dark')}>Dark</button>
	<button type="button" class="btn" class:active={theme === 'light'} onclick={() => (theme = 'light')}>Light</button>
	<button type="button" class="btn" class:active={size === 'sm'} onclick={() => (size = 'sm')}>sm</button>
	<button type="button" class="btn" class:active={size === 'md'} onclick={() => (size = 'md')}>md</button>
	<button type="button" class="btn" class:active={size === 'lg'} onclick={() => (size = 'lg')}>lg</button>
	<button type="button" class="btn" class:active={waves} onclick={() => (waves = !waves)}>Waves</button>
	<button type="button" class="btn" class:active={clapper} onclick={() => (clapper = !clapper)}>Clapper</button>
	<button type="button" class="btn" onclick={() => (count = count >= 12 ? 0 : count + 1)}>Count +</button>
</div>

<div class="stage" data-theme={theme}>
	{#key `${theme}-${size}-${waves}-${clapper}`}
		<BellToggle
			offLabel="Wave alerts off"
			onLabel="Wave alerts on"
			{size}
			{count}
			{waves}
			{clapper}
			color={colors.color}
			background={colors.background}
			onColor={colors.onColor}
			onBackground={colors.onBackground}
			badgeColor="#ef4444"
			onChange={(v) => {
				pressed = v;
				last = v ? 'on' : 'off';
			}}
		/>
	{/key}
</div>

<p class="hint">State: <strong>{last}</strong> · badge count: <strong>{count}</strong></p>

<style>
	.detail-intro { margin-bottom: 1.25rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 44rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}
	.toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
	.btn {
		height: 2.1rem; padding: 0 0.85rem; border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		background: transparent; color: var(--navy, #004c8b); font-size: 0.75rem; font-weight: 600; cursor: pointer;
	}
	.btn.active { background: var(--navy, #004c8b); color: #fff; border-color: transparent; }
	.stage {
		display: flex; min-height: 10rem; align-items: center; justify-content: center;
		padding: 2rem 1.5rem; border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: #1a1612;
	}
	.stage[data-theme='light'] { background: #f4f6f9; }
	.hint { margin: 0.85rem 0 0; font-size: 0.8125rem; color: var(--slate, #5c6b7d); }
	.hint strong { color: var(--head-ink, #012a50); font-weight: 600; }
</style>
