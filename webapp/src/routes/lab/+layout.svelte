<script lang="ts">
	/**
	 * Lab layout — sidebar scrolleable con iconos (sin auth / shell app).
	 */
	import { page } from '$app/state';

	let { children } = $props();

	let sidebarOpen = $state(false);

	/** Lucide-style single-path icons (24 viewBox). */
	const ICONS: Record<string, string> = {
		home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
		checkSquare:
			'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
		blob: 'M12 3c4 0 8 3 8 8 0 5-4 10-8 10S4 16 4 11c0-5 4-8 8-8z',
		layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
		gallery: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 14l2.5-3 2 2.5L16 10l4 6H4z',
		panels: 'M4 4h6v16H4zM14 4h6v7h-6zM14 13h6v7h-6z',
		spark: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
		mapPin: 'M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11zM12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
		bag: 'M6 7h12l1 13H5L6 7zM9 7V5a3 3 0 0 1 6 0v2',
		order: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4',
		steps: 'M4 19h4V5H4zM10 19h4v-8h-4zM16 19h4V9h-4z',
		mail: 'M4 6h16v12H4zM4 6l8 7 8-7',
		table: 'M3 5h18v14H3zM3 10h18M9 10v9M15 10v9',
		lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z',
		tag: 'M20.6 13.4 12 22l-8.6-8.6A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6zM8 8h.01',
		quote: 'M7 7h4v6H8a3 3 0 0 0 3 3v2a5 5 0 0 1-5-5V7zm8 0h4v6h-3a3 3 0 0 0 3 3v2a5 5 0 0 1-5-5V7z',
		users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 20v-1a3.5 3.5 0 0 0-2.5-3.3M16.5 4.1a3.5 3.5 0 0 1 0 6.8'
	};

	const groups = [
		{
			id: 'overview',
			label: 'Inicio',
			items: [{ href: '/lab', label: 'Overview', hint: 'Índice del lab', icon: 'home' }]
		},
		{
			id: 'cards',
			label: 'Cards & widgets',
			items: [
				{ href: '/lab/task-widget', label: 'TaskWidget', hint: 'Tarea expandible', icon: 'checkSquare' },
				{ href: '/lab/blob-card', label: 'BlobCard', hint: 'Blob cursor', icon: 'blob' },
				{ href: '/lab/sticky-cards', label: 'StickyCards', hint: 'Stack scroll', icon: 'layers' }
			]
		},
		{
			id: 'media',
			label: 'Media & galleries',
			items: [
				{ href: '/lab/hover-expand', label: 'HoverExpand', hint: 'Franja expand', icon: 'gallery' },
				{ href: '/lab/byobu', label: 'Byobu', hint: 'Carrusel 3D', icon: 'panels' },
				{ href: '/lab/disperse', label: 'Disperse', hint: 'Fragmentos', icon: 'spark' },
				{ href: '/lab/view-on-map', label: 'ViewOnMap', hint: 'Pill → mapa', icon: 'mapPin' }
			]
		},
		{
			id: 'commerce',
			label: 'Commerce',
			items: [
				{ href: '/lab/product-detail', label: 'ProductDetail', hint: 'PDP gallery + buy', icon: 'bag' },
				{ href: '/lab/order-detail', label: 'OrderDetail', hint: 'Pedido admin', icon: 'order' }
			]
		},
		{
			id: 'forms',
			label: 'Forms & inputs',
			items: [
				{ href: '/lab/onboarding', label: 'Onboarding', hint: 'Multi-paso', icon: 'steps' },
				{ href: '/lab/form-two-column', label: 'FormTwoColumn', hint: 'Contacto 2 cols', icon: 'mail' },
				{ href: '/lab/inline-table', label: 'InlineTable', hint: 'Edición fila', icon: 'table' },
				{ href: '/lab/option-picker', label: 'OptionPicker', hint: 'Private/Public', icon: 'lock' },
				{ href: '/lab/tags', label: 'Tags', hint: 'Chips multi', icon: 'tag' }
			]
		},
		{
			id: 'social',
			label: 'Social & people',
			items: [
				{ href: '/lab/testimonial', label: 'Testimonial', hint: 'Carrusel quotes', icon: 'quote' },
				{ href: '/lab/shared-tooltip', label: 'SharedTooltip', hint: 'Avatares', icon: 'users' }
			]
		}
	] as const;

	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/lab');
	const itemCount = groups.reduce((n, g) => n + g.items.length, 0);

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
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
				</svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
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
				<div class="lab-brand__meta">
					<span class="lab-brand__text">Component Lab</span>
					<span class="lab-sidebar__sub">React → Svelte · Abellis</span>
				</div>
			</a>
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
									<span class="lab-link__icon" aria-hidden="true">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
											<path d={ICONS[item.icon]} />
										</svg>
									</span>
									<span class="lab-link__text">
										<span class="lab-link__label">{item.label}</span>
										<span class="lab-link__hint">{item.hint}</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="lab-sidebar__foot">
			<span class="lab-sidebar__count">{itemCount} components</span>
			<span class="lab-sidebar__pill">lab</span>
		</div>
	</aside>

	<main class="lab-main">
		{@render children()}
	</main>
</div>

<style>
	.lab-shell {
		--lab-sidebar-w: 272px;
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
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--line, #d9e2ec);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 30;
	}

	.lab-menu-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		padding: 0;
		border: 1px solid var(--line, #d9e2ec);
		border-radius: 11px;
		background: var(--surface-2, #f5f8fc);
		color: var(--head-ink, #012a50);
		cursor: pointer;
		transition: background 140ms ease, border-color 140ms ease;
	}

	.lab-menu-btn:hover {
		background: #fff;
		border-color: color-mix(in srgb, var(--navy, #004c8b) 30%, var(--line));
	}

	.lab-top__spacer {
		flex: 1;
	}

	.lab-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.lab-brand__mark {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 9px;
		background: linear-gradient(145deg, var(--navy, #004c8b), #012a50);
		color: #fff;
		font-size: 0.72rem;
		font-weight: 700;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		letter-spacing: 0.04em;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
	}

	.lab-brand__meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.lab-brand__text {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}

	.lab-backdrop {
		position: fixed;
		inset: 0;
		z-index: 35;
		border: 0;
		background: rgba(15, 23, 42, 0.4);
		cursor: pointer;
	}

	.lab-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		width: min(var(--lab-sidebar-w), 90vw);
		height: 100dvh;
		background: var(--card, #fff);
		border-right: 1px solid var(--line, #d9e2ec);
		box-shadow: 12px 0 40px rgba(15, 23, 42, 0.1);
		transform: translateX(-105%);
		transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.lab-shell--nav-open .lab-sidebar {
		transform: translateX(0);
	}

	.lab-sidebar__head {
		flex-shrink: 0;
		padding: 1.1rem 1rem 1rem;
		border-bottom: 1px solid var(--line, #d9e2ec);
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--navy, #004c8b) 4%, #fff),
			#fff
		);
	}

	.lab-sidebar__sub {
		font-size: 0.68rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--slate, #5c6b7d);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lab-sidebar__nav {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.85rem 0.7rem 1.25rem;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--slate, #5c6b7d) 30%, transparent) transparent;
	}

	.lab-sidebar__nav::-webkit-scrollbar {
		width: 5px;
	}

	.lab-sidebar__nav::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--slate, #5c6b7d) 28%, transparent);
		border-radius: 999px;
	}

	.lab-group + .lab-group {
		margin-top: 1.15rem;
	}

	.lab-group__label {
		margin: 0 0 0.4rem;
		padding: 0 0.55rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--slate, #5c6b7d) 85%, var(--navy, #004c8b));
	}

	.lab-group__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.lab-link {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.5rem 0.55rem;
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		border: 1px solid transparent;
		transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
	}

	.lab-link:hover {
		background: var(--surface-2, #f5f8fc);
		border-color: color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}

	.lab-link--active {
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, #fff);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 22%, var(--line, #d9e2ec));
		box-shadow: inset 3px 0 0 var(--navy, #004c8b), 0 1px 2px rgba(15, 23, 42, 0.04);
	}

	.lab-link__icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 10px;
		background: var(--surface-2, #f5f8fc);
		color: var(--slate, #5c6b7d);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
		transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
	}

	.lab-link:hover .lab-link__icon {
		color: var(--navy, #004c8b);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 20%, var(--line));
	}

	.lab-link--active .lab-link__icon {
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, #fff);
		color: var(--navy, #004c8b);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 28%, var(--line));
	}

	.lab-link__text {
		display: flex;
		flex-direction: column;
		gap: 0.08rem;
		min-width: 0;
	}

	.lab-link__label {
		font-size: 0.84rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--head-ink, #012a50);
		line-height: 1.25;
	}

	.lab-link--active .lab-link__label {
		color: var(--navy, #004c8b);
	}

	.lab-link__hint {
		font-size: 0.68rem;
		color: var(--slate, #5c6b7d);
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lab-sidebar__foot {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 1rem;
		border-top: 1px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	.lab-sidebar__count {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lab-sidebar__pill {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, #fff);
		color: var(--navy, #004c8b);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 22%, transparent);
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
