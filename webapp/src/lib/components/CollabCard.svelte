<script lang="ts">
	/**
	 * CollabCard — card multiplayer con cursores animados y presence stack.
	 * Port Svelte 5 (CSS, sin Motion).
	 */
	export interface Collaborator {
		name: string;
		pillBg: string;
		pillText?: string;
		cursorColor: string;
	}

	interface Props {
		greeting?: string;
		eyebrow?: string;
		intro?: string;
		conjunction?: string;
		trailing?: string;
		liveLabel?: string;
		presenceColors?: string[];
		extraCount?: number;
		collaborators?: [Collaborator, Collaborator];
		backgroundUrl?: string;
		class?: string;
	}

	const defaultCollaborators: [Collaborator, Collaborator] = [
		{ name: 'Dylan', pillBg: '#A259FF', pillText: '#fff', cursorColor: '#A259FF' },
		{ name: 'Evan', pillBg: '#FF7262', pillText: '#fff', cursorColor: '#FF7262' }
	];

	const defaultPresence = ['#A259FF', '#FF7262', '#1ABCFE', '#0ACF83'];

	let {
		greeting = 'hello!',
		eyebrow = 'Now in multiplayer',
		intro = 'editing',
		conjunction = '&',
		trailing = '',
		liveLabel = 'Live · 4 editing',
		presenceColors = defaultPresence,
		extraCount = 2,
		collaborators = defaultCollaborators,
		backgroundUrl,
		class: className = ''
	}: Props = $props();

	const [first, second] = collaborators;
	const cornerPos = ['pos-tl', 'pos-tr', 'pos-bl', 'pos-br'] as const;
</script>

<div
	class="collab {className}"
	style={backgroundUrl
		? `background-image: url(${backgroundUrl}); background-size: cover; background-position: center;`
		: undefined}
>
	{#if !backgroundUrl}
		<div class="collab-canvas" aria-hidden="true"></div>
	{/if}
	<div class="collab-glow" aria-hidden="true"></div>
	<div class="collab-dots" aria-hidden="true"></div>

	<header class="collab-header">
		<span class="collab-live">
			<span class="collab-live-dot">
				<span class="collab-live-ping"></span>
				<span class="collab-live-core"></span>
			</span>
			<span class="collab-live-label">{liveLabel}</span>
		</span>
		<ul class="collab-presence" aria-hidden="true">
			{#each presenceColors as color, index (color + index)}
				<li class="collab-swatch" style="z-index: {index + 1};">
					<span class="collab-swatch-fill" style="background-color: {color};"></span>
				</li>
			{/each}
			{#if extraCount > 0}
				<li class="collab-swatch" style="z-index: {presenceColors.length + 1};">
					<span class="collab-swatch-fill collab-swatch-fill--extra">+{extraCount}</span>
				</li>
			{/if}
		</ul>
	</header>

	<div class="collab-body">
		<p class="collab-eyebrow">{eyebrow}</p>

		<div class="collab-frame-wrap">
			<div class="collab-frame">
				{#each cornerPos as pos}
					<span class="collab-corner {pos}" aria-hidden="true"></span>
				{/each}
				<h2 class="collab-greeting">{greeting}</h2>
			</div>
			<span class="collab-cursor collab-cursor--host" aria-hidden="true">
				<svg class="collab-cursor-svg" viewBox="0 0 24 24">
					<path
						d="M4 3.2 L4 19.4 L8.6 15.2 L11.4 21.2 L14 20 L11.2 14 L17.2 13.6 Z"
						fill="currentColor"
						stroke="white"
						stroke-width="1.4"
						stroke-linejoin="round"
					/>
				</svg>
			</span>
		</div>

		<p class="collab-line">
			<span class="collab-intro">{intro}</span>
			<span class="collab-pill-wrap">
				<span class="collab-pill" style="background: {first.pillBg}; color: {first.pillText ?? '#fff'};">{first.name}</span>
				<span class="collab-cursor collab-cursor--first" style="color: {first.cursorColor};" aria-hidden="true">
					<svg class="collab-cursor-svg collab-cursor-svg--flip" viewBox="0 0 24 24">
						<path d="M4 3.2 L4 19.4 L8.6 15.2 L11.4 21.2 L14 20 L11.2 14 L17.2 13.6 Z" fill="currentColor" stroke="white" stroke-width="1.4" stroke-linejoin="round" />
					</svg>
					<span class="collab-burst collab-burst--a" data-burst=""></span>
				</span>
			</span>
			<span class="collab-conj">{conjunction}</span>
			<span class="collab-pill-wrap">
				<span class="collab-pill" style="background: {second.pillBg}; color: {second.pillText ?? '#fff'};">{second.name}</span>
				<span class="collab-cursor collab-cursor--second" style="color: {second.cursorColor};" aria-hidden="true">
					<svg class="collab-cursor-svg" viewBox="0 0 24 24">
						<path d="M4 3.2 L4 19.4 L8.6 15.2 L11.4 21.2 L14 20 L11.2 14 L17.2 13.6 Z" fill="currentColor" stroke="white" stroke-width="1.4" stroke-linejoin="round" />
					</svg>
					<span class="collab-burst collab-burst--b" data-burst=""></span>
				</span>
			</span>
			{#if trailing}<span class="collab-intro">{trailing}</span>{/if}
		</p>
	</div>
</div>

<style>
	.collab {
		container-type: inline-size;
		position: relative;
		isolation: isolate;
		aspect-ratio: 3 / 2;
		width: 100%;
		overflow: hidden;
		border-radius: 1rem;
		background: #111114;
		color: #fff;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
	}
	.collab-canvas {
		position: absolute; inset: 0; z-index: -1;
		background: linear-gradient(165deg, #18181f 0%, #0c0c10 55%, #09090c 100%);
	}
	.collab-glow {
		position: absolute; inset: 0; z-index: -1; pointer-events: none;
		background:
			radial-gradient(ellipse 70% 55% at 18% 88%, color-mix(in oklch, #a259ff 42%, transparent) 0%, transparent 70%),
			radial-gradient(ellipse 60% 50% at 88% 22%, color-mix(in oklch, #ff7262 32%, transparent) 0%, transparent 68%);
	}
	.collab-dots {
		position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.16;
		background-image: radial-gradient(rgba(255, 255, 255, 0.32) 1px, transparent 1.2px);
		background-size: 14px 14px;
		mask-image: radial-gradient(ellipse at center, black 40%, transparent 88%);
	}
	.collab-header {
		position: absolute; inset-inline: 5cqi; top: 4cqi; z-index: 10;
		display: flex; align-items: center; justify-content: space-between; gap: 2cqi;
	}
	.collab-live {
		display: flex; min-width: 0; align-items: center; gap: 1.4cqi;
		font-size: 2.4cqi; font-weight: 500; line-height: 1; color: rgba(255, 255, 255, 0.75);
	}
	.collab-live-dot { position: relative; display: inline-flex; height: 1.7cqi; width: 1.7cqi; flex-shrink: 0; }
	.collab-live-ping {
		position: absolute; inset: 0; border-radius: 9999px; background: rgba(52, 211, 153, 0.7);
		animation: collab-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.collab-live-core {
		position: relative; display: block; height: 100%; width: 100%; border-radius: 9999px;
		background: #34d399; box-shadow: 0 0 6px rgba(52, 211, 153, 0.75);
	}
	.collab-live-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
	.collab-presence { margin: 0; padding: 0; list-style: none; display: flex; align-items: center; }
	.collab-swatch { position: relative; height: 3.25cqi; width: 3.25cqi; flex-shrink: 0; }
	.collab-swatch + .collab-swatch { margin-left: -1.08cqi; }
	.collab-swatch-fill {
		display: block; height: 100%; width: 100%; border-radius: 9999px;
		box-shadow: 0 0 0 2px #0e0e12, inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}
	.collab-swatch-fill--extra {
		display: flex; align-items: center; justify-content: center;
		background: oklch(0.26 0.012 285);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 1.65cqi; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums;
		color: rgba(255, 255, 255, 0.88);
		box-shadow: 0 0 0 2px #0e0e12, inset 0 1px 0 rgba(255, 255, 255, 0.14);
	}
	.collab-body {
		position: relative; display: flex; height: 100%; width: 100%; flex-direction: column;
		align-items: center; justify-content: center; gap: 3.2cqi; padding: 9cqi 5.5cqi 5cqi;
	}
	.collab-eyebrow {
		margin: 0; max-width: 88%; text-align: center; font-size: 2.75cqi; font-weight: 500;
		line-height: 1.3; letter-spacing: -0.02em; color: #0d99ff;
	}
	.collab-frame-wrap { position: relative; width: 80%; max-width: 100%; }
	.collab-frame {
		position: relative; display: grid; place-items: center; border-radius: 1.8cqi;
		border: 2px dashed rgba(13, 153, 255, 0.75); padding: 4.2cqi 5.5cqi;
	}
	.collab-corner {
		position: absolute; height: 1.7cqi; width: 1.7cqi; border-radius: 0.25cqi; background: #111114;
		box-shadow: 0 0 0 1.5px #0d99ff, 0 2px 4px rgba(0, 0, 0, 0.35);
	}
	.pos-tl { left: -0.9cqi; top: -0.9cqi; }
	.pos-tr { right: -0.9cqi; top: -0.9cqi; }
	.pos-bl { left: -0.9cqi; bottom: -0.9cqi; }
	.pos-br { right: -0.9cqi; bottom: -0.9cqi; }
	.collab-greeting {
		margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 17.5cqi; font-weight: 500; line-height: 0.92; letter-spacing: -0.035em; color: #fff;
	}
	.collab-line {
		margin: 0; display: flex; max-width: 100%; flex-wrap: wrap; align-items: baseline;
		justify-content: center; gap: 1.2cqi 1.5cqi; font-size: 3.85cqi; font-weight: 500; line-height: 1;
		letter-spacing: -0.02em; color: rgba(255, 255, 255, 0.95);
	}
	.collab-intro { color: rgba(255, 255, 255, 0.8); }
	.collab-conj { color: rgba(255, 255, 255, 0.55); }
	.collab-pill-wrap { position: relative; display: inline-flex; align-items: center; }
	.collab-pill {
		display: inline-flex; align-items: center; border-radius: 9999px;
		padding: 0.55cqi 2.8cqi; font-size: 3.5cqi; font-weight: 600; line-height: 1;
	}
	.collab-cursor {
		display: inline-block; pointer-events: none; transform-origin: 20% 20%;
		will-change: transform; animation-fill-mode: both; color: #fff;
	}
	.collab-cursor--host {
		position: absolute; left: -2.8cqi; top: -3.6cqi;
		animation: collab-host 9s ease-in-out infinite;
	}
	.collab-cursor--first {
		position: absolute; bottom: -2.9cqi; right: -1.8cqi;
		animation: collab-first 5.5s ease-in-out infinite;
	}
	.collab-cursor--second {
		position: absolute; right: -2.8cqi; top: -3.2cqi;
		animation: collab-second 5.5s ease-in-out infinite 0.8s;
	}
	.collab-cursor-svg {
		height: 6.5cqi; width: 6.5cqi; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28));
	}
	.collab-cursor-svg--flip { transform: scaleX(-1); }
	.collab-burst {
		position: absolute; pointer-events: none; display: inline-block; height: 3cqi; width: 3cqi;
		opacity: 0; animation: collab-burst 5.5s ease-in-out infinite; animation-fill-mode: both; color: inherit;
	}
	.collab-burst--a { right: -0.7cqi; top: -0.7cqi; animation-delay: 1.1s; }
	.collab-burst--b { bottom: -0.7cqi; left: -0.7cqi; animation-delay: 2.7s; }
	.collab-burst::before {
		content: ''; position: absolute; inset: 35%; border-radius: 9999px; background: currentColor;
	}
	.collab-burst::after {
		content: ''; position: absolute; inset: 0; border-radius: 9999px;
		background: conic-gradient(
			from 0deg, transparent 0 8%, currentColor 8% 12%, transparent 12% 33%, currentColor 33% 37%,
			transparent 37% 58%, currentColor 58% 62%, transparent 62% 83%, currentColor 83% 87%, transparent 87%
		);
		mask: radial-gradient(circle, transparent 38%, black 40%, black 60%, transparent 62%);
	}
	@keyframes collab-host {
		0%, 100% { transform: translate3d(0, 0, 0) rotate(-14deg); }
		22% { transform: translate3d(54cqi, 2cqi, 0) rotate(-4deg); }
		48% { transform: translate3d(56cqi, 19cqi, 0) rotate(10deg); }
		72% { transform: translate3d(-1cqi, 21cqi, 0) rotate(-2deg); }
	}
	@keyframes collab-first {
		0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
		30% { transform: translate3d(-1.2cqi, -1cqi, 0) rotate(-5deg); }
		60% { transform: translate3d(0.8cqi, 0.6cqi, 0) rotate(3deg); }
	}
	@keyframes collab-second {
		0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
		35% { transform: translate3d(1.4cqi, -0.8cqi, 0) rotate(6deg); }
		65% { transform: translate3d(-0.6cqi, 0.6cqi, 0) rotate(-3deg); }
	}
	@keyframes collab-burst {
		0%, 14% { opacity: 0; transform: scale(0.4); }
		22% { opacity: 1; transform: scale(1); }
		34%, 100% { opacity: 0; transform: scale(1.5); }
	}
	@keyframes collab-ping {
		0% { transform: scale(1); opacity: 0.7; }
		75%, 100% { transform: scale(2.4); opacity: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.collab-cursor,
		.collab-burst,
		.collab-live-ping {
			animation: none !important;
			opacity: 1;
			transform: none;
		}
	}
</style>
