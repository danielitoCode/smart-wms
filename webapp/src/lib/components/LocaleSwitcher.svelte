<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';

	const i18n = getContext<I18nState>('i18n');

	/** ISO 3166-1 alpha-2 de la bandera asociada a cada idioma de la app. */
	const locales = [
		{ code: 'it', label: 'Italiano', country: 'it', alt: 'Italia' },
		{ code: 'es', label: 'Español', country: 'es', alt: 'España' },
		{ code: 'en', label: 'English', country: 'gb', alt: 'United Kingdom' }
	] as const;

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();

	const current = $derived(locales.find((l) => l.code === i18n.locale) ?? locales[0]);

	function flagSrc(country: string, size: 16 | 32 | 48 = 16) {
		const h = size === 16 ? 12 : size === 32 ? 24 : 36;
		return `https://flagcdn.com/${size}x${h}/${country}.png`;
	}

	function select(code: string) {
		i18n.setLocale(code);
		open = false;
	}

	function onDocClick(e: MouseEvent) {
		if (!rootEl) return;
		if (!rootEl.contains(e.target as Node)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="locale" bind:this={rootEl}>
	<button
		type="button"
		class="trigger"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={i18n.t('Idioma')}
		onclick={() => (open = !open)}
	>
		<img
			class="flag"
			src={flagSrc(current.country, 16)}
			srcset={`${flagSrc(current.country, 32)} 2x, ${flagSrc(current.country, 48)} 3x`}
			width="16"
			height="12"
			alt={current.alt}
			loading="lazy"
			decoding="async"
		/>
		<span class="code">{current.code.toUpperCase()}</span>
		<span class="chev" aria-hidden="true">▾</span>
	</button>

	{#if open}
		<ul class="menu" role="listbox" aria-label={i18n.t('Idioma')}>
			{#each locales as loc}
				<li role="option" aria-selected={loc.code === i18n.locale}>
					<button
						type="button"
						class="option"
						class:active={loc.code === i18n.locale}
						onclick={() => select(loc.code)}
					>
						<img
							class="flag"
							src={flagSrc(loc.country, 16)}
							srcset={`${flagSrc(loc.country, 32)} 2x, ${flagSrc(loc.country, 48)} 3x`}
							width="16"
							height="12"
							alt={loc.alt}
							loading="lazy"
							decoding="async"
						/>
						<span class="name">{loc.label}</span>
						{#if loc.code === i18n.locale}
							<span class="check" aria-hidden="true">✓</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.locale {
		position: relative;
		display: inline-block;
	}

	.trigger {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0 0.65rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
		font: 600 0.78rem var(--body);
		transition:
			border-color var(--motion-fast, 140ms) var(--ease-out, ease),
			background var(--motion-fast, 140ms) var(--ease-out, ease);
	}

	.trigger:hover,
	.trigger[aria-expanded='true'] {
		border-color: var(--lightblue, #8fb4da);
		background: var(--surface-2);
	}

	.flag {
		flex: none;
		display: block;
		width: 16px;
		height: 12px;
		border-radius: 2px;
		object-fit: cover;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--line) 70%, transparent);
	}

	.code {
		letter-spacing: 0.04em;
		color: var(--ink);
	}

	.chev {
		font-size: 0.65rem;
		color: var(--slate);
		opacity: 0.85;
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		z-index: 60;
		min-width: 11.5rem;
		margin: 0;
		padding: 0.35rem;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		box-shadow: var(--shadow-2);
		animation: menu-in var(--motion-base, 200ms) var(--ease-out, ease) both;
	}

	.option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-height: 40px;
		padding: 0.4rem 0.55rem;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--ink);
		font: 500 0.86rem var(--body);
		cursor: pointer;
		text-align: left;
	}

	.option:hover {
		background: var(--surface-selected, var(--surface-2));
	}

	.option.active {
		background: var(--surface-selected, var(--surface-2));
		font-weight: 600;
	}

	.name {
		flex: 1;
	}

	.check {
		color: var(--navy);
		font-size: 0.85rem;
	}

	:global(:root[data-theme='dark']) .check {
		color: var(--gold);
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu {
			animation: none;
		}
	}
</style>
