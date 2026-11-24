<script lang="ts">
	/**
	 * LunaNavbar — floating glass nav with category mega-menu, search, mobile drawer.
	 * No Base UI / Phosphor — native state + inline SVG.
	 */
	import type { LunaCategory, LunaLink, LunaProduct } from './luna-catalog';
	import { LUNA_LINKS } from './luna-catalog';

	type Props = {
		links?: typeof LUNA_LINKS;
		categories: LunaCategory[];
		navLinks: LunaLink[];
		products: LunaProduct[];
	};

	let {
		links = LUNA_LINKS,
		categories,
		navLinks,
		products
	}: Props = $props();

	let catOpen = $state(false);
	let searchOpen = $state(false);
	let mobileOpen = $state(false);
	let query = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let catBtn = $state<HTMLButtonElement | null>(null);

	const term = $derived(query.trim().toLowerCase());

	type SearchItem = { label: string; href: string; region?: string; search: string };

	const groups = $derived.by(() => {
		const productItems: SearchItem[] = products.map((p) => ({
			label: p.label,
			href: p.href,
			region: p.region,
			search: `${p.label} ${p.region} ${p.keywords?.join(' ') ?? ''}`
		}));
		const catItems: SearchItem[] = categories.map((c) => ({
			label: c.label,
			href: c.href,
			search: `${c.label} ${c.description}`
		}));
		const pageItems: SearchItem[] = [
			{ label: 'Browse all products', href: links.store, search: 'Browse all products' },
			...navLinks.map((l) => ({ label: l.label, href: l.href, search: l.label })),
			{ label: 'Sign in', href: links.signIn, search: 'Sign in' },
			{ label: 'Create account', href: links.join, search: 'Create account' }
		];
		const filter = (items: SearchItem[]) =>
			items.filter((item) => !term || item.search.toLowerCase().includes(term));
		return [
			{ label: 'Products', items: filter(productItems) },
			{ label: 'Categories', items: filter(catItems) },
			{ label: 'Pages', items: filter(pageItems) }
		];
	});

	const resultCount = $derived(groups.reduce((n, g) => n + g.items.length, 0));

	function openSearch() {
		searchOpen = true;
		query = '';
		requestAnimationFrame(() => searchInput?.focus());
	}
	function closeSearch() {
		searchOpen = false;
		query = '';
	}
	function closeMobile() {
		mobileOpen = false;
	}
	function closeCat() {
		catOpen = false;
	}

	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (searchOpen) closeSearch();
				if (mobileOpen) closeMobile();
				if (catOpen) closeCat();
				return;
			}
			if (e.defaultPrevented || e.repeat) return;
			if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
			e.preventDefault();
			if (searchOpen) closeSearch();
			else openSearch();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!catOpen) return;
		const away = (e: PointerEvent) => {
			const t = e.target as Node;
			if (catBtn?.contains(t)) return;
			const mega = document.querySelector('.lh-mega-wrap');
			if (mega?.contains(t)) return;
			catOpen = false;
		};
		document.addEventListener('pointerdown', away);
		return () => document.removeEventListener('pointerdown', away);
	});

	const iconPaths: Record<string, string> = {
		games: 'M6 12h4m4 0h4M9 9v6m6-6v6M4 8h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z',
		software: 'M4 6h16v12H4V6zm2 2v8h12V8H6z',
		subscriptions: 'M4 12a8 8 0 0 1 14-5.5M20 12a8 8 0 0 1-14 5.5M16 4l2 3-3 1M8 20l-2-3 3-1',
		gifts: 'M12 8v13m0-13H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8zM5 12h14v9H5v-9z',
		assets: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 5.5L7 11v5l5 2.8 5-2.8v-5l-5-2.5z',
		topups: 'M12 2v20M8 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7'
	};
</script>

<header class="lh-header">
	<div class="lh-navbar">
		<a class="lh-brand" href={links.home} aria-label="Luna home">
			<svg viewBox="0 0 56 40" aria-hidden="true" focusable="false" class="lh-brand-mark">
				<path
					d="M43 0C50.1797 6.44277e-07 56 5.8203 56 13C56 20.1797 50.1797 26 43 26H34.4844L48.4844 40H31.5156L15.7578 24.2422C14.672 23.1564 14 21.6569 14 20C14 16.6863 16.6863 14 20 14H43C43.5523 14 44 13.5523 44 13C44 12.4477 43.5523 12 43 12H20C15.5817 12 12 15.5817 12 20C12 22.3901 13.0482 24.5347 14.71 26H14.6875L28.6875 40H20C8.95431 40 0 31.0457 0 20C0 8.95431 8.9543 0 20 0H43Z"
					fill="currentColor"
				/>
				<path d="M56 28V40H51.3125L39.3125 28H56Z" fill="currentColor" />
			</svg>
			<span>Luna</span>
		</a>

		<nav class="lh-desktop-nav lh-glass" aria-label="Primary navigation">
			<div class="lh-cat-root" style="position:relative">
				<button
					bind:this={catBtn}
					type="button"
					class="lh-nav-link"
					data-open={catOpen ? '' : undefined}
					aria-expanded={catOpen}
					onclick={() => (catOpen = !catOpen)}
				>
					Categories
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
						<path d="m6 9 6 6 6-6" />
					</svg>
				</button>
				{#if catOpen}
					<div class="lh-mega-wrap">
						<div class="lh-mega lh-glass" role="dialog" aria-label="Categories">
							<div class="lh-mega-links">
								<p class="lh-menu-label">Shop by category</p>
								<div class="lh-category-grid">
									{#each categories as category}
										<a class="lh-category-link" href={category.href} onclick={closeCat}>
											<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d={iconPaths[category.icon]} />
											</svg>
											<span>
												<strong>{category.label}</strong>
												<span>{category.description}</span>
											</span>
										</a>
									{/each}
								</div>
								<a class="lh-all-categories" href={links.categories} onclick={closeCat}>
									Browse all categories
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
								</a>
							</div>
							<a class="lh-featured" href={links.store} onclick={closeCat}>
								<div class="lh-featured-art" aria-hidden="true">
									<div class="lh-featured-pixels"></div>
									<span class="lh-featured-glyph">
										<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
											<path d="M6 12h4m4 0h4M9 9v6m6-6v6M4 8h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
										</svg>
									</span>
									<span class="lh-featured-caption">Games, ready to play</span>
								</div>
								<strong>
									Your next game, delivered
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
								</strong>
								<span>Browse digital products and check region details before you buy.</span>
							</a>
						</div>
					</div>
				{/if}
			</div>
			{#each navLinks as link}
				<a class="lh-nav-link" href={link.href}>{link.label}</a>
			{/each}
		</nav>

		<div class="lh-nav-actions">
			<button type="button" class="lh-search-trigger lh-glass" aria-label="Search" aria-keyshortcuts="Meta+K Control+K" onclick={openSearch}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
				</svg>
				<span>Search</span>
				<kbd>Ctrl K</kbd>
			</button>
			<a class="lh-button lh-sign-in" href={links.signIn}>Sign In</a>
			<button type="button" class="lh-menu-trigger lh-icon-button lh-glass" aria-label="Open navigation menu" onclick={() => (mobileOpen = true)}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M4 7h16M4 12h16M4 17h16" />
				</svg>
			</button>
		</div>
	</div>
</header>

{#if searchOpen}
	<button type="button" class="lh-dialog-backdrop" aria-label="Close search" onclick={closeSearch}></button>
	<div class="lh-search-dialog" role="dialog" aria-modal="true" aria-label="Search Luna">
		<div class="lh-search-field">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
			</svg>
			<input
				bind:this={searchInput}
				type="search"
				aria-label="Search products, categories and pages"
				placeholder="Search products, categories and pages..."
				bind:value={query}
			/>
			<button type="button" class="lh-icon-button" aria-label="Close search" onclick={closeSearch}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</div>
		<div class="lh-search-results">
			<p class="lh-sr-only" role="status">{resultCount} results</p>
			{#if resultCount === 0}
				<p class="lh-search-empty">No results found. Try a product or category name.</p>
			{:else}
				{#each groups as group}
					{#if group.items.length > 0}
						<div>
							<p class="lh-menu-label">{group.label}</p>
							{#each group.items as item}
								<a class="lh-search-result" href={item.href} onclick={closeSearch}>
									<span>{item.label}</span>
									{#if item.region}<span class="lh-region">{item.region}</span>{/if}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
								</a>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</div>
{/if}

{#if mobileOpen}
	<button type="button" class="lh-dialog-backdrop" aria-label="Close menu" onclick={closeMobile}></button>
	<div class="lh-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation">
		<div class="lh-mobile-heading">
			<h2>Luna</h2>
			<button type="button" class="lh-icon-button" aria-label="Close navigation menu" onclick={closeMobile}>
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</div>
		<nav aria-label="Mobile navigation" class="lh-mobile-links">
			<p class="lh-menu-label">Categories</p>
			{#each categories as category}
				<a class="lh-category-link" href={category.href} onclick={closeMobile}>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
						<path d={iconPaths[category.icon]} />
					</svg>
					<span>
						<strong>{category.label}</strong>
						<span>{category.description}</span>
					</span>
				</a>
			{/each}
			<a class="lh-all-categories" href={links.categories} onclick={closeMobile}>
				Browse all categories
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
			</a>
			<div class="lh-mobile-pages">
				{#each navLinks as link}
					<a class="lh-nav-link" href={link.href} onclick={closeMobile}>{link.label}</a>
				{/each}
			</div>
		</nav>
		<div class="lh-mobile-footer">
			<a class="lh-button" href={links.signIn} onclick={closeMobile}>Sign In</a>
			<a class="lh-button lh-button--outline" href={links.join} onclick={closeMobile}>Create account</a>
			</div>
	</div>
{/if}
