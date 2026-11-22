<script lang="ts">
	import TransactionList, { type Transaction } from '../../../lib/components/TransactionList.svelte';

	const transactions: Transaction[] = [
		{
			id: '67593',
			name: 'Netflix',
			type: 'Subscription',
			amount: -6.99,
			date: 'September 26',
			time: '12:01 am',
			icon: 'receipt',
			paymentMethod: 'Credit Card',
			cardLastFour: '9342',
			cardType: 'visa'
		},
		{
			id: '67482',
			name: 'Verizon',
			type: 'Mobile Recharge',
			amount: -4.05,
			date: 'September 24',
			time: '05:18 pm',
			icon: 'signal',
			paymentMethod: 'Credit Card',
			cardLastFour: '2316',
			cardType: 'mastercard'
		},
		{
			id: '52363',
			name: 'Figma',
			type: 'Subscription',
			amount: -15,
			date: 'September 15',
			time: '01:11 pm',
			icon: 'receipt',
			paymentMethod: 'Credit Card',
			cardLastFour: '9342',
			cardType: 'visa'
		},
		{
			id: '54635',
			name: 'Rive',
			type: 'Subscription',
			amount: -32,
			date: 'September 16',
			time: '02:11 pm',
			icon: 'receipt',
			paymentMethod: 'Credit Card',
			cardLastFour: '9342',
			cardType: 'mastercard'
		},
		{
			id: '52342',
			name: 'Big Belly Burger',
			type: 'Restaurant',
			amount: -12.05,
			date: 'September 12',
			time: '09:06 pm',
			icon: 'chef',
			paymentMethod: 'Credit Card',
			cardLastFour: '2316',
			cardType: 'visa'
		}
	];
</script>

<svelte:head>
	<title>TransactionList · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">TransactionList</h1>
	<p class="detail-lead">
		Lista de movimientos con detalle expandido (pago, tarjeta, fecha). Transición lista ↔ detalle con CSS.
	</p>
</section>

<section class="detail-block">
	<div class="detail-stage">
		<TransactionList {transactions} />
	</div>
</section>

<style>
	.detail-intro { margin-bottom: 1.75rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 42rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}
	.detail-block { margin-bottom: 2rem; }
	.detail-stage {
		padding: 1.75rem 1rem; border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--bg, #edf2f8) 75%, transparent);
		display: flex; justify-content: center;
	}
</style>
