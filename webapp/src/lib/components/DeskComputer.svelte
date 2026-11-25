<script lang="ts">
	/**
	 * Desk Computer — isometric late-90s PC you can type on, drag the mouse, load a CD.
	 * SVG is fetched at mount; desk-computer-engine.ts drives interaction and sound.
	 */
	import { onMount } from 'svelte';
	import { mountDeskComputer, type DeskEngine } from './desk-computer-engine';
	import './desk-computer.css';

	export type DeskComputerProps = {
		theme?: 'light' | 'dark';
		sound?: boolean;
		fill?: boolean;
		src?: string;
	};

	let {
		theme = 'light',
		sound = true,
		fill = false,
		src = '/library/desk-computer.svg'
	}: DeskComputerProps = $props();

	let stageEl: HTMLDivElement | null = null;
	let artEl: HTMLDivElement | null = null;
	let statusEl: HTMLSpanElement | null = null;
	let engine: DeskEngine | null = null;
	let state = $state<'loading' | 'ready' | 'failed'>('loading');

	let soundRef = sound;
	$effect(() => {
		soundRef = sound;
		engine?.setMuted(!sound);
	});

	let firstTheme = true;
	$effect(() => {
		theme; // track
		if (firstTheme) {
			firstTheme = false;
			return;
		}
		engine?.replayIntro();
	});

	onMount(() => {
		const stage = stageEl;
		const art = artEl;
		const status = statusEl;
		if (!stage || !art || !status) return;

		const abort = new AbortController();
		state = 'loading';

		fetch(src, { signal: abort.signal })
			.then((r) => {
				if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
				return r.text();
			})
			.then((markup) => {
				if (abort.signal.aborted) return;
				art.innerHTML = markup;
				const svg = art.querySelector('svg');
				if (!svg) throw new Error('the drawing has no <svg>');
				engine = mountDeskComputer({
					stage,
					svg,
					status,
					muted: !soundRef
				});
				state = 'ready';
			})
			.catch((err: unknown) => {
				if (abort.signal.aborted) return;
				console.error('[DeskComputer]', err);
				state = 'failed';
			});

		return () => {
			abort.abort();
			engine?.destroy();
			engine = null;
			art.innerHTML = '';
		};
	});
</script>

<div
	class="pdesk"
	data-theme={theme}
	data-fill={fill || undefined}
	data-ready={state === 'ready' || undefined}
>
	<div
		bind:this={stageEl}
		class="pdesk__stage"
		tabindex="0"
		role="group"
		aria-label="Desk computer. Type to search on its screen; Enter searches; Escape or the monitor's power button switches the screen. Drag the mouse; click the CD to load it."
	>
		<div bind:this={artEl}></div>
		<span bind:this={statusEl} class="pdesk__sr" role="status" aria-live="polite"></span>
	</div>

	{#if state === 'failed'}
		<p class="pdesk__error">The drawing couldn&rsquo;t be loaded from {src}.</p>
	{/if}
</div>
