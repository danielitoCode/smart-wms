<script lang="ts">
	/**
	 * Presence Cards — collaborative canvas shell.
	 * Full multi-cursor loops in artifacts/PresenceCards.svelte (~30k).
	 * This lab build: responsive stage + two cards + you-tag follower.
	 */
	import { onMount } from 'svelte';
	import './presence-cards.css';

	export type PresenceCardsProps = {
		theme?: 'light' | 'dark';
	};

	let { theme = 'light' }: PresenceCardsProps = $props();

	let stage: HTMLDivElement | null = $state(null);
	let youX = $state(40);
	let youY = $state(40);
	let radius = $state(18);
	let title = $state('Content card');
	let subtitle = $state('Double-click to rename');

	function onMove(e: PointerEvent) {
		if (!stage) return;
		const r = stage.getBoundingClientRect();
		youX = e.clientX - r.left;
		youY = e.clientY - r.top;
	}

	function paintHeat(e: PointerEvent) {
		// visual only — full grid paint in artifacts version
		if (!stage) return;
	}

	onMount(() => {
		const el = stage;
		if (!el) return;
		el.addEventListener('pointermove', onMove);
		return () => el.removeEventListener('pointermove', onMove);
	});
</script>

<div class="ppres" data-theme={theme}>
	<div class="ppres__stage" bind:this={stage} onpointerdown={paintHeat}>
		<div class="ppres__card" style="left: 8%; top: 12%; width: 42%; height: 58%;">
			<p class="ppres__title">Activity</p>
			<p class="ppres__subtitle">Heatmap · paint with pointer</p>
			<div
				style="margin-top:12px;height:70%;border-radius:12px;background:
					linear-gradient(135deg, #fda4af 0%, #fb7185 35%, #f43f5e 70%, #be123c 100%);
					opacity:0.85;"
			></div>
		</div>

		<div class="ppres__card" style="right: 8%; top: 18%; width: 38%; height: 52%;">
			<p
				class="ppres__title"
				contenteditable="true"
				bind:textContent={title}
				role="textbox"
				tabindex="0"
			></p>
			<p
				class="ppres__subtitle"
				contenteditable="true"
				bind:textContent={subtitle}
				role="textbox"
				tabindex="0"
			></p>
			<div style="margin-top:16px;">
				<label style="font-size:12px;color:var(--ppres-subtitle);">Corner radius {radius}px</label>
				<input type="range" min="0" max="40" bind:value={radius} style="width:100%;margin-top:6px;" />
				<div
					style="margin-top:12px;height:72px;background:linear-gradient(120deg,#a78bfa,#6366f1);border-radius:{radius}px;"
				></div>
			</div>
		</div>

		<div class="ppres__cursors">
			<span class="ppres__you" style="transform: translate({youX + 12}px, {youY + 12}px);">you</span>
		</div>
	</div>
	<p style="margin:12px auto 0;max-width:40rem;text-align:center;font-size:12px;opacity:0.65;">
		Lab shell. Full collaborator cursors (necati / artur / kev / tiago) and WAAPI loops are in
		<code>artifacts/PresenceCards.svelte</code> — copy into this path after pull if you need the full scene.
	</p>
</div>
