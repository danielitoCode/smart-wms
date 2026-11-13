<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';
	import type { ThemeState } from '../ui/theme.svelte';

	const i18n = getContext<I18nState>('i18n');
	const theme = getContext<ThemeState>('theme');
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={() => theme.toggle()}
	aria-label={theme.isDark ? i18n.t('Cambiar a tema claro') : i18n.t('Cambiar a tema oscuro')}
	title={theme.isDark ? i18n.t('Tema claro') : i18n.t('Tema oscuro')}
	aria-pressed={theme.isDark}
>
	<span class="track" aria-hidden="true">
		<span class="thumb" class:dark={theme.isDark}>
			{#if theme.isDark}
				<!-- moon -->
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 14.3A9 9 0 1 1 9.7 3a7 7 0 0 0 11.3 11.3z" />
				</svg>
			{:else}
				<!-- sun -->
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			{/if}
		</span>
	</span>
	<span class="label">{theme.isDark ? i18n.t('Oscuro') : i18n.t('Claro')}</span>
</button>

<style>
	.theme-toggle {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.55rem 0.25rem 0.3rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
		font: 600 0.72rem var(--body);
		transition:
			border-color var(--motion-fast, 140ms) var(--ease-out, ease),
			background var(--motion-fast, 140ms) var(--ease-out, ease);
	}

	.theme-toggle:hover {
		border-color: var(--lightblue, #8fb4da);
		background: var(--surface-2);
	}

	.track {
		position: relative;
		width: 2.35rem;
		height: 1.35rem;
		border-radius: 999px;
		background: var(--surface-3);
		border: 1px solid var(--line-soft);
		overflow: hidden;
	}

	.thumb {
		position: absolute;
		top: 1px;
		left: 1px;
		width: 1.15rem;
		height: 1.15rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--navy);
		color: #fff;
		transition: transform var(--motion-base, 200ms) var(--ease-out, ease), background var(--motion-fast, 140ms) ease;
	}

	.thumb.dark {
		transform: translateX(1rem);
		background: var(--gold);
		color: var(--navy-deep);
	}

	.label {
		min-width: 2.6rem;
		color: var(--slate);
		text-align: left;
	}

	@media (max-width: 520px) {
		.label {
			display: none;
		}
		.theme-toggle {
			padding: 0.25rem;
		}
	}
</style>
