<script lang="ts" module>
	/**
	 * PrivacyBanner — cookie consent card (motion-brew, MIT).
	 * Svelte 5 port: CSS transitions + WAAPI, no motion/react.
	 */

	export interface CookieKind {
		id: string;
		label: string;
		description: string;
		/** Always on and cannot be switched off. */
		required?: boolean;
	}

	export type CookieChoices = Record<string, boolean>;

	export interface PrivacyBannerProps {
		title?: string;
		description?: string;
		/** Default: essential, analytics, marketing. */
		kinds?: CookieKind[];
		onAccept?: (choices: CookieChoices) => void;
		onReject?: (choices: CookieChoices) => void;
		onSave?: (choices: CookieChoices) => void;
		class?: string;
	}

	export const DEFAULT_KINDS: CookieKind[] = [
		{
			id: 'essential',
			label: 'Essential',
			description: 'Sign in, security and your basket.',
			required: true
		},
		{
			id: 'analytics',
			label: 'Analytics',
			description: 'Helps us see which pages work.'
		},
		{
			id: 'marketing',
			label: 'Marketing',
			description: 'Ads that match what you like.'
		}
	];

	type Done = 'accept' | 'reject' | 'save';
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		title = 'Cookies, your call',
		description = 'We use a few cookies to keep things running and to learn what works. Pick what you are happy with; you can change it any time.',
		kinds = DEFAULT_KINDS,
		onAccept,
		onReject,
		onSave,
		class: className = ''
	}: PrivacyBannerProps = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let still = $state(false);
	let shown = $state(false);
	let custom = $state(false);
	let done = $state<Done | null>(null);
	let cookieHover = $state(false);
	let checkDrawn = $state(false);

	const all = (v: boolean): CookieChoices =>
		Object.fromEntries(kinds.map((k) => [k.id, k.required ? true : v]));

	let choices = $state<CookieChoices>(all(false));

	const onCount = $derived(kinds.filter((k) => choices[k.id]).length);
	const requiredCount = $derived(kinds.filter((k) => k.required).length);
	const summary = $derived(
		done === 'accept'
			? 'All cookies are on.'
			: onCount <= requiredCount
				? 'Only the essentials are on.'
				: `${onCount} of ${kinds.length} kinds are on.`
	);

	function finish(kind: Done) {
		if (kind === 'accept') {
			choices = all(true);
			onAccept?.(choices);
		} else if (kind === 'reject') {
			choices = all(false);
			onReject?.(choices);
		} else {
			onSave?.(choices);
		}
		done = kind;
		checkDrawn = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				checkDrawn = true;
			});
		});
	}

	function setChoice(id: string, v: boolean) {
		choices = { ...choices, [id]: v };
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const el = rootEl;
		if (!el) return;
		if (still) {
			shown = true;
			return;
		}
		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) shown = true;
			},
			{ threshold: 0.4 }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<div
	bind:this={rootEl}
	role="region"
	aria-label="Cookie settings"
	class={['pb', className].filter(Boolean).join(' ')}
	class:is-in={shown || still}
	class:is-still={still}
>
	{#if done}
		<div class="pb__done">
			<span class="pb__check-wrap" aria-hidden="true">
				<svg viewBox="0 0 24 24" class="pb__check" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path
						class="pb__check-path"
						class:drawn={checkDrawn || still}
						d="M5 12.5l4.5 4.5L19 7.5"
					/>
				</svg>
			</span>
			<div class="pb__done-copy">
				<p class="pb__done-title">You are all set</p>
				<p class="pb__done-sum" role="status">{summary}</p>
			</div>
			<button
				type="button"
				class="pb__change"
				onclick={() => {
					done = null;
					custom = true;
				}}
			>
				Change
			</button>
		</div>
	{:else}
		<div class="pb__ask">
			<div class="pb__head">
				<span
					class="pb__cookie-btn"
					onpointerenter={() => (cookieHover = true)}
					onpointerleave={() => (cookieHover = false)}
					role="img"
					aria-label="Cookie"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						class="pb__cookie"
						class:hop={cookieHover && !still}
					>
						<path
							class="pb__cookie-edge"
							d={cookieHover && !still
								? 'M12 2a10 10 0 1 0 10 10 5.2 5.2 0 0 1-6-6 5.2 5.2 0 0 1-4-4'
								: 'M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5'}
						/>
						{#each [[8.5, 8.5], [16, 15.5], [12, 17], [11, 12], [7, 14.5]] as [cx, cy], i}
							<circle
								class="pb__chip"
								class:hop={cookieHover && !still}
								style:--i={i}
								cx={cx}
								cy={cy}
								r="0.6"
								fill="currentColor"
							/>
						{/each}
						{#each [0, 1] as i}
							<circle
								class="pb__crumb"
								class:fall={cookieHover && !still}
								style:--i={i}
								cx={19 + i * 2}
								cy={7 + i}
								r="0.6"
								fill="currentColor"
								stroke="none"
							/>
						{/each}
					</svg>
				</span>
				<h3 class="pb__title">{title}</h3>
			</div>
			<p class="pb__desc">{description}</p>

			{#if custom}
				<div class="pb__panel">
					<div class="pb__kinds">
						{#each kinds as k, i}
							<div class="pb__kind" style:--i={i}>
								<div class="pb__kind-copy">
									<p class="pb__kind-label">
										{k.label}
										{#if k.required}
											<span class="pb__always">Always on</span>
										{/if}
									</p>
									<p class="pb__kind-desc">{k.description}</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={!!choices[k.id]}
									aria-label={k.label}
									disabled={k.required}
									class="pb__switch"
									class:on={!!choices[k.id]}
									onclick={() => !k.required && setChoice(k.id, !choices[k.id])}
								>
									<span class="pb__knob"></span>
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="pb__actions">
				<button
					type="button"
					class="pb__btn pb__btn--ghost pb__btn--custom"
					onclick={() => (custom ? finish('save') : (custom = true))}
				>
					<span class="pb__btn-label">{custom ? 'Save choices' : 'Customize'}</span>
				</button>
				<span class="pb__spacer" aria-hidden="true"></span>
				<button type="button" class="pb__btn pb__btn--soft" onclick={() => finish('reject')}>
					Reject all
				</button>
				<button type="button" class="pb__btn pb__btn--ink pb__btn--accept" onclick={() => finish('accept')}>
					Accept all
					<span class="pb__arrow" aria-hidden="true">
						<svg class="pb__arrow-a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
						>
						<svg class="pb__arrow-b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
						>
					</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.pb {
		container-type: inline-size;
		width: 400px;
		max-width: 100%;
		overflow: hidden;
		border-radius: 24px;
		background: #fff;
		padding: 24px;
		color: #242423;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px -16px rgba(0, 0, 0, 0.18);
		opacity: 0;
		transform: translateY(40px);
		transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.pb.is-in { opacity: 1; transform: none; }
	:global(.dark) .pb,
	:global([data-theme='dark']) .pb { background: #18181b; color: #f4f4f5; }

	.pb__done {
		display: flex; align-items: center; gap: 16px;
		animation: pb-fade-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pb__check-wrap {
		display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0;
		border-radius: 999px; background: rgba(38, 154, 90, 0.1); color: #269a5a;
	}
	.pb__check { width: 24px; height: 24px; }
	.pb__check-path {
		stroke-dasharray: 24; stroke-dashoffset: 24;
		transition: stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
	}
	.pb__check-path.drawn { stroke-dashoffset: 0; }
	.pb__done-copy { min-width: 0; flex: 1; }
	.pb__done-title { margin: 0; font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; }
	.pb__done-sum { margin: 2px 0 0; font-size: 0.875rem; color: #71717a; }
	:global(.dark) .pb__done-sum, :global([data-theme='dark']) .pb__done-sum { color: #a1a1aa; }
	.pb__change {
		height: 36px; flex-shrink: 0; padding: 0 12px; border: 0; border-radius: 999px;
		background: transparent; font-size: 0.875rem; font-weight: 500; color: #71717a; cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease;
	}
	.pb__change:hover { background: rgba(36, 36, 35, 0.05); color: #242423; }

	.pb__ask { animation: pb-fade-in 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
	.pb__head { display: flex; align-items: center; gap: 12px; }
	.pb__cookie-btn {
		display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0;
		border-radius: 999px; background: rgba(36, 36, 35, 0.06); color: inherit;
	}
	:global(.dark) .pb__cookie-btn, :global([data-theme='dark']) .pb__cookie-btn { background: rgba(255, 255, 255, 0.08); }
	.pb__cookie {
		width: 20px; height: 20px; overflow: visible;
		transform: rotate(-120deg) translateX(-14px); opacity: 0;
		transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.2s, opacity 0.4s ease 0.2s;
	}
	.pb.is-in .pb__cookie { transform: none; opacity: 1; }
	.pb__cookie.hop { animation: pb-cookie-wiggle 0.45s ease; }
	.pb__chip.hop { animation: pb-chip-hop 0.35s ease; animation-delay: calc(var(--i) * 0.05s); }
	.pb__crumb { opacity: 0; }
	.pb__crumb.fall {
		animation: pb-crumb-fall 0.6s ease-in forwards;
		animation-delay: calc(0.1s + var(--i) * 0.08s);
	}
	.pb__title { margin: 0; font-size: 1.125rem; font-weight: 600; letter-spacing: -0.02em; }
	.pb__desc { margin: 12px 0 0; font-size: 1rem; line-height: 1.55; color: #71717a; }
	:global(.dark) .pb__desc, :global([data-theme='dark']) .pb__desc { color: #a1a1aa; }

	.pb__panel { margin-top: 20px; overflow: hidden; animation: pb-panel-in 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
	.pb__kinds { border-radius: 16px; background: rgba(36, 36, 35, 0.04); padding: 0 16px; }
	:global(.dark) .pb__kinds, :global([data-theme='dark']) .pb__kinds { background: rgba(255, 255, 255, 0.04); }
	.pb__kind {
		display: flex; align-items: center; gap: 12px; padding: 12px 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		animation: pb-kind-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
		animation-delay: calc(0.08s + var(--i) * 0.05s);
	}
	.pb__kind:last-child { border-bottom: 0; }
	.pb__kind-copy { min-width: 0; flex: 1; }
	.pb__kind-label { margin: 0; font-size: 0.875rem; font-weight: 500; }
	.pb__always { margin-left: 8px; font-size: 0.75rem; font-weight: 400; color: #71717a; }
	.pb__kind-desc { margin: 0; font-size: 0.75rem; color: #71717a; }

	.pb__switch {
		position: relative; display: flex; align-items: center; width: 40px; height: 24px;
		flex-shrink: 0; padding: 2px; border: 0; border-radius: 999px;
		background: rgba(36, 36, 35, 0.15); cursor: pointer; transition: background 0.3s ease;
	}
	.pb__switch.on { justify-content: flex-end; background: #242423; }
	.pb__switch:not(.on) { justify-content: flex-start; }
	.pb__switch:disabled { opacity: 0.5; cursor: not-allowed; }
	.pb__switch:focus-visible { outline: 2px solid #a1a1aa; outline-offset: 2px; }
	:global(.dark) .pb__switch.on, :global([data-theme='dark']) .pb__switch.on { background: #f4f4f5; }
	:global(.dark) .pb__switch:not(.on), :global([data-theme='dark']) .pb__switch:not(.on) { background: rgba(255, 255, 255, 0.15); }
	.pb__knob {
		display: block; width: 20px; height: 20px; border-radius: 999px; background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}
	:global(.dark) .pb__knob, :global([data-theme='dark']) .pb__knob { background: #18181b; }

	.pb__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 24px; }
	.pb__btn {
		height: 40px; padding: 0 16px; border: 0; border-radius: 999px; font-size: 0.875rem;
		font-weight: 500; cursor: pointer; white-space: nowrap;
		transition: background 0.2s ease, transform 0.15s ease;
	}
	.pb__btn:active { transform: scale(0.96); }
	.pb__btn:focus-visible { outline: 2px solid #a1a1aa; outline-offset: 2px; }
	.pb__btn--ghost { background: transparent; color: #242423; }
	.pb__btn--ghost:hover { background: rgba(36, 36, 35, 0.05); }
	:global(.dark) .pb__btn--ghost, :global([data-theme='dark']) .pb__btn--ghost { color: #f4f4f5; }
	.pb__btn--custom { order: 3; width: 100%; }
	.pb__btn--soft { flex: 1; background: rgba(36, 36, 35, 0.06); color: #242423; }
	.pb__btn--soft:hover { background: rgba(36, 36, 35, 0.1); }
	:global(.dark) .pb__btn--soft, :global([data-theme='dark']) .pb__btn--soft {
		background: rgba(255, 255, 255, 0.08); color: #f4f4f5;
	}
	.pb__btn--ink {
		flex: 1; display: inline-flex; align-items: center; justify-content: center;
		gap: 6px; background: #242423; color: #fff; padding-right: 14px;
	}
	:global(.dark) .pb__btn--ink, :global([data-theme='dark']) .pb__btn--ink {
		background: #f4f4f5; color: #242423;
	}
	.pb__spacer { display: none; flex: 1; }
	.pb__arrow { position: relative; width: 16px; height: 16px; overflow: hidden; }
	.pb__arrow-a, .pb__arrow-b { position: absolute; inset: 0; transition: transform 0.3s ease-out; }
	.pb__arrow-b { transform: translateX(-20px); }
	.pb__btn--accept:hover .pb__arrow-a { transform: translateX(20px); }
	.pb__btn--accept:hover .pb__arrow-b { transform: translateX(0); }

	@container (min-width: 20rem) {
		.pb__btn--custom { order: 0; width: auto; }
		.pb__btn--soft, .pb__btn--ink { flex: none; }
		.pb__spacer { display: block; }
	}

	@keyframes pb-fade-in {
		from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
		to { opacity: 1; transform: none; filter: none; }
	}
	@keyframes pb-panel-in {
		from { opacity: 0; max-height: 0; }
		to { opacity: 1; max-height: 320px; }
	}
	@keyframes pb-kind-in {
		from { opacity: 0; transform: translateX(-8px); }
		to { opacity: 1; transform: none; }
	}
	@keyframes pb-cookie-wiggle {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(-10deg); }
		50% { transform: rotate(6deg); }
	}
	@keyframes pb-chip-hop {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-2px); }
	}
	@keyframes pb-crumb-fall {
		from { opacity: 1; transform: translateY(0); }
		to { opacity: 0; transform: translateY(8px); }
	}

	@media (prefers-reduced-motion: reduce) {
		.pb, .pb__cookie, .pb__check-path, .pb__kind, .pb__panel, .pb__done, .pb__ask, .pb__arrow-a, .pb__arrow-b, .pb__btn {
			transition: none; animation: none;
		}
		.pb { opacity: 1; transform: none; }
		.pb.is-in .pb__cookie { opacity: 1; transform: none; }
		.pb__check-path { stroke-dashoffset: 0; }
	}
</style>
