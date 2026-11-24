<script lang="ts">
	/**
	 * Luna Hero — digital storefront hero with floating nav.
	 * CSS animations (no motion). Sample catalog data.
	 */
	import LunaNavbar from './LunaNavbar.svelte';
	import {
		LUNA_CATEGORIES,
		LUNA_LINKS,
		LUNA_NAV,
		LUNA_PRODUCTS,
		type LunaCategory,
		type LunaLink,
		type LunaProduct
	} from './luna-catalog';
	import './luna-hero.css';

	type Props = {
		theme?: 'light' | 'dark' | 'system';
		links?: Partial<typeof LUNA_LINKS>;
		categories?: LunaCategory[];
		navLinks?: LunaLink[];
		products?: LunaProduct[];
		class?: string;
	};

	let {
		theme = 'system',
		links,
		categories = LUNA_CATEGORIES,
		navLinks = LUNA_NAV,
		products = LUNA_PRODUCTS,
		class: className = ''
	}: Props = $props();

	const routes = $derived({ ...LUNA_LINKS, ...links });
</script>

<div class="lh {className}" data-luna-theme={theme}>
	<LunaNavbar links={routes} {categories} {navLinks} {products} />

	<section class="lh-hero" aria-labelledby="lh-title">
		<div class="lh-backdrop" aria-hidden="true">
			<div class="lh-wash"></div>
			<div class="lh-dots"></div>
			<div class="lh-pixels lh-pixels--left"></div>
			<div class="lh-pixels lh-pixels--mobile"></div>
			<div class="lh-pixels-wrap">
				<div class="lh-pixels lh-pixels--right"></div>
			</div>
			<div class="lh-vignette"></div>
		</div>

		<div class="lh-content">
			<div class="lh-copy">
				<div class="lh-reveal" style="animation-delay: 0s">
					<h1 id="lh-title">Your digital stuff. <span>One place.</span></h1>
				</div>
				<div class="lh-reveal" style="animation-delay: 0.08s">
					<p>
						Games, software, subscriptions, digital assets, and more. Find what you need, pay securely, and
						get your product instantly.
					</p>
				</div>
				<div class="lh-reveal" style="animation-delay: 0.16s">
					<div class="lh-actions">
						<a class="lh-button" href={routes.store}>
							<span class="lh-bag" aria-hidden="true">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
									<path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2" />
								</svg>
							</span>
							Browse products
						</a>
						<div class="lh-category-action">
							<a class="lh-button lh-button--outline" href={routes.categories}>Explore Categories</a>
							<span class="lh-category-glyph" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
									<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
								</svg>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
