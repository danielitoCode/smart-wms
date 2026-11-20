<script lang="ts">
	/**
	 * AppSidebar — shell colapsable (icon rail) al estilo shadcn SidebarProvider.
	 * Port Svelte 5 del layout Vue (TeamSwitcher · NavMain · NavProjects · NavUser).
	 */
	import type { Snippet } from 'svelte';
	import { sidebarData } from './data';
	import TeamSwitcher from './TeamSwitcher.svelte';
	import NavMain from './NavMain.svelte';
	import NavProjects from './NavProjects.svelte';
	import NavUser from './NavUser.svelte';
	import SidebarIcons from './SidebarIcons.svelte';

	interface Props {
		children?: Snippet;
		pathname?: string;
		defaultCollapsed?: boolean;
	}

	let { children, pathname = '/', defaultCollapsed = false }: Props = $props();

	let collapsed = $state(defaultCollapsed);
	let mobileOpen = $state(false);

	function toggleCollapsed() {
		collapsed = !collapsed;
		try {
			localStorage.setItem('smartwms-nav-collapsed', collapsed ? '1' : '0');
		} catch {
			/* ignore */
		}
	}

	$effect(() => {
		try {
			const v = localStorage.getItem('smartwms-nav-collapsed');
			if (v === '1') collapsed = true;
			if (v === '0') collapsed = false;
		} catch {
			/* ignore */
		}
	});
</script>

<div class="as" data-collapsed={collapsed || undefined} data-mobile={mobileOpen || undefined}>
	{#if mobileOpen}
		<button type="button" class="as-overlay" aria-label="Cerrar menú" onclick={() => (mobileOpen = false)}></button>
	{/if}

	<aside class="as-sidebar" aria-label="Navegación">
		<div class="as-header">
			<TeamSwitcher teams={sidebarData.teams} {collapsed} />
		</div>
		<div class="as-content">
			<NavMain items={sidebarData.navMain} {collapsed} {pathname} />
			<NavProjects projects={sidebarData.projects} {collapsed} {pathname} />
		</div>
		<div class="as-footer">
			<NavUser user={sidebarData.user} {collapsed} />
		</div>
		<button
			type="button"
			class="as-rail"
			title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
			aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
			onclick={toggleCollapsed}
		></button>
	</aside>

	<div class="as-inset">
		<header class="as-topbar">
			<div class="as-topbar__left">
				<button type="button" class="as-trigger as-trigger--mobile" aria-label="Abrir menú" onclick={() => (mobileOpen = !mobileOpen)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
					</svg>
				</button>
				<button type="button" class="as-trigger as-trigger--desktop" aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} onclick={toggleCollapsed}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<path d="M4 7h16M4 12h10M4 17h16" stroke-linecap="round" />
					</svg>
				</button>
				<span class="as-breadcrumb">Smart WMS</span>
			</div>
			<div class="as-topbar__right">
				<button type="button" class="as-icon-btn" title="Notificaciones" aria-label="Notificaciones">
					<SidebarIcons name="bell" size={16} />
				</button>
			</div>
		</header>

		<main class="as-main">
			{#if children}
				{@render children()}
			{:else}
				<div class="as-placeholder">
					<p class="as-placeholder__kicker">SidebarInset</p>
					<h1>Contenido de la vista</h1>
					<p>Shell colapsable listo: almacén, grupos de nav, en curso y usuario.</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.as {
		--as-w: 16.5rem;
		--as-w-icon: 3.5rem;
		--as-ease: cubic-bezier(0.22, 1, 0.36, 1);
		display: flex;
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}
	.as-sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		width: var(--as-w);
		flex-shrink: 0;
		background: color-mix(in srgb, var(--card, #fff) 94%, transparent);
		border-right: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		transition: width 0.32s var(--as-ease);
		z-index: 20;
	}
	.as[data-collapsed] .as-sidebar { width: var(--as-w-icon); }
	.as-header { flex-shrink: 0; border-bottom: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent); }
	.as-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0.35rem 0; }
	.as-footer { flex-shrink: 0; border-top: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent); }
	.as-rail {
		display: none; position: absolute; top: 0; right: -3px; width: 6px; height: 100%;
		border: 0; background: transparent; cursor: ew-resize; z-index: 5;
	}
	.as-rail:hover { background: color-mix(in srgb, var(--navy, #004c8b) 18%, transparent); }
	@media (min-width: 900px) { .as-rail { display: block; } }
	.as-inset { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.as-topbar {
		display: flex; align-items: center; justify-content: space-between; height: 3.5rem;
		padding: 0 1rem; border-bottom: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 70%, transparent); backdrop-filter: blur(12px);
		transition: height 0.28s var(--as-ease);
	}
	.as[data-collapsed] .as-topbar { height: 3rem; }
	.as-topbar__left { display: flex; align-items: center; gap: 0.5rem; }
	.as-topbar__right { display: flex; align-items: center; gap: 0.35rem; }
	.as-trigger {
		display: inline-flex; align-items: center; justify-content: center;
		width: 2.1rem; height: 2.1rem; border-radius: 9px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 80%, transparent);
		color: var(--head-ink, #012a50); cursor: pointer;
	}
	.as-trigger:hover { border-color: color-mix(in srgb, var(--navy, #004c8b) 30%, transparent); }
	.as-trigger--mobile { display: inline-flex; }
	.as-trigger--desktop { display: none; }
	@media (min-width: 900px) {
		.as-trigger--mobile { display: none; }
		.as-trigger--desktop { display: inline-flex; }
	}
	.as-breadcrumb {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700; font-size: 0.9rem; letter-spacing: -0.02em; color: var(--head-ink, #012a50);
	}
	.as-icon-btn {
		display: inline-flex; align-items: center; justify-content: center;
		width: 2.1rem; height: 2.1rem; border-radius: 9px; border: 1px solid transparent;
		background: transparent; color: var(--slate, #5c6b7d); cursor: pointer;
	}
	.as-icon-btn:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		color: var(--navy, #004c8b);
	}
	.as-main { flex: 1; padding: 1.25rem; overflow: auto; }
	.as-placeholder {
		max-width: 36rem; padding: 1.5rem; border-radius: 14px;
		border: 1px dashed color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 70%, transparent);
	}
	.as-placeholder__kicker {
		margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700;
		letter-spacing: 0.1em; text-transform: uppercase; color: var(--navy, #004c8b);
	}
	.as-placeholder h1 {
		margin: 0 0 0.5rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.35rem; font-weight: 700; color: var(--head-ink, #012a50);
	}
	.as-placeholder p { margin: 0; font-size: 0.9rem; line-height: 1.55; color: var(--slate, #5c6b7d); }
	.as-overlay { display: none; }
	@media (max-width: 899px) {
		.as-sidebar {
			position: fixed; top: 0; left: 0; bottom: 0; width: min(18rem, 88vw);
			transform: translateX(-105%); transition: transform 0.3s var(--as-ease);
			box-shadow: 12px 0 40px rgba(15, 23, 42, 0.12);
		}
		.as[data-mobile] .as-sidebar { transform: translateX(0); }
		.as[data-collapsed] .as-sidebar { width: min(18rem, 88vw); }
		.as-overlay {
			display: block; position: fixed; inset: 0; z-index: 15;
			border: 0; background: rgba(15, 23, 42, 0.35); cursor: pointer;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.as-sidebar, .as-topbar { transition: none; }
	}
</style>
