<script lang="ts">
	/**
	 * DeleteButton — trash that expands to confirm/cancel.
	 * Port Svelte 5 del DeleteButton React (CSS + rAF, sin Motion).
	 */
	import type { HTMLAttributes } from 'svelte/elements';

	type Status = 'idle' | 'deleted' | 'kept';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		onConfirm?: () => void;
		onCancel?: () => void;
		class?: string;
	};

	let {
		onConfirm,
		onCancel,
		class: className = '',
		...rest
	}: Props = $props();

	const TILE = 48;
	const PANEL = 84;
	const HOLD = { deleted: 1400, kept: 600 } as const;
	const LID_OPEN = -35;
	const WALL_TOP = 6;
	const WALL_TOP_OPEN = 13.5;
	const WALL_BASE = 20;
	const HINGE = '3px 6px';
	const ACCENT = '#FF5F2E';

	let open = $state(false);
	let status = $state<Status>('idle');
	let reduced = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let wallTop = $state(WALL_TOP);
	let settleScale = $state(1);
	let checkProgress = $state(0);

	const width = $derived(open ? TILE + PANEL : TILE);
	const wallH = $derived(WALL_BASE - wallTop);
	const binPath = $derived(`M19 ${wallTop}v${wallH}a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V${wallTop}`);
	const lidRotate = $derived(open ? LID_OPEN : 0);

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			reduced = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	// Animate wall top when open changes
	$effect(() => {
		const target = open ? WALL_TOP_OPEN : WALL_TOP;
		if (reduced) {
			wallTop = target;
			return;
		}
		const from = wallTop;
		const start = performance.now();
		const dur = 560;
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / dur);
			const e = t * t * (3 - 2 * t);
			wallTop = from + (target - from) * e;
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// Status hold + settle nudge
	$effect(() => {
		if (status === 'idle') return;
		let raf = 0;
		let timeout: ReturnType<typeof setTimeout>;

		if (status === 'kept' && !reduced) {
			const start = performance.now();
			const dur = 450;
			const tick = (now: number) => {
				const t = Math.min(1, (now - start) / dur);
				const mid = t < 0.5 ? t * 2 : (1 - t) * 2;
				settleScale = 1 - 0.14 * Math.sin(mid * Math.PI);
				if (t < 1) raf = requestAnimationFrame(tick);
				else settleScale = 1;
			};
			raf = requestAnimationFrame(tick);
		}

		if (status === 'deleted' && !reduced) {
			checkProgress = 0;
			const start = performance.now();
			const dur = 450;
			const tick = (now: number) => {
				const t = Math.min(1, (now - start) / dur);
				const e = t * t * (3 - 2 * t);
				checkProgress = e;
				if (t < 1) raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
		} else if (status === 'deleted') {
			checkProgress = 1;
		}

		timeout = setTimeout(() => {
			status = 'idle';
			checkProgress = 0;
			settleScale = 1;
		}, HOLD[status]);

		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timeout);
		};
	});

	function resolve(next: Exclude<Status, 'idle'>) {
		open = false;
		status = next;
		triggerEl?.focus();
		(next === 'deleted' ? onConfirm : onCancel)?.();
	}

	function onTriggerClick() {
		if (open) {
			resolve('kept');
			return;
		}
		status = 'idle';
		open = true;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) resolve('kept');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	data-slot="delete-button"
	data-state={open ? 'open' : 'closed'}
	data-status={status}
	class="db relative h-12 rounded-2xl {className}"
	style="width: {width}px; transition: width {reduced ? '0ms' : '620ms'} cubic-bezier(0.32, 0.72, 0, 1);"
	onkeydown={onKeyDown}
	{...rest}
>
	<button
		bind:this={triggerEl}
		type="button"
		aria-label="Delete"
		aria-expanded={open}
		class="db-trigger relative z-10 grid h-12 w-12 place-items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#868593]"
		onclick={onTriggerClick}
	>
		{#if status === 'deleted'}
			<svg
				class="db-icon db-icon--done"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke={ACCENT}
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="M4 12.5 9.5 18 20 7"
					style="stroke-dasharray: 28; stroke-dashoffset: {28 * (1 - checkProgress)};"
				/>
			</svg>
		{:else}
			<svg
				class="db-icon db-icon--bin overflow-visible"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				style="transform: scale({settleScale});"
			>
				<path d={binPath} />
				<g
					style="transform-box: view-box; transform-origin: {HINGE}; transform: rotate({lidRotate}deg); transition: transform {reduced ? '0ms' : '600ms'} cubic-bezier(0.34, 1.1, 0.64, 1);"
				>
					<path d="M3 6h18" />
					<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</g>
			</svg>
		{/if}
	</button>

	<span role="status" aria-live="polite" class="sr-only">
		{status === 'deleted' ? 'Deleted' : status === 'kept' ? 'Kept' : ''}
	</span>

	{#if open}
		<div
			class="db-panel absolute inset-y-0 right-0 flex items-center justify-center gap-2 rounded-2xl"
			style="width: {PANEL}px;"
		>
			<span
				aria-hidden="true"
				class="db-notch absolute -left-[5px] top-1/2 z-20 h-2.5 w-1.5 -translate-y-1/2"
			></span>

			<button
				type="button"
				aria-label="Confirm delete"
				class="db-circle"
				onclick={() => resolve('deleted')}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke={ACCENT}
					stroke-width="3.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M4 12.5 9.5 18 20 7" />
				</svg>
			</button>

			<button
				type="button"
				aria-label="Cancel"
				class="db-circle"
				onclick={() => resolve('kept')}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M6 6 18 18M18 6 6 18" />
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	.db {
		background: #f4f4f9;
		color: #868593;
	}
	:global(.dark) .db,
	:global([data-theme='dark']) .db {
		background: #262626;
		color: #9b9aa7;
	}

	.db-trigger {
		transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.db-trigger:active {
		transform: scale(0.94);
	}

	.db-icon {
		display: block;
	}
	.db-icon--done {
		animation: db-pop 0.22s cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes db-pop {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.db-panel {
		background: #e7e7ef;
		animation: db-panel-in 0.44s cubic-bezier(0.32, 0.72, 0, 1) both;
		animation-delay: 0.14s;
	}
	:global(.dark) .db-panel,
	:global([data-theme='dark']) .db-panel {
		background: #1b1b1b;
	}
	@keyframes db-panel-in {
		from {
			opacity: 0;
			transform: translateX(-6px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.db-notch {
		background: #e7e7ef;
		clip-path: polygon(100% 0, 0 50%, 100% 100%);
	}
	:global(.dark) .db-notch,
	:global([data-theme='dark']) .db-notch {
		background: #1b1b1b;
	}

	.db-circle {
		display: grid;
		height: 1.75rem;
		width: 1.75rem;
		place-items: center;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		background: #f4f4f9;
		color: #868593;
		outline: none;
		box-shadow:
			0 0.5px 1px rgba(0, 0, 0, 0.05),
			0 1px 3px rgba(0, 0, 0, 0.08),
			inset 0 0.5px 0 rgba(255, 255, 255, 0.9);
		transition:
			background-color 0.2s,
			transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
		animation: db-circle-in 0.44s cubic-bezier(0.32, 0.72, 0, 1) both;
	}
	.db-circle:nth-of-type(1) {
		animation-delay: 0.14s;
	}
	.db-circle:nth-of-type(2) {
		animation-delay: 0.21s;
	}
	:global(.dark) .db-circle,
	:global([data-theme='dark']) .db-circle {
		background: #262626;
		color: #9b9aa7;
		box-shadow:
			0 0.5px 1px rgba(0, 0, 0, 0.35),
			0 1.5px 4px rgba(0, 0, 0, 0.25),
			inset 0 0.5px 0 rgba(255, 255, 255, 0.07);
	}
	.db-circle:hover {
		background: #fafafd;
	}
	:global(.dark) .db-circle:hover,
	:global([data-theme='dark']) .db-circle:hover {
		background: #2c2c2c;
	}
	.db-circle:active {
		transform: scale(0.84);
	}
	.db-circle:focus-visible {
		box-shadow: 0 0 0 2px #868593;
	}
	@keyframes db-circle-in {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.db,
		.db-trigger,
		.db-icon--done,
		.db-panel,
		.db-circle {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
