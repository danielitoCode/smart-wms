<script lang="ts">
	/**
	 * Lab layout — sidebar con lista scrolleable de componentes (sin auth / shell app).
	 */
	import { page } from '$app/state';

	let { children } = $props();

	let sidebarOpen = $state(false);

	const groups = [
		{
			id: 'overview',
			label: 'Inicio',
			items: [{ href: '/lab', label: 'Overview', hint: 'Índice del lab' }]
		},
		{
			id: 'cards',
			label: 'Cards & widgets',
			items: [
				{ href: '/lab/task-widget', label: 'TaskWidget', hint: 'Tarea expandible' },
				{ href: '/lab/blob-card', label: 'BlobCard', hint: 'Blob cursor' },
				{ href: '/lab/sticky-cards', label: 'StickyCards', hint: 'Stack scroll' }
			]
		},
		{
			id: 'media',
			label: 'Media & galleries',
			items: [
				{ href: '/lab/hover-expand', label: 'HoverExpand', hint: 'Franja expand' },
				{ href: '/lab/byobu', label: 'Byobu', hint: 'Carrusel 3D' },
				{ href: '/lab/disperse', label: 'Disperse', hint: 'Fragmentos' },
				{ href: '/lab/view-on-map', label: 'ViewOnMap', hint: 'Pill → mapa' }
			]
		},
		{
			id: 'commerce',
			label: 'Commerce',
			items: [
				{ href: '/lab/product-detail', label: 'ProductDetail', hint: 'PDP gallery + buy' }
			]
		},
		{
			id: 'forms',
			label: 'Forms & inputs',
			items: [
				{ href: '/lab/onboarding', label: 'Onboarding', hint: 'Multi-paso' },
				{ href: '/lab/form-two-column', label: 'FormTwoColumn', hint: 'Contacto 2 cols' },
				{ href: '/lab/inline-table', label: 'InlineTable', hint: 'Edición fila' },
				{ href: '/lab/option-picker', label: 'OptionPicker', hint: 'Private/Public' },
				{ href: '/lab/tags', label: 'Tags', hint: 'Chips multi' }
			]
		},
		{
			id: 'social',
			label: 'Social & people',
			items: [
				{ href: '/lab/testimonial', label: 'Testimonial', hint: 'Carrusel quotes' },
				{ href: '/lab/shared-tooltip', label: 'SharedTooltip', hint: 'Avatares' }
			]
		}
	] as const;

	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/lab');

	function isActive(href: string) {
		const h = href.replace(/\/$/, '') || '/lab';
		return path === h;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	$effect(() => {
		void page.url.pathname;
		sidebarOpen = false;
	});
</script>

<div class="lab-shell" class:lab-shell--nav-open={sidebarOpen}>
	<header class="lab-top">
		<button
			type="button"
			class="lab-menu-btn"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			aria-expanded={sidebarOpen}
			aria-controls="lab-sidebar"
			aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
		>
			{#if sidebarOpen}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
				</svg>
			{/if}
		</button>
		<a href="/lab" class="lab-brand lab-brand--top" onclick={closeSidebar}>
			<span class="lab-brand__mark">UI</span>
			<span class="lab-brand__text">Component Lab</span>
		</a>
		<span class="lab-top__spacer"></span>
	</header>

	{#if sidebarOpen}
		<button type="button" class="lab-backdrop" aria-label="Cerrar menú" onclick={closeSidebar}></button>
	{/if}

	<aside id="lab-sidebar" class="lab-sidebar" aria-label="Componentes del lab">
		<div class="lab-sidebar__head">
			<a href="/lab" class="lab-brand" onclick={closeSidebar}>
				<span class="lab-brand__mark">UI</span>
				<span class="lab-brand__text">Component Lab</span>
			</a>
			<p class="lab-sidebar__sub">React → Svelte · tokens Abellis</p>
		</div>

		<nav class="lab-sidebar__nav">
			{#each groups as group (group.id)}
				<div class="lab-group">
					<p class="lab-group__label">{group.label}</p>
					<ul class="lab-group__list">
						{#each group.items as item (item.href)}
							<li>
								<a
									href={item.href}
									class="lab-link"
									class:lab-link--active={isActive(item.href)}
									aria-current={isActive(item.href) ? 'page' : undefined}
									onclick={closeSidebar}
								>
									<span class="lab-link__label">{item.label}</span>
									<span class="lab-link__hint">{item.hint}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="lab-sidebar__foot">
			<span class="lab-sidebar__count">{groups.reduce((n, g) => n + g.items.length, 0)} items</span>
		</div>
	</aside>

	<main class="lab-main">
		{@render children()}
	</main>
</div>

<style>
	.lab-shell {
		--lab-sidebar-w: 260px;
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: auto 1fr;
	}

	.lab-top {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		position: sticky;
		top: 0;
		z-index: 30;
	}

	.lab-menu-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 1px solid var(--line, #d9e2ec);
		border-radius: 10px;
		background: var(--surface-2, #f5f8fc);
		color: var(--ink, #132234);
		cursor: pointer;
	}

	.lab-top__spacer {
		flex: 1;
	}

	.lab-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		text-decoration: none;
		color: inherit;
		font-weight: 600;
	}

	.lab-brand__mark {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: var(--navy, #004c8b);
		color: #fff;
		font-size: 0.7rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		letter-spacing: 0.02em;
	}

	.lab-brand__text {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		color: var(--head-ink, #012a50);
	}

	.lab-backdrop {
		position: fixed;
		inset: 0;
		z-index: 35;
		border: 0;
		background: rgba(15, 23, 42, 0.35);
		cursor: pointer;
	}

	.lab-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		width: min(var(--lab-sidebar-w), 88vw);
		height: 100dvh;
		background: var(--card, #fff);
		border-right: 1px solid var(--line, #d9e2ec);
		box-shadow: 8px 0 32px rgba(15, 23, 42, 0.08);
		transform: translateX(-105%);
		transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.lab-shell--nav-open .lab-sidebar {
		transform: translateX(0);
	}

	.lab-sidebar__head {
		flex-shrink: 0;
		padding: 1.15rem 1.1rem 0.85rem;
		border-bottom: 1px solid var(--line, #d9e2ec);
	}

	.lab-sidebar__sub {
		margin: 0.45rem 0 0;
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--slate, #5c6b7d);
	}

	.lab-sidebar__nav {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.75rem 0.65rem 1rem;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--slate, #5c6b7d) 35%, transparent) transparent;
	}

	.lab-sidebar__nav::-webkit-scrollbar {
		width: 6px;
	}

	.lab-sidebar__nav::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--slate, #5c6b7d) 30%, transparent);
		border-radius: 999px;
	}

	.lab-group + .lab-group {
		margin-top: 1rem;
	}

	.lab-group__label {
		margin: 0 0 0.35rem;
		padding: 0 0.55rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lab-group__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.lab-link {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.65rem;
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		transition: background 140ms ease, color 140ms ease;
	}

	.lab-link:hover {
		background: var(--surface-2, #f5f8fc);
	}

	.lab-link--active {
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, var(--surface-2, #f5f8fc));
		box-shadow: inset 3px 0 0 var(--navy, #004c8b);
	}

	.lab-link__label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.lab-link--active .lab-link__label {
		color: var(--navy, #004c8b);
	}

	.lab-link__hint {
		font-size: 0.7rem;
		color: var(--slate, #5c6b7d);
		line-height: 1.3;
	}

	.lab-sidebar__foot {
		flex-shrink: 0;
		padding: 0.75rem 1.1rem;
		border-top: 1px solid var(--line, #d9e2ec);
	}

	.lab-sidebar__count {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lab-main {
		min-width: 0;
		padding: 1.25rem 1rem 2.5rem;
	}

	@media (min-width: 900px) {
		.lab-shell {
			grid-template-columns: var(--lab-sidebar-w) 1fr;
			grid-template-rows: 1fr;
		}

		.lab-top {
			display: none;
		}

		.lab-backdrop {
			display: none;
		}

		.lab-sidebar {
			position: sticky;
			top: 0;
			transform: none;
			box-shadow: none;
			width: var(--lab-sidebar-w);
			height: 100dvh;
			grid-row: 1;
			grid-column: 1;
		}

		.lab-main {
			grid-column: 2;
			padding: 2rem 2rem 4rem;
			max-width: 1100px;
		}

		.lab-brand--top {
			display: none;
		}
	}
</style>
