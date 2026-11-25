<script lang="ts">
	/**
	 * Presence Cards — full interactive port lives in project artifacts.
	 * Copy artifacts/PresenceCards.svelte over this file for the complete demo
	 * (heatmap, radius handles, text edit, four cursor loops, you-tag).
	 * CSS: presence-cards.css · Lab: /lab/presence-cards
	 */
	import { onMount } from 'svelte';
	import './presence-cards.css';

	let {
		theme = 'light',
		fill = false,
		autoplay = true
	}: {
		theme?: 'light' | 'dark';
		fill?: boolean;
		autoplay?: boolean;
	} = $props();

	let root: HTMLDivElement | null = null;

	onMount(() => {
		void autoplay;
		if (root) root.dataset.ready = '1';
	});
</script>

<div
	class="ppres"
	data-theme={theme}
	data-fill={fill || undefined}
	data-layout="wide"
	bind:this={root}
	role="group"
	aria-label="Presence Cards"
>
	<div class="ppres__blooms" aria-hidden="true">
		<i class="ppres__bloom ppres__bloom--1"></i>
		<i class="ppres__bloom ppres__bloom--2"></i>
		<i class="ppres__bloom ppres__bloom--3"></i>
		<i class="ppres__bloom ppres__bloom--4"></i>
		<i class="ppres__bloom ppres__bloom--5"></i>
	</div>
	<div
		class="ppres__stage"
		style="width:960px;height:520px;display:flex;align-items:center;justify-content:center"
	>
		<p
			style="opacity:0.65;font:500 14px Inter,system-ui,sans-serif;max-width:28rem;text-align:center;padding:2rem;line-height:1.5"
		>
			Full <strong>PresenceCards.svelte</strong> is in project
			<code>artifacts/PresenceCards.svelte</code> (~30k). Copy it to
			<code>webapp/src/lib/components/PresenceCards.svelte</code> to enable heatmap painting,
			radius handles, palette cycling, text selection/edit, and the four collaborator cursors.
		</p>
	</div>
</div>
