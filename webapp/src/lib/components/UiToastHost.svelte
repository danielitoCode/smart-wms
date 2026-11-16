<script lang="ts">
	import { toastStore, type ToastTone } from '../ui/toast.svelte';

	let expanded = $state(false);
	let pinned = $state(false);

	const PEEK = 11;
	const VISIBLE_BEHIND = 2;
	const GAP = 10;
	const CARD_H = 78;

	const laidOut = $derived(toastStore.items);
	const open = $derived((expanded || pinned) && laidOut.length > 1);

	const stackHeight = $derived(
		open
			? laidOut.length * CARD_H + Math.max(laidOut.length - 1, 0) * GAP
			: CARD_H + Math.min(Math.max(laidOut.length - 1, 0), VISIBLE_BEHIND) * PEEK
	);

	function toneLabel(tone: ToastTone): string {
		switch (tone) {
			case 'success':
				return 'OK';
			case 'warning':
				return '!';
			case 'error':
				return '×';
			default:
				return 'i';
		}
	}

	function relativeTime(createdAt: number): string {
		const sec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
		if (sec < 5) return 'ahora';
		if (sec < 60) return `${sec}s`;
		const min = Math.floor(sec / 60);
		return `${min}m`;
	}

	function onHostEnter(e: PointerEvent) {
		if (e.pointerType === 'mouse') expanded = true;
	}

	function onHostLeave(e: PointerEvent) {
		if (e.pointerType === 'mouse') expanded = false;
	}

	function dismiss(id: number) {
		toastStore.dismiss(id);
		if (laidOut.length <= 2) pinned = false;
	}
</script>

{#if laidOut.length > 0}
	<div
		class="stack-host"
		class:open
		onpointerenter={onHostEnter}
		onpointerleave={onHostLeave}
		onfocusin={() => (expanded = true)}
		onfocusout={(e) => {
			const next = e.relatedTarget;
			if (!(next instanceof Node) || !e.currentTarget.contains(next)) {
				expanded = false;
			}
		}}
	>
		<div class="stack-header">
			<p class="stack-title">
				Notificaciones
				<span class="count">{laidOut.length}</span>
			</p>
			{#if laidOut.length > 1}
				<button
					type="button"
					class="toggle"
					aria-expanded={open}
					onclick={() => (pinned = !pinned)}
				>
					{open ? 'Menos' : 'Ver todas'}
				</button>
			{/if}
		</div>

		<ol class="stack-list" aria-label="Notificaciones" style="height: {stackHeight}px">
			{#each laidOut as item, index (item.id)}
				{@const depth = index}
				{@const hiddenBehind = !(open || depth <= VISIBLE_BEHIND)}
				{@const scale = open ? 1 : 1 - depth * 0.045}
				{@const y = open
					? depth * (CARD_H + GAP)
					: depth === 0
						? 0
						: CARD_H + depth * PEEK - CARD_H * scale}
				<li
					class="stack-item"
					data-tone={item.tone}
					style="
						transform: translateY({y}px) scale({scale});
						opacity: {hiddenBehind ? 0 : 1};
						z-index: {laidOut.length - depth};
						pointer-events: {hiddenBehind ? 'none' : 'auto'};
					"
				>
					<article
						class="card"
						class:muted={!open && depth > 0}
						class:front={depth === 0}
						role="status"
						tabindex={hiddenBehind ? -1 : 0}
						aria-label="{item.title ?? item.tone}: {item.message}"
						onclick={() => {
							if (!open && laidOut.length > 1) pinned = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Delete' || e.key === 'Backspace') {
								e.preventDefault();
								if (!e.repeat) dismiss(item.id);
							}
						}}
					>
						<div class="card-body" class:faded={!open && depth > 0}>
							<span class="icon" data-tone={item.tone} aria-hidden="true">
								{toneLabel(item.tone)}
							</span>
							<div class="copy">
								<div class="row">
									<p class="title">{item.title ?? 'Aviso'}</p>
									<span class="time">{relativeTime(item.createdAt)}</span>
								</div>
								<p class="body">{item.message}</p>
							</div>
						</div>
						<button
							type="button"
							class="dismiss"
							aria-label="Cerrar"
							tabindex={hiddenBehind ? -1 : 0}
							onclick={(e) => {
								e.stopPropagation();
								dismiss(item.id);
							}}
						>
							<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
								<path
									d="M2 2l8 8M10 2L2 10"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
						</button>
					</article>
				</li>
			{/each}
		</ol>
	</div>
{/if}

<style>
	.stack-host {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 120;
		width: min(22.5rem, calc(100vw - 2rem));
		font-family: var(--body, system-ui);
		pointer-events: none;
	}

	.stack-host > * {
		pointer-events: auto;
	}

	.stack-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 1.75rem;
		margin-bottom: 0.55rem;
		padding: 0 0.2rem;
	}

	.stack-title {
		margin: 0;
		font: 600 0.8125rem var(--body, system-ui);
		color: var(--ink);
	}

	.count {
		margin-left: 0.4rem;
		font-weight: 500;
		color: var(--slate);
		font-variant-numeric: tabular-nums;
	}

	.toggle {
		border: 0;
		border-radius: 0.4rem;
		padding: 0.2rem 0.5rem;
		background: transparent;
		color: var(--slate);
		font: 500 0.78rem var(--body, system-ui);
		cursor: pointer;
	}

	.toggle:hover {
		background: color-mix(in srgb, var(--navy) 10%, transparent);
		color: var(--ink);
	}

	.stack-list {
		position: relative;
		list-style: none;
		margin: 0;
		padding: 0;
		outline: none;
		transition: height 0.32s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.stack-item {
		position: absolute;
		inset-inline: 0;
		top: 0;
		transform-origin: top center;
		transition:
			transform 0.32s cubic-bezier(0.23, 1, 0.32, 1),
			opacity 0.28s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.card {
		position: relative;
		display: flex;
		gap: 0.75rem;
		min-height: 4.6rem;
		padding: 0.85rem 0.95rem;
		border-radius: 1rem;
		border: 1px solid var(--line);
		background: var(--card);
		color: var(--ink);
		box-shadow:
			0 10px 28px -18px color-mix(in srgb, var(--navy) 55%, transparent),
			0 1px 0 color-mix(in srgb, #fff 8%, transparent) inset;
		outline: none;
		cursor: default;
		user-select: none;
	}

	.card.front {
		cursor: pointer;
	}

	.card:focus-visible {
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--gold) 55%, transparent),
			0 10px 28px -18px color-mix(in srgb, var(--navy) 55%, transparent);
	}

	.card-body {
		display: flex;
		gap: 0.7rem;
		min-width: 0;
		flex: 1;
		transition: opacity 0.2s ease;
	}

	.card-body.faded {
		opacity: 0;
	}

	.icon {
		flex: none;
		width: 2rem;
		height: 2rem;
		border-radius: 0.55rem;
		display: grid;
		place-items: center;
		font: 700 0.8rem / 1 var(--disp, system-ui);
		color: #fff;
		background: var(--navy);
	}

	.icon[data-tone='success'] {
		background: var(--success, #1e7a46);
	}

	.icon[data-tone='warning'] {
		background: var(--warning, #b7791f);
		color: #1a1200;
	}

	.icon[data-tone='error'] {
		background: var(--danger, #b3322b);
	}

	.icon[data-tone='info'] {
		background: var(--navy);
	}

	.copy {
		min-width: 0;
		flex: 1;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.title {
		margin: 0;
		font: 600 0.875rem / 1.25 var(--body, system-ui);
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time {
		flex: none;
		font: 500 0.7rem / 1 var(--body, system-ui);
		color: var(--slate);
		font-variant-numeric: tabular-nums;
	}

	.body {
		margin: 0.2rem 0 0;
		font: 500 0.8125rem / 1.35 var(--body, system-ui);
		color: var(--slate);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.dismiss {
		position: absolute;
		top: -0.4rem;
		left: -0.4rem;
		width: 1.4rem;
		height: 1.4rem;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--card);
		color: var(--slate);
		opacity: 0;
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}

	.card:hover .dismiss,
	.card:focus-within .dismiss {
		opacity: 1;
	}

	.dismiss:hover {
		color: var(--ink);
		background: color-mix(in srgb, var(--navy) 8%, var(--card));
	}

	.card.muted .dismiss {
		display: none;
	}

	.stack-item[data-tone='error'] .card {
		border-color: color-mix(in srgb, var(--danger, #b3322b) 35%, var(--line));
	}

	.stack-item[data-tone='success'] .card {
		border-color: color-mix(in srgb, var(--success, #1e7a46) 30%, var(--line));
	}

	.stack-item[data-tone='warning'] .card {
		border-color: color-mix(in srgb, var(--warning, #b7791f) 30%, var(--line));
	}

	.stack-item[data-tone='info'] .card {
		border-color: color-mix(in srgb, var(--navy) 28%, var(--line));
	}

	@media (max-width: 520px) {
		.stack-host {
			right: 0.75rem;
			left: 0.75rem;
			bottom: 0.75rem;
			width: auto;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stack-list,
		.stack-item {
			transition: none;
		}
	}
</style>
