<script lang="ts" module>
	/**
	 * ContactCard — inline Contact link that lifts a popover card (motion-brew, MIT).
	 * Sample avatar: Unsplash placeholder — replace via `avatar` prop.
	 */
	export interface ContactCardProps {
		label?: string;
		name?: string;
		role?: string;
		avatar?: string;
		email?: string;
		linkedin?: string;
		bookHref?: string;
		onBook?: () => void;
		bookLabel?: string;
		available?: boolean;
		class?: string;
	}

	const CLOSE_DELAY = 220;
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		label = 'Contact',
		name = 'Maya Lindqvist',
		role = 'Design lead',
		avatar = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces',
		email = 'maya@studio.co',
		linkedin = 'https://www.linkedin.com/',
		bookHref,
		onBook,
		bookLabel = 'Book a call',
		available = true,
		class: className = ''
	}: ContactCardProps = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let firstBtn: HTMLButtonElement | null = $state(null);
	let still = $state(false);
	let open = $state(false);
	let copied = $state(false);
	let fromKeys = false;
	let timer = 0;
	let copyTimer = 0;

	const id = `cc-${Math.random().toString(36).slice(2, 9)}`;
	const linkedinLabel = $derived(
		linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
	);

	function show() {
		window.clearTimeout(timer);
		open = true;
	}
	function hideSoon() {
		window.clearTimeout(timer);
		timer = window.setTimeout(() => (open = false), CLOSE_DELAY);
	}
	function hideNow() {
		window.clearTimeout(timer);
		open = false;
	}

	async function copy() {
		try {
			await navigator.clipboard?.writeText(email);
		} catch {
			/* still show feedback */
		}
		copied = true;
		window.clearTimeout(copyTimer);
		copyTimer = window.setTimeout(() => (copied = false), 1600);
	}

	function onBookClick() {
		if (!bookHref) onBook?.();
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return () => {
			window.clearTimeout(timer);
			window.clearTimeout(copyTimer);
		};
	});

	$effect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			if (!rootEl?.contains(e.target as Node)) hideNow();
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') hideNow();
		};
		document.addEventListener('pointerdown', away);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', esc);
		};
	});

	$effect(() => {
		if (!open || !fromKeys) return;
		fromKeys = false;
		requestAnimationFrame(() => firstBtn?.focus());
	});
</script>

<div
	bind:this={rootEl}
	class={['cc', className].filter(Boolean).join(' ')}
	class:is-open={open}
	class:is-still={still}
	onpointerenter={(e) => e.pointerType === 'mouse' && show()}
	onpointerleave={(e) => e.pointerType === 'mouse' && hideSoon()}
	onblur={(e) => {
		const to = e.relatedTarget as Node | null;
		if (to && !rootEl?.contains(to)) hideSoon();
	}}
>
	{#if open}
		<div id="{id}-card" role="dialog" aria-label="Contact {name}" class="cc__pop">
			<div class="cc__card">
				<div class="cc__head">
					<span class="cc__avatar-wrap">
						<img src={avatar} alt="" draggable="false" class="cc__avatar" />
						{#if available}
							<span class="cc__dot" aria-hidden="true">
								{#if !still}<span class="cc__dot-pulse"></span>{/if}
								<span class="cc__dot-core"></span>
							</span>
						{/if}
					</span>
					<span class="cc__who">
						<span class="cc__name">{name}</span>
						<span class="cc__role">{role}</span>
					</span>
					{#if available}<span class="cc__badge">Available</span>{/if}
				</div>

				<div class="cc__block">
					<button
						bind:this={firstBtn}
						type="button"
						class="cc__row"
						onclick={copy}
						aria-label={copied ? 'Email copied' : `Copy ${email}`}
					>
						<span class="cc__disc" aria-hidden="true">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg
							>
						</span>
						<span class="cc__row-body">
							<span class="cc__row-k">Email</span>
							<span class="cc__row-v-wrap">
								<span class="cc__row-v">{copied ? 'Copied to clipboard' : email}</span>
							</span>
						</span>
						<span class="cc__action" class:ok={copied} aria-hidden="true">
							{#if copied}
								<svg class="cc__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
									><path d="M4 12 9 17L20 6" /></svg
								>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
									><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg
								>
							{/if}
						</span>
					</button>
					<div class="cc__sep"></div>
					<a href={linkedin} target="_blank" rel="noreferrer" class="cc__row">
						<span class="cc__disc" aria-hidden="true">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg
							>
						</span>
						<span class="cc__row-body">
							<span class="cc__row-k">LinkedIn</span>
							<span class="cc__row-v">{linkedinLabel}</span>
						</span>
						<span class="cc__action" aria-hidden="true">
							<svg class="cc__up" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
								><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg
							>
						</span>
					</a>
				</div>

				{#if bookHref}
					<a href={bookHref} class="cc__book">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
							><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg
						>
						{bookLabel}
						<span class="cc__through" aria-hidden="true">
							<svg class="cc__arr-a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
								><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
							>
							<svg class="cc__arr-b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
								><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
							>
						</span>
					</a>
				{:else}
					<button type="button" class="cc__book" onclick={onBookClick}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
							><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg
						>
						{bookLabel}
						<span class="cc__through" aria-hidden="true">
							<svg class="cc__arr-a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
								><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
							>
							<svg class="cc__arr-b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
								><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
							>
						</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<button
		type="button"
		class="cc__trigger"
		aria-expanded={open}
		aria-controls={open ? `${id}-card` : undefined}
		onclick={() => (open ? hideNow() : show())}
		onfocus={() => {
			fromKeys = true;
			show();
		}}
	>
		<span class="cc__label">
			{label}
			<span class="cc__underline" class:on={open} aria-hidden="true"></span>
		</span>
		<span class="cc__chev" class:on={open} aria-hidden="true">
			<svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
				><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg
			>
		</span>
	</button>
</div>

<style>
	.cc { position: relative; display: inline-flex; font-family: ui-sans-serif, system-ui, sans-serif; }
	.cc__pop {
		position: absolute; bottom: 100%; left: 50%; z-index: 30; width: 340px;
		max-width: calc(100vw - 1rem); padding-bottom: 12px; transform: translateX(-50%);
		transform-origin: 50% 100%; animation: cc-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cc.is-still .cc__pop { animation: none; }
	.cc__card {
		border-radius: 24px; background: #fff; padding: 20px; text-align: left;
		font-size: 1rem; font-weight: 400; line-height: 1.5; color: #18181b;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 20px 44px -16px rgba(0, 0, 0, 0.3);
		outline: 1px solid rgba(0, 0, 0, 0.05);
	}
	:global(.dark) .cc__card, :global([data-theme='dark']) .cc__card {
		background: #18181b; color: #f4f4f5; outline-color: rgba(255, 255, 255, 0.1);
	}
	.cc__head { display: flex; align-items: center; gap: 12px; }
	.cc__avatar-wrap { position: relative; flex-shrink: 0; }
	.cc__avatar { width: 48px; height: 48px; border-radius: 999px; object-fit: cover; background: #e4e4e7; }
	.cc__dot {
		position: absolute; right: 0; bottom: 0; display: grid; place-items: center;
		width: 14px; height: 14px; border-radius: 999px; background: #fff;
	}
	:global(.dark) .cc__dot, :global([data-theme='dark']) .cc__dot { background: #18181b; }
	.cc__dot-pulse {
		position: absolute; width: 70%; height: 70%; border-radius: 999px; background: #269a5a;
		animation: cc-pulse 1.6s ease-out infinite;
	}
	.cc__dot-core { position: relative; width: 70%; height: 70%; border-radius: 999px; background: #269a5a; }
	.cc__who { min-width: 0; flex: 1; }
	.cc__name {
		display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		font-size: 1.125rem; font-weight: 600; line-height: 1.5; letter-spacing: -0.02em;
	}
	.cc__role {
		display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		font-size: 0.875rem; color: #71717a;
	}
	.cc__badge {
		flex-shrink: 0; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem;
		font-weight: 500; color: #1f7a48; background: rgba(38, 154, 90, 0.1);
	}
	.cc__block { margin-top: 16px; padding: 4px; border-radius: 16px; background: #f4f4f5; }
	:global(.dark) .cc__block, :global([data-theme='dark']) .cc__block { background: rgba(255, 255, 255, 0.06); }
	.cc__sep { height: 1px; margin: 0 12px; background: rgba(228, 228, 231, 0.8); }
	.cc__row {
		display: flex; width: 100%; align-items: center; gap: 12px; padding: 10px 12px;
		border: 0; border-radius: 12px; background: transparent; text-align: left;
		color: inherit; text-decoration: none; cursor: pointer; font: inherit;
		transition: background 0.2s ease;
	}
	.cc__row:hover { background: rgba(255, 255, 255, 0.7); }
	:global(.dark) .cc__row:hover, :global([data-theme='dark']) .cc__row:hover { background: rgba(255, 255, 255, 0.06); }
	.cc__row:focus-visible { outline: 2px solid #a1a1aa; outline-offset: 1px; }
	.cc__disc {
		display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0;
		border-radius: 999px; background: #fff; color: #3f3f46; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}
	:global(.dark) .cc__disc, :global([data-theme='dark']) .cc__disc { background: #27272a; color: #e4e4e7; }
	.cc__row-body { min-width: 0; flex: 1; }
	.cc__row-k { display: block; font-size: 0.75rem; color: #71717a; }
	.cc__row-v-wrap { display: block; height: 20px; overflow: hidden; }
	.cc__row-v {
		display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		font-size: 0.875rem; font-weight: 500; line-height: 20px;
	}
	.cc__action {
		display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0;
		border-radius: 999px; color: #71717a; transition: background 0.2s ease, color 0.2s ease;
	}
	.cc__row:hover .cc__action { background: #fff; color: #18181b; }
	.cc__action.ok { color: #269a5a; }
	.cc__up { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
	.cc__row:hover .cc__up { transform: rotate(45deg); }
	.cc__check { animation: cc-check-in 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
	.cc__book {
		display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
		height: 48px; margin-top: 16px; border: 0; border-radius: 999px; background: #242423;
		color: #fff; font-size: 0.875rem; font-weight: 500; text-decoration: none; cursor: pointer;
		transition: transform 0.15s ease;
	}
	.cc__book:active { transform: scale(0.98); }
	.cc__book:focus-visible { outline: 2px solid #a1a1aa; outline-offset: 2px; }
	:global(.dark) .cc__book, :global([data-theme='dark']) .cc__book { background: #fff; color: #18181b; }
	.cc__through { position: relative; width: 16px; height: 16px; overflow: hidden; }
	.cc__arr-a, .cc__arr-b { position: absolute; inset: 0; transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1); }
	.cc__arr-b { transform: translateX(-140%); }
	.cc__book:hover .cc__arr-a { transform: translateX(140%); }
	.cc__book:hover .cc__arr-b { transform: translateX(0); transition-delay: 75ms; }
	.cc__trigger {
		display: inline-flex; align-items: baseline; gap: 0.12em; padding: 0; border: 0;
		border-radius: 6px; background: transparent; color: inherit; font: inherit;
		letter-spacing: inherit; cursor: pointer; outline: none;
	}
	.cc__trigger:focus-visible { outline: 2px solid #a1a1aa; outline-offset: 4px; }
	.cc__trigger:active { transform: scale(0.97); }
	.cc__label { position: relative; }
	.cc__underline {
		position: absolute; inset-inline: 0; bottom: -0.06em; height: 0.07em; border-radius: 999px;
		background: currentColor; transform: scaleX(0); transform-origin: left;
		transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cc__underline.on, .cc__trigger:hover .cc__underline { transform: scaleX(1); }
	.cc__chev {
		display: grid; align-self: center; transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cc__chev.on { transform: rotate(-45deg); }
	@keyframes cc-in {
		from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.94); filter: blur(6px); }
		to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: none; }
	}
	@keyframes cc-pulse { from { transform: scale(1); opacity: 0.5; } to { transform: scale(2); opacity: 0; } }
	@keyframes cc-check-in {
		from { opacity: 0; transform: scale(0.4) rotate(-45deg); }
		to { opacity: 1; transform: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.cc__pop, .cc__dot-pulse, .cc__check, .cc__chev, .cc__underline, .cc__arr-a, .cc__arr-b, .cc__up {
			animation: none; transition: none;
		}
		.cc__pop { opacity: 1; filter: none; transform: translateX(-50%); }
	}
</style>
