<script lang="ts">
	/**
	 * ProductDetail — PDP template (gallery + sticky info, options, accordions).
	 * Migrated from React + Astrayx to Svelte 5 + CSS (Abellis tokens).
	 */
	import type { ProductData } from './productDetail.types';

	const DEFAULT_IMAGES = [
		'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&h=1000&fit=crop',
		'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=1000&fit=crop',
		'https://images.unsplash.com/photo-1610701596061-2ecf227e861b?w=800&h=1000&fit=crop',
		'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=1000&fit=crop',
		'https://images.unsplash.com/photo-1603199506016-b9a694b5162d?w=800&h=1000&fit=crop',
		'https://images.unsplash.com/photo-1493106819501-66d381c466f8?w=800&h=1000&fit=crop'
	];

	const DEFAULT_PRODUCT: ProductData = {
		name: 'Solstice Mug & Plate Set',
		price: 89,
		originalPrice: 119,
		rating: 4.3,
		ratingCount: 128,
		description:
			'A hand-thrown mug and plate set that brings quiet warmth to every meal. The mug sits easy in the hand with a generous 12 oz capacity, while the 8-inch plate works for everything from toast to tapas. Each piece is kiln-fired at 2,300°F for a finish that resists chips and stains. Subtle variations in the reactive glaze mean no two sets are exactly alike. Dishwasher and microwave safe.',
		composition:
			'High-fire stoneware clay, wheel-thrown and trimmed by hand. Reactive glaze applied by dipping — color pools and breaks naturally over the clay body. Lead-free and food-safe. Unglazed foot ring reveals the raw clay underneath. Each piece is bisque-fired, glazed, then fired again to cone 10 in a gas reduction kiln.',
		deliveryReturns:
			'Free shipping on all ceramics orders over $75. Each piece is individually wrapped in recycled kraft paper and cushioned for transit. Returns accepted within 30 days — items must be unused and in original packaging. Replacement pieces available individually.',
		dimensions:
			'Mug height: 9.5 cm / 3.75 in. Mug diameter: 8.5 cm / 3.35 in. Capacity: 350 ml / 12 oz. Plate diameter: 20 cm / 8 in. Plate height: 2 cm / 0.75 in. Weight: 680 g / 1.5 lb (set).',
		images: DEFAULT_IMAGES,
		colors: [
			{ value: 'snow', label: 'Snow' },
			{ value: 'sage', label: 'Sage' },
			{ value: 'charcoal', label: 'Charcoal' }
		],
		finishes: [
			{ value: 'matte', label: 'Matte' },
			{ value: 'satin', label: 'Satin' },
			{ value: 'speckled', label: 'Speckled' }
		]
	};

	interface Props {
		product?: ProductData;
		onAddToCart?: (payload: { quantity: number; color: string; finish: string }) => void;
		onBuyNow?: (payload: { quantity: number; color: string; finish: string }) => void;
		class?: string;
	}

	let {
		product = DEFAULT_PRODUCT,
		onAddToCart,
		onBuyNow,
		class: className = ''
	}: Props = $props();

	let selectedThumb = $state(0);
	let color = $state(product.colors?.[0]?.value ?? 'snow');
	let finish = $state(product.finishes?.[0]?.value ?? 'matte');
	let quantity = $state(1);
	let openSections = $state<Record<string, boolean>>({
		composition: true,
		delivery: false,
		dimensions: false
	});
	let toast = $state<string | null>(null);

	const images = $derived(product.images.length ? product.images : DEFAULT_IMAGES);
	const heroSrc = $derived(images[selectedThumb] ?? images[0]);
	const filledStars = $derived(Math.round(product.rating ?? 0));
	const emptyStars = $derived(Math.max(0, 5 - filledStars));

	function fmt(n: number) {
		return `$${n.toFixed(2)}`;
	}

	function toggleSection(id: string) {
		openSections = { ...openSections, [id]: !openSections[id] };
	}

	function dec() {
		quantity = Math.max(1, quantity - 1);
	}
	function inc() {
		quantity = Math.min(10, quantity + 1);
	}

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => {
			if (toast === msg) toast = null;
		}, 2800);
	}

	function addToCart() {
		const payload = { quantity, color, finish };
		onAddToCart?.(payload);
		const glaze = product.colors?.find((c) => c.value === color)?.label ?? color;
		showToast(`Demo: ${quantity} × ${product.name} (${glaze}) → cart`);
	}

	function buyNow() {
		onBuyNow?.({ quantity, color, finish });
		showToast(`Demo: checkout for ${product.name}`);
	}
</script>

<div class="pd {className}" role="main">
	<div class="pd__grid">
		<!-- Gallery -->
		<div class="pd__gallery">
			<div class="pd__hero">
				<img src={heroSrc} alt={product.name} />
			</div>
			<div class="pd__thumbs" role="listbox" aria-label="Product images">
				{#each images as src, i (src + i)}
					<button
						type="button"
						class="pd__thumb"
						class:pd__thumb--active={selectedThumb === i}
						role="option"
						aria-selected={selectedThumb === i}
						aria-label="Product image {i + 1}"
						onclick={() => (selectedThumb = i)}
					>
						<img src={src} alt="" />
					</button>
				{/each}
			</div>
		</div>

		<!-- Sticky info -->
		<div class="pd__info">
			<div class="pd__header">
				<h1 class="pd__title">{product.name}</h1>
				{#if product.rating != null}
					<div class="pd__rating" aria-label="Rating {product.rating} out of 5">
						<span class="pd__stars" aria-hidden="true">
							{#each Array(filledStars) as _, i (i)}
								<svg class="pd__star pd__star--on" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
								</svg>
							{/each}
							{#each Array(emptyStars) as _, i (i)}
								<svg class="pd__star" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
									<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
								</svg>
							{/each}
						</span>
						<span class="pd__rating-text">
							{product.rating}{#if product.ratingCount} ({product.ratingCount}){/if}
						</span>
					</div>
				{/if}
				<div class="pd__price-row">
					<span class="pd__price">{fmt(product.price)}</span>
					{#if product.originalPrice != null && product.originalPrice > product.price}
						<span class="pd__price-old">{fmt(product.originalPrice)}</span>
						<span class="pd__badge">Sale</span>
					{/if}
				</div>
			</div>

			<p class="pd__desc">{product.description}</p>

			{#if product.colors?.length}
				<div class="pd__field">
					<span class="pd__label">Glaze</span>
					<div class="pd__seg" role="radiogroup" aria-label="Glaze">
						{#each product.colors as c (c.value)}
							<button
								type="button"
								class="pd__seg-btn"
								class:pd__seg-btn--active={color === c.value}
								role="radio"
								aria-checked={color === c.value}
								onclick={() => (color = c.value)}
							>
								{c.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if product.finishes?.length}
				<div class="pd__field">
					<span class="pd__label">Finish</span>
					<div class="pd__seg" role="radiogroup" aria-label="Finish">
						{#each product.finishes as f (f.value)}
							<button
								type="button"
								class="pd__seg-btn"
								class:pd__seg-btn--active={finish === f.value}
								role="radio"
								aria-checked={finish === f.value}
								onclick={() => (finish = f.value)}
							>
								{f.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="pd__field">
				<span class="pd__label" id="pd-qty-label">Quantity</span>
				<div class="pd__qty" role="group" aria-labelledby="pd-qty-label">
					<button type="button" class="pd__qty-btn" aria-label="Decrease quantity" disabled={quantity <= 1} onclick={dec}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M5 12h14" stroke-linecap="round" />
						</svg>
					</button>
					<input
						class="pd__qty-input"
						type="number"
						min="1"
						max="10"
						bind:value={quantity}
						oninput={() => {
							const n = Number(quantity);
							quantity = Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 1;
						}}
						aria-label="Quantity"
					/>
					<button type="button" class="pd__qty-btn" aria-label="Increase quantity" disabled={quantity >= 10} onclick={inc}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 5v14M5 12h14" stroke-linecap="round" />
						</svg>
					</button>
				</div>
			</div>

			<div class="pd__actions">
				<button type="button" class="pd__btn pd__btn--primary" onclick={addToCart}>Add to Cart</button>
				<button type="button" class="pd__btn pd__btn--secondary" onclick={buyNow}>Buy it now</button>
			</div>

			{#if toast}
				<p class="pd__toast" role="status">{toast}</p>
			{/if}

			<div class="pd__accordions">
				{#if product.composition}
					<div class="pd__acc">
						<button
							type="button"
							class="pd__acc-trigger"
							aria-expanded={openSections.composition}
							onclick={() => toggleSection('composition')}
						>
							<span>Composition</span>
							<svg class="pd__acc-chevron" class:pd__acc-chevron--open={openSections.composition} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						{#if openSections.composition}
							<div class="pd__acc-body">{product.composition}</div>
						{/if}
					</div>
				{/if}
				{#if product.deliveryReturns}
					<div class="pd__acc">
						<button
							type="button"
							class="pd__acc-trigger"
							aria-expanded={openSections.delivery}
							onclick={() => toggleSection('delivery')}
						>
							<span>Delivery & Returns</span>
							<svg class="pd__acc-chevron" class:pd__acc-chevron--open={openSections.delivery} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						{#if openSections.delivery}
							<div class="pd__acc-body">{product.deliveryReturns}</div>
						{/if}
					</div>
				{/if}
				{#if product.dimensions}
					<div class="pd__acc">
						<button
							type="button"
							class="pd__acc-trigger"
							aria-expanded={openSections.dimensions}
							onclick={() => toggleSection('dimensions')}
						>
							<span>Dimensions</span>
							<svg class="pd__acc-chevron" class:pd__acc-chevron--open={openSections.dimensions} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						{#if openSections.dimensions}
							<div class="pd__acc-body">{product.dimensions}</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.pd {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
	}

	.pd__grid {
		display: grid;
		gap: 1.75rem;
	}

	@media (min-width: 900px) {
		.pd__grid {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
			align-items: start;
		}
	}

	.pd__gallery {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.pd__hero {
		aspect-ratio: 4 / 5;
		overflow: hidden;
		border-radius: var(--radius-card, 16px);
		background: var(--surface-2, #f5f8fc);
	}

	.pd__hero img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.pd__thumbs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	@media (min-width: 520px) {
		.pd__thumbs {
			grid-template-columns: repeat(6, 1fr);
		}
	}

	.pd__thumb {
		aspect-ratio: 1;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 10px;
		overflow: hidden;
		background: var(--surface-2, #f5f8fc);
		cursor: pointer;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.pd__thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.pd__thumb:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 30%, var(--line, #d9e2ec));
	}

	.pd__thumb--active {
		border-color: var(--navy, #004c8b);
		box-shadow: 0 0 0 1px var(--navy, #004c8b);
	}

	.pd__info {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	@media (min-width: 900px) {
		.pd__info {
			position: sticky;
			top: 1.5rem;
			align-self: start;
		}
	}

	.pd__header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pd__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.2;
		color: var(--head-ink, #012a50);
	}

	.pd__rating {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.pd__stars {
		display: inline-flex;
		gap: 0.1rem;
	}

	.pd__star {
		color: #9ca3af;
	}

	.pd__star--on {
		color: #eab308;
	}

	.pd__rating-text {
		font-size: 0.875rem;
		color: var(--slate, #5c6b7d);
	}

	.pd__price-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.pd__price {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}

	.pd__price-old {
		font-size: 0.95rem;
		color: var(--slate, #5c6b7d);
		text-decoration: line-through;
	}

	.pd__badge {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.2rem 0.45rem;
		border-radius: 6px;
		background: #fde8e8;
		color: #b42318;
	}

	.pd__desc {
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--ink, #132234);
	}

	.pd__field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.pd__label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.pd__seg {
		display: inline-flex;
		flex-wrap: wrap;
		padding: 3px;
		border-radius: 12px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
		gap: 2px;
		width: fit-content;
	}

	.pd__seg-btn {
		padding: 0.45rem 0.9rem;
		border: 0;
		border-radius: 9px;
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
	}

	.pd__seg-btn:hover {
		color: var(--ink, #132234);
	}

	.pd__seg-btn--active {
		background: var(--card, #fff);
		color: var(--navy, #004c8b);
		font-weight: 600;
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
	}

	.pd__qty {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.pd__qty-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 1.5px solid var(--line, #d9e2ec);
		border-radius: 10px;
		background: var(--card, #fff);
		color: var(--ink, #132234);
		cursor: pointer;
	}

	.pd__qty-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pd__qty-input {
		width: 4.5rem;
		text-align: center;
		padding: 0.45rem 0.35rem;
		border: 1.5px solid var(--line, #d9e2ec);
		border-radius: 10px;
		background: var(--surface-2, #f5f8fc);
		font: inherit;
		font-weight: 600;
		color: var(--ink, #132234);
	}

	.pd__qty-input:focus {
		outline: none;
		border-color: var(--navy, #004c8b);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy, #004c8b) 18%, transparent);
	}

	.pd__actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.pd__btn {
		width: 100%;
		padding: 0.85rem 1.25rem;
		border-radius: 12px;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		cursor: pointer;
		transition: opacity 0.12s ease, transform 0.12s ease;
	}

	.pd__btn:active {
		transform: scale(0.98);
	}

	.pd__btn--primary {
		border: 0;
		background: var(--navy, #004c8b);
		color: #fff;
	}

	.pd__btn--primary:hover {
		opacity: 0.92;
	}

	.pd__btn--secondary {
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		color: var(--head-ink, #012a50);
	}

	.pd__btn--secondary:hover {
		background: var(--surface-2, #f5f8fc);
	}

	.pd__toast {
		margin: 0;
		padding: 0.65rem 0.85rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, #fff);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 25%, var(--line));
		font-size: 0.8125rem;
		color: var(--navy, #004c8b);
	}

	.pd__accordions {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--line, #d9e2ec);
	}

	.pd__acc {
		border-bottom: 1px solid var(--line, #d9e2ec);
	}

	.pd__acc-trigger {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.9rem 0;
		border: 0;
		background: transparent;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
		cursor: pointer;
		text-align: left;
	}

	.pd__acc-chevron {
		flex-shrink: 0;
		color: var(--slate, #5c6b7d);
		transition: transform 0.2s ease;
	}

	.pd__acc-chevron--open {
		transform: rotate(180deg);
	}

	.pd__acc-body {
		padding: 0 0 1rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
</style>
