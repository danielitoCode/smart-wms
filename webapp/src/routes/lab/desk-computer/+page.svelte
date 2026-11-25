<script lang="ts">
	import DeskComputer from '../../../lib/components/DeskComputer.svelte';

	let theme = $state<'dark' | 'light'>('dark');
	let sound = $state(true);
</script>

<svelte:head>
	<title>Desk Computer · Component Lab</title>
</svelte:head>

<div class="lab" data-theme={theme}>
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<div class="lab-actions">
			<label class="sound">
				<input type="checkbox" bind:checked={sound} />
				Sound
			</label>
			<button type="button" class="theme" onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>
				{theme === 'dark' ? 'Light' : 'Dark'}
			</button>
		</div>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive</p>
		<h1 class="lab-title">Desk Computer</h1>
		<p class="lab-lead">
			Isometric late-90s PC: type into the CRT search box, drag the mouse, load a CD from the jewel
			case. Escape powers the monitor. Requires the drawing at
			<code>/library/desk-computer.svg</code>.
		</p>

		<div class="lab-demo">
			<DeskComputer {theme} {sound} />
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #0b0b0b;
		color: #e4e4e7;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab[data-theme='light'] {
		background: #f4f4f5;
		color: #18181b;
	}
	.lab-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}
	.lab-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.back,
	.theme {
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
	.sound {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
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
		margin: 0 0 1.5rem;
		max-width: 40rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-lead code {
		font-size: 0.85em;
		opacity: 0.9;
	}
	.lab-demo {
		border-radius: 16px;
		border: 1px solid color-mix(in oklch, currentColor 10%, transparent);
		overflow: hidden;
	}
</style>
