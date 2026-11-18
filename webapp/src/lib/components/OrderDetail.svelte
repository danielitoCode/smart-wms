<script lang="ts">
	/**
	 * OrderDetail — admin order detail (items, invoice, timeline, side panel).
	 * Migrated from React + Astrayx DetailPage2 to Svelte 5 + CSS (Abellis).
	 */
	import type { OrderDetailData } from './orderDetail.types';

	const IMAGES = [
		'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=120&h=120&fit=crop',
		'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=120&h=120&fit=crop',
		'https://images.unsplash.com/photo-1610701596061-2ecf227e861b?w=120&h=120&fit=crop',
		'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=120&h=120&fit=crop',
		'https://images.unsplash.com/photo-1603199506016-b9a694b5162d?w=120&h=120&fit=crop'
	];

	const DEFAULT: OrderDetailData = {
		id: '#1001',
		status: 'Unfulfilled',
		dateLabel: '02/23/2026',
		flagLabel: 'Needs attention',
		customer: {
			name: 'Jane Doe',
			address: '321 Smith Road, CA 38238',
			phone: '234-',
			email: 'janedoe@email.com',
			billingNote: 'Same as shipping address'
		},
		items: [
			{ name: 'Solstice Mug', details: 'Glaze: Snow\nFinish: Matte', price: 89, qty: 1, image: IMAGES[0] },
			{ name: 'Ember Bowl', details: 'Glaze: Sage\nSize: 6 in', price: 42, qty: 2, image: IMAGES[1] },
			{ name: 'Terra Cup', details: 'Glaze: Oat\nSize: 14 in', price: 65, qty: 1, image: IMAGES[2] },
			{ name: 'Dawn Plate Set', details: 'Glaze: Charcoal\nCapacity: 3 oz', price: 34, qty: 3, image: IMAGES[3] },
			{ name: 'Kiln Salad Bowl', details: 'Glaze: Snow\nHeight: 8 in', price: 78, qty: 1, image: IMAGES[4] }
		],
		discount: 15,
		discountLabel: 'New customer code: NEW15',
		shipping: 0,
		shippingLabel: 'Free shipping (0.0lbs) USPS',
		taxRate: 0.0825,
		paidWith: 'Visa ...7482',
		notes:
			'Customer is a repeat buyer — 3rd order this quarter. Prefers snow and oat glazes. Requested gift wrapping for the mug set. Ships to a residential address in CA.',
		fraudRisk: 15,
		fraudRecommendation: 'Fulfill order',
		fraudBody: 'There is a low chance that you will receive a chargeback on this order.',
		activity: [
			{ type: 'event', user: 'Jane Doe', text: 'placed order #1001', reactions: 2, time: 'Feb 23 at 9:12 AM' },
			{
				type: 'comment',
				user: 'Alex Rivera',
				text: "Customer requested gift wrapping for the mug & plate set. I've added a note to the packing slip — warehouse team should wrap in recycled kraft paper.",
				reactions: 3,
				time: 'Feb 23 at 10:45 AM'
			},
			{
				type: 'update',
				user: 'System',
				text: 'has several information changes',
				time: 'Feb 23 at 11:30 AM',
				changes: ['Payment verified via Visa ...7482', 'Fraud check passed — low risk']
			},
			{
				type: 'event',
				user: 'Alex Rivera',
				text: 'marked order as ready for fulfillment',
				reactions: 1,
				time: 'Feb 23 at 2:15 PM'
			}
		]
	};

	interface Props {
		order?: OrderDetailData;
		class?: string;
	}

	let { order = DEFAULT, class: className = '' }: Props = $props();

	let activeTab = $state('details');
	let showPanel = $state(true);
	let openNotes = $state(true);
	let openCustomer = $state(true);
	let openFraud = $state(true);
	let toast = $state<string | null>(null);
	let confirmOpen = $state(false);

	const tabs = [
		{ id: 'details', label: 'Details' },
		{ id: 'invoices', label: 'Invoices' },
		{ id: 'timeline', label: 'Timeline' }
	] as const;

	const subtotal = $derived(order.items.reduce((s, p) => s + p.price * p.qty, 0));
	const tax = $derived(Math.round((subtotal - order.discount) * order.taxRate * 100) / 100);
	const total = $derived(subtotal - order.discount + order.shipping + tax);

	function fmt(n: number) {
		return `$${n.toFixed(2)}`;
	}

	function initials(name: string) {
		return name
			.split(/\s+/)
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	function notify(msg: string) {
		toast = msg;
		setTimeout(() => {
			if (toast === msg) toast = null;
		}, 2600);
	}
</script>

<div class="od {className}">
	{#if toast}
		<div class="od__toast" role="status">{toast}</div>
	{/if}

	<header class="od__header">
		<a class="od__back" href="#orders" onclick={(e) => e.preventDefault()}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			All orders
		</a>

		<div class="od__title-row">
			<div class="od__title-block">
				<h1 class="od__title">{order.id}</h1>
				<div class="od__meta">
					<span>{order.items.length} ordered items</span>
					<span class="od__dot">・</span>
					<span class="od__avatar od__avatar--sm" aria-hidden="true">{initials(order.customer.name)}</span>
					<span>{order.customer.name}</span>
					<span class="od__dot">・</span>
					<span class="od__badge od__badge--warn">{order.status}</span>
					<span class="od__dot">・</span>
					<span class="od__meta-icon">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<rect x="3" y="5" width="18" height="16" rx="2" />
							<path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round" />
						</svg>
						{order.dateLabel}
					</span>
					{#if order.flagLabel}
						<span class="od__dot">・</span>
						<span class="od__meta-icon">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path d="M5 21V4h9l-1 4 1 4H5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							{order.flagLabel}
						</span>
					{/if}
				</div>
			</div>
			<div class="od__header-actions">
				<button type="button" class="od__btn od__btn--secondary" onclick={() => notify(`Demo: restock for ${order.id}`)}>Restock</button>
				<button type="button" class="od__btn od__btn--secondary" onclick={() => notify('Demo: order editor would open')}>Edit</button>
			</div>
		</div>

		<div class="od__tabs-row">
			<div class="od__tabs" role="tablist">
				{#each tabs as t}
					<button
						type="button"
						role="tab"
						class="od__tab"
						class:od__tab--active={activeTab === t.id}
						aria-selected={activeTab === t.id}
						onclick={() => (activeTab = t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
			<button
				type="button"
				class="od__panel-toggle"
				aria-pressed={showPanel}
				aria-label={showPanel ? 'Hide panel' : 'Show panel'}
				onclick={() => (showPanel = !showPanel)}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
					<path d="M4 4h6v16H4zM14 4h6v16h-6z" stroke-linejoin="round" />
				</svg>
			</button>
		</div>
	</header>

	<div class="od__body" class:od__body--panel={showPanel}>
		<div class="od__main">
			{#if activeTab === 'details' || activeTab === 'invoices'}
				<section class="od__card">
					<div class="od__card-head">
						<div class="od__card-title">
							<h2>Items</h2>
							<span class="od__badge od__badge--warn">{order.status}</span>
						</div>
						<div class="od__card-actions">
							<button type="button" class="od__btn od__btn--ghost" onclick={() => notify(`Demo: fulfill ${order.items.length} items`)}>Fulfill item</button>
							<button type="button" class="od__btn od__btn--secondary" onclick={() => notify(`Demo: shipping label for ${order.id}`)}>Create label</button>
						</div>
					</div>
					<ul class="od__list">
						{#each order.items as product, i (product.name + i)}
							<li>
								<button type="button" class="od__line" onclick={() => notify(`Demo: ${product.name}`)}>
									<img class="od__thumb" src={product.image} alt="" width="48" height="48" />
									<span class="od__line-body">
										<span class="od__line-name">{product.name}</span>
										{#each product.details.split('\n') as line}
											<span class="od__line-detail">{line}</span>
										{/each}
									</span>
									<span class="od__line-price">
										<span class="od__line-total">{fmt(product.price * product.qty)}</span>
										<span class="od__line-unit">{fmt(product.price)} × {product.qty}</span>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</section>

				<section class="od__card">
					<div class="od__card-head">
						<div class="od__card-title">
							<h2>Invoice</h2>
							<span class="od__badge od__badge--ok">Paid</span>
						</div>
						<div class="od__card-actions">
							<button type="button" class="od__btn od__btn--ghost" onclick={() => (confirmOpen = true)}>Refund</button>
							<button type="button" class="od__btn od__btn--secondary" onclick={() => notify(`Demo: invoice → ${order.customer.email}`)}>Send Invoice</button>
						</div>
					</div>
					<dl class="od__meta-list">
						<div class="od__meta-row"><dt>Subtotal</dt><dd><span>{order.items.length} items</span><strong>{fmt(subtotal)}</strong></dd></div>
						<div class="od__meta-row"><dt>Discount</dt><dd><span>{order.discountLabel ?? 'Discount'}</span><strong>– {fmt(order.discount)}</strong></dd></div>
						<div class="od__meta-row"><dt>Shipping</dt><dd><span>{order.shippingLabel ?? 'Shipping'}</span><strong>{fmt(order.shipping)}</strong></dd></div>
						<div class="od__meta-row"><dt>Tax</dt><dd><span>Sales tax ({(order.taxRate * 100).toFixed(2)}%)</span><strong>{fmt(tax)}</strong></dd></div>
						<div class="od__meta-row od__meta-row--total"><dt>Total</dt><dd><span></span><strong>{fmt(total)}</strong></dd></div>
					</dl>
					<hr class="od__hr" />
					<dl class="od__meta-list">
						<div class="od__meta-row"><dt>Paid by customer</dt><dd><span>{order.paidWith ?? '—'}</span><strong>{fmt(total)}</strong></dd></div>
					</dl>
				</section>
			{/if}

			{#if activeTab === 'details' || activeTab === 'timeline'}
				<section class="od__card">
					<div class="od__card-head">
						<h2>Timeline</h2>
						<button type="button" class="od__icon-btn" aria-label="Filters" onclick={() => notify('Demo: timeline filters')}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path d="M4 6h16M7 12h10M10 18h4" stroke-linecap="round" />
							</svg>
						</button>
					</div>
					<ul class="od__timeline">
						{#each order.activity as item, i (item.time + i)}
							<li class="od__activity">
								<span class="od__avatar" aria-hidden="true">{initials(item.user)}</span>
								<div class="od__activity-body">
									<div class="od__activity-card">
										<p class="od__activity-user">{item.user}</p>
										<p class="od__activity-text">{item.text}</p>
										{#if item.changes?.length}
											<ul class="od__changes">
												{#each item.changes as change}
													<li>
														<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
															<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke-linecap="round" stroke-linejoin="round" />
														</svg>
														{change}
													</li>
												{/each}
											</ul>
										{/if}
									</div>
									<div class="od__activity-foot">
										{#if item.reactions != null}
											<span class="od__reactions">👍 ❤️ {item.reactions}</span>
											<span class="od__dot">・</span>
										{/if}
										<span>Like</span><span class="od__dot">・</span><span>Reply</span><span class="od__dot">・</span><span>{item.time}</span>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="od__card od__card--mobile-panel">
				<h2>Order details</h2>
				<div class="od__panel-stack">{render panelBlocks()}</div>
			</section>
		</div>

		{#if showPanel}
			<aside class="od__panel" aria-label="Order details">{render panelBlocks()}</aside>
		{/if}
	</div>
</div>

{#if confirmOpen}
	<div class="od__modal" role="dialog" aria-modal="true" aria-labelledby="od-refund-title">
		<div class="od__modal-card">
			<h3 id="od-refund-title">Refund this order?</h3>
			<p>This demo won't refund anything.</p>
			<div class="od__modal-actions">
				<button type="button" class="od__btn od__btn--secondary" onclick={() => (confirmOpen = false)}>Cancel</button>
				<button
					type="button"
					class="od__btn od__btn--primary"
					onclick={() => {
						confirmOpen = false;
						notify('Demo: refund would be issued');
					}}
				>
					Refund
				</button>
			</div>
		</div>
	</div>
{/if}

{#snippet panelBlocks()}
	<div class="od__acc">
		<button type="button" class="od__acc-t" aria-expanded={openNotes} onclick={() => (openNotes = !openNotes)}>
			Notes
			<svg class="od__chev" class:od__chev--open={openNotes} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		{#if openNotes}<p class="od__acc-b">{order.notes}</p>{/if}
	</div>
	<div class="od__acc">
		<button type="button" class="od__acc-t" aria-expanded={openCustomer} onclick={() => (openCustomer = !openCustomer)}>
			Customer
			<svg class="od__chev" class:od__chev--open={openCustomer} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		{#if openCustomer}
			<dl class="od__meta-list od__meta-list--panel">
				<div class="od__meta-row"><dt>Name</dt><dd>{order.customer.name}</dd></div>
				<div class="od__meta-row"><dt>Address</dt><dd>{order.customer.address}</dd></div>
				<div class="od__meta-row"><dt>Phone</dt><dd>{order.customer.phone}</dd></div>
				<div class="od__meta-row"><dt>Email</dt><dd>{order.customer.email}</dd></div>
				<div class="od__meta-row"><dt>Billing Address</dt><dd>{order.customer.billingNote ?? '—'}</dd></div>
			</dl>
		{/if}
	</div>
	<div class="od__acc">
		<button type="button" class="od__acc-t" aria-expanded={openFraud} onclick={() => (openFraud = !openFraud)}>
			Fraud Analysis
			<svg class="od__chev" class:od__chev--open={openFraud} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		{#if openFraud}
			<div class="od__fraud">
				<div class="od__progress" role="progressbar" aria-valuenow={order.fraudRisk ?? 0} aria-valuemin="0" aria-valuemax="100" aria-label="Risk level">
					<div class="od__progress-bar" style:width="{(order.fraudRisk ?? 0)}%"></div>
				</div>
				<p class="od__fraud-rec">Recommendation: {order.fraudRecommendation ?? '—'}</p>
				<p class="od__fraud-body">{order.fraudBody}</p>
			</div>
		{/if}
	</div>
{/snippet}

<style>
	.od { position: relative; width: 100%; max-width: 1100px; margin: 0 auto; color: var(--ink, #132234); }
	.od__toast { position: sticky; top: 0.5rem; z-index: 20; margin-bottom: 0.75rem; padding: 0.65rem 0.9rem; border-radius: 10px; background: color-mix(in srgb, var(--navy, #004c8b) 10%, #fff); border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 25%, var(--line, #d9e2ec)); font-size: 0.8125rem; color: var(--navy, #004c8b); }
	.od__header { display: flex; flex-direction: column; gap: 0.85rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--line, #d9e2ec); margin-bottom: 1.25rem; }
	.od__back { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8125rem; font-weight: 500; color: var(--slate, #5c6b7d); text-decoration: none; width: fit-content; }
	.od__back:hover { color: var(--navy, #004c8b); }
	.od__title-row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	.od__title { margin: 0 0 0.35rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif); font-size: clamp(1.5rem, 3vw, 1.85rem); font-weight: 700; letter-spacing: -0.03em; color: var(--head-ink, #012a50); }
	.od__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.15rem; font-size: 0.875rem; color: var(--slate, #5c6b7d); }
	.od__dot { opacity: 0.55; padding: 0 0.15rem; }
	.od__meta-icon { display: inline-flex; align-items: center; gap: 0.3rem; }
	.od__avatar { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border-radius: 999px; background: color-mix(in srgb, var(--navy, #004c8b) 14%, #fff); color: var(--navy, #004c8b); font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
	.od__avatar--sm { width: 1.35rem; height: 1.35rem; font-size: 0.55rem; }
	.od__badge { display: inline-flex; align-items: center; padding: 0.15rem 0.45rem; border-radius: 6px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; }
	.od__badge--warn { background: #fff4e5; color: #b54708; }
	.od__badge--ok { background: #eaf5ee; color: #1e7a46; }
	.od__header-actions, .od__card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.od__tabs-row { display: flex; align-items: center; gap: 0.5rem; }
	.od__tabs { display: flex; flex: 1; gap: 0.15rem; overflow-x: auto; border-bottom: 1px solid var(--line, #d9e2ec); }
	.od__tab { padding: 0.55rem 0.85rem; border: 0; border-bottom: 2px solid transparent; background: transparent; font-size: 0.875rem; font-weight: 600; color: var(--slate, #5c6b7d); cursor: pointer; white-space: nowrap; }
	.od__tab--active { color: var(--navy, #004c8b); border-bottom-color: var(--navy, #004c8b); }
	.od__panel-toggle { display: none; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border: 1px solid var(--line, #d9e2ec); border-radius: 10px; background: var(--surface-2, #f5f8fc); color: var(--slate, #5c6b7d); cursor: pointer; }
	@media (min-width: 1024px) { .od__panel-toggle { display: inline-flex; } }
	.od__btn { padding: 0.5rem 0.9rem; border-radius: 10px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; font-family: inherit; }
	.od__btn--primary { border: 0; background: var(--navy, #004c8b); color: #fff; }
	.od__btn--secondary { border: 1.5px solid var(--line, #d9e2ec); background: var(--card, #fff); color: var(--head-ink, #012a50); }
	.od__btn--ghost { border: 0; background: transparent; color: var(--slate, #5c6b7d); }
	.od__btn--ghost:hover { background: var(--surface-2, #f5f8fc); color: var(--ink, #132234); }
	.od__icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 2.1rem; height: 2.1rem; border: 0; border-radius: 8px; background: transparent; color: var(--slate, #5c6b7d); cursor: pointer; }
	.od__icon-btn:hover { background: var(--surface-2, #f5f8fc); }
	.od__body { display: grid; gap: 1.25rem; }
	@media (min-width: 1024px) { .od__body--panel { grid-template-columns: minmax(0, 1fr) 280px; align-items: start; } }
	.od__main { display: flex; flex-direction: column; gap: 1.15rem; min-width: 0; }
	.od__card { padding: 1.15rem 1.15rem 1.25rem; border-radius: 14px; border: 1.5px solid var(--line, #d9e2ec); background: var(--card, #fff); box-shadow: var(--shadow-1, 0 2px 8px -4px rgba(0, 0, 0, 0.06)); }
	.od__card h2 { margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif); font-size: 1.1rem; font-weight: 700; color: var(--head-ink, #012a50); }
	.od__card-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
	.od__card-title { display: flex; align-items: center; gap: 0.5rem; }
	.od__list { list-style: none; margin: 0; padding: 0; }
	.od__line { display: flex; align-items: flex-start; gap: 0.85rem; width: 100%; padding: 0.75rem 0.35rem; border: 0; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit; }
	.od__line:hover { background: var(--surface-2, #f5f8fc); }
	.od__thumb { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: var(--surface-2, #f5f8fc); }
	.od__line-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
	.od__line-name { font-weight: 600; color: var(--head-ink, #012a50); }
	.od__line-detail { font-size: 0.8rem; color: var(--slate, #5c6b7d); }
	.od__line-price { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; flex-shrink: 0; }
	.od__line-total { font-weight: 700; color: var(--head-ink, #012a50); }
	.od__line-unit { font-size: 0.8rem; color: var(--slate, #5c6b7d); }
	.od__meta-list { margin: 0; }
	.od__meta-row { display: grid; grid-template-columns: 7.5rem 1fr; gap: 0.75rem; padding: 0.45rem 0; font-size: 0.875rem; }
	.od__meta-row dt { margin: 0; color: var(--slate, #5c6b7d); font-weight: 500; }
	.od__meta-row dd { margin: 0; display: flex; justify-content: space-between; gap: 1rem; color: var(--ink, #132234); }
	.od__meta-row--total { font-weight: 700; }
	.od__meta-list--panel .od__meta-row { grid-template-columns: 1fr; gap: 0.15rem; padding: 0.4rem 0; }
	.od__meta-list--panel dd { display: block; }
	.od__hr { margin: 0.75rem 0; border: 0; border-top: 1px solid var(--line, #d9e2ec); }
	.od__timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.15rem; }
	.od__activity { display: flex; gap: 0.75rem; align-items: flex-start; }
	.od__activity-body { flex: 1; min-width: 0; }
	.od__activity-card { padding: 0.75rem 0.9rem; border-radius: 12px; background: var(--surface-2, #f5f8fc); border: 1px solid var(--line, #d9e2ec); }
	.od__activity-user { margin: 0 0 0.25rem; font-weight: 700; font-size: 0.875rem; color: var(--head-ink, #012a50); }
	.od__activity-text { margin: 0; font-size: 0.875rem; line-height: 1.45; }
	.od__changes { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.od__changes li { display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.8rem; color: var(--slate, #5c6b7d); }
	.od__activity-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem; margin-top: 0.4rem; font-size: 0.75rem; color: var(--slate, #5c6b7d); }
	.od__panel { display: none; padding: 1rem; border-radius: 14px; border: 1.5px solid var(--line, #d9e2ec); background: var(--card, #fff); position: sticky; top: 1rem; }
	@media (min-width: 1024px) { .od__body--panel .od__panel { display: block; } .od__card--mobile-panel { display: none; } }
	.od__panel-stack { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.75rem; }
	.od__acc { border-bottom: 1px solid var(--line, #d9e2ec); }
	.od__acc-t { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 0.75rem 0; border: 0; background: transparent; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif); font-size: 0.9rem; font-weight: 600; color: var(--head-ink, #012a50); cursor: pointer; text-align: left; }
	.od__chev { color: var(--slate, #5c6b7d); transition: transform 0.2s ease; }
	.od__chev--open { transform: rotate(180deg); }
	.od__acc-b { margin: 0 0 0.85rem; font-size: 0.85rem; line-height: 1.5; color: var(--slate, #5c6b7d); }
	.od__fraud { padding-bottom: 0.85rem; }
	.od__progress { height: 6px; border-radius: 999px; background: var(--surface-2, #e8eef5); overflow: hidden; margin-bottom: 0.55rem; }
	.od__progress-bar { height: 100%; border-radius: inherit; background: #1e7a46; }
	.od__fraud-rec { margin: 0 0 0.25rem; font-size: 0.875rem; font-weight: 600; color: var(--head-ink, #012a50); }
	.od__fraud-body { margin: 0; font-size: 0.85rem; line-height: 1.45; color: var(--slate, #5c6b7d); }
	.od__modal { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 1rem; background: rgba(15, 23, 42, 0.45); }
	.od__modal-card { width: min(100%, 380px); padding: 1.25rem; border-radius: 14px; background: var(--card, #fff); border: 1px solid var(--line, #d9e2ec); box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18); }
	.od__modal-card h3 { margin: 0 0 0.4rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif); color: var(--head-ink, #012a50); }
	.od__modal-card p { margin: 0 0 1rem; font-size: 0.9rem; color: var(--slate, #5c6b7d); }
	.od__modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
