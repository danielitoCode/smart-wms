<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';
	import SessionLockIllustration from './SessionLockIllustration.svelte';

	const i18n = getContext<I18nState>('i18n');

	let {
		status = 'checking',
		message = null,
		onRetry
	}: {
		status?: 'checking' | 'error';
		message?: string | null;
		onRetry?: () => void;
	} = $props();

	const HINTS = [
		'Estableciendo canal seguro…',
		'Comprobando sesión y permisos…',
		'Sincronizando contexto de almacén…',
		'Preparando el escritorio…'
	] as const;

	let hintIndex = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (status !== 'checking') {
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
			return;
		}
		hintIndex = 0;
		timer = setInterval(() => {
			hintIndex = Math.min(hintIndex + 1, HINTS.length - 1);
		}, 520);
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	const hint = $derived(i18n.t(HINTS[hintIndex] ?? HINTS[0]));
</script>

<section class="boot" class:error={status === 'error'} aria-busy={status === 'checking'} role="status">
	<div class="panel">
		<div class="illust-wrap" class:pulse={status === 'checking'}>
			<SessionLockIllustration height="160" />
		</div>

		<p class="eyebrow">ABELLIS · Smart WMS</p>

		{#if status === 'checking'}
			<h1>{i18n.t('Validando sesión')}</h1>
			<p class="hint" aria-live="polite">
				{#key hintIndex}
					<span>{hint}</span>
				{/key}
			</p>
			<div class="track" aria-hidden="true">
				<span class="bar"></span>
			</div>
			<ul class="dots" aria-hidden="true">
				{#each [0, 1, 2] as i}
					<li class:active={i === hintIndex % 3}></li>
				{/each}
			</ul>
		{:else}
			<h1>{i18n.t('No se pudo validar la sesión')}</h1>
			<p class="msg" role="alert">{message ?? i18n.t('No se pudo conectar con el servidor')}</p>
			{#if onRetry}
				<button type="button" class="primary" onclick={onRetry}>{i18n.t('Reintentar')}</button>
			{/if}
		{/if}
	</div>
</section>

<style>
	.boot {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background:
			radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--lightblue, #8fb4da) 18%, transparent), transparent 55%),
			radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--gold) 10%, transparent), transparent 50%),
			var(--bg);
		color: var(--ink);
	}

	.panel {
		width: min(22rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		text-align: center;
		animation: rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.illust-wrap {
		width: 100%;
		display: grid;
		place-items: center;
		margin-bottom: 0.25rem;
	}

	.illust-wrap.pulse {
		animation: soft-pulse 2.4s ease-in-out infinite;
	}

	.eyebrow {
		margin: 0;
		font: 600 var(--fs-xs, 0.72rem) var(--disp, system-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--navy);
	}

	h1 {
		margin: 0;
		font: 600 var(--fs-xl, 1.25rem) / 1.25 var(--disp, system-ui);
		color: var(--head-ink, var(--navy-deep));
	}

	.hint, .msg {
		margin: 0;
		min-height: 1.4em;
		color: var(--slate);
		font: 500 var(--fs-md, 0.9rem) / 1.45 var(--body, system-ui);
	}

	.hint span {
		display: inline-block;
		animation: fade-in 280ms ease-out both;
	}

	.track {
		width: min(12rem, 70%);
		height: 3px;
		border-radius: 99px;
		overflow: hidden;
		background: var(--line);
		margin-top: 0.35rem;
	}

	.bar {
		display: block;
		height: 100%;
		width: 40%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--navy), var(--gold));
		animation: slide 1.15s ease-in-out infinite;
	}

	.dots {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0;
		display: flex;
		gap: 0.4rem;
	}

	.dots li {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--line);
		transition: background 200ms ease, transform 200ms ease;
	}

	.dots li.active {
		background: var(--gold);
		transform: scale(1.25);
	}

	button.primary {
		margin-top: 0.5rem;
		min-height: 42px;
		padding: 0.55rem 1.2rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: var(--navy);
		color: #fff;
		font: 600 0.9rem var(--body);
		cursor: pointer;
	}

	button.primary:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	@keyframes rise {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes slide {
		0% { transform: translateX(-120%); }
		100% { transform: translateX(320%); }
	}
	@keyframes soft-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.88; }
	}

	@media (prefers-reduced-motion: reduce) {
		.panel, .hint span, .bar, .illust-wrap.pulse { animation: none; }
	}
</style>
