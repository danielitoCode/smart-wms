<script lang="ts">
	/**
	 * Smart Pricing — three lime plans, monthly/yearly switch, price roll, CTA hover.
	 * Decorative corner shapes are inline SVG (no external asset dependency).
	 */
	import './smart-pricing.css';

	const YEARLY_DISCOUNT = 0.2;

	type Billing = 'monthly' | 'yearly';

	type Plan = {
		id: string;
		name: string;
		monthly: number;
		blurb: string;
		features: string[];
		shape: 'basic' | 'growth' | 'scale';
		flip?: boolean;
		popular?: boolean;
	};

	const PLANS: Plan[] = [
		{
			id: 'basic',
			name: 'Basic',
			monthly: 12,
			blurb: 'For early-stage teams building financial discipline',
			features: [
				'Live cash flow dashboard',
				'3-month runway projection',
				'Revenue & expense tracking',
				'Up to 3 integrations',
				'Standard forecasting model',
				'Email support'
			],
			shape: 'basic'
		},
		{
			id: 'growth',
			name: 'Growth',
			monthly: 49,
			blurb: 'For scaling companies optimizing burn and runway',
			features: [
				'12-month forecasting horizon',
				'Burn rate analytics',
				'Multi-channel revenue tracking',
				'Scenario modeling (hiring & pricing)',
				'Up to 10 integrations',
				'Team access controls',
				'Priority support'
			],
			shape: 'growth',
			popular: true
		},
		{
			id: 'scale',
			name: 'Scale',
			monthly: 199,
			blurb: 'For advanced financial operations and enterprise reporting',
			features: [
				'18-month predictive forecasting',
				'Unlimited integrations',
				'Advanced multi-scenario modeling',
				'Department-level reporting',
				'Audit logs & advanced permissions',
				'Dedicated account manager',
				'SLA-backed support'
			],
			shape: 'scale',
			flip: true
		}
	];

	function priceFor(plan: Plan, billing: Billing) {
		return billing === 'monthly'
			? plan.monthly
			: Math.round(plan.monthly * (1 - YEARLY_DISCOUNT));
	}

	let billing = $state<Billing>('monthly');
	const yearly = $derived(billing === 'yearly');
</script>

<main class="sp-page">
	<section class="sp" aria-labelledby="sp-title">
		<header class="sp__head">
			<h2 id="sp-title" class="sp__title">
				Make the Smart Choice for <br class="sp__break" />
				Your Business
			</h2>
		</header>

		<div class="sp__billing">
			<button
				type="button"
				class="sp__period"
				class:is-on={!yearly}
				aria-pressed={!yearly}
				onclick={() => (billing = 'monthly')}
			>
				Monthly
			</button>
			<button
				type="button"
				role="switch"
				aria-checked={yearly}
				aria-label="Bill yearly"
				class="sp__switch"
				class:is-yearly={yearly}
				onclick={() => (billing = yearly ? 'monthly' : 'yearly')}
			>
				<span class="sp__knob" aria-hidden="true"></span>
			</button>
			<button
				type="button"
				class="sp__period"
				class:is-on={yearly}
				aria-pressed={yearly}
				onclick={() => (billing = 'yearly')}
			>
				Yearly
			</button>
			<span class="sp__sale">Sale 20%</span>
		</div>

		<ul class="sp__plans">
			{#each PLANS as plan (plan.id)}
				{@const price = priceFor(plan, billing)}
				<li class="sp__card" class:sp__card--popular={plan.popular}>
					<svg
						class="sp__shape"
						class:sp__shape--flip={plan.flip}
						viewBox="0 0 140 180"
						aria-hidden="true"
					>
						{#if plan.shape === 'basic'}
							<path
								fill="currentColor"
								d="M20 20c40-8 70 10 90 40 18 28 22 70-5 95-25 24-70 30-95 8-28-24-30-70-10-100C10 45 8 28 20 20Z"
								opacity="0.85"
							/>
						{:else if plan.shape === 'growth'}
							<path
								fill="currentColor"
								d="M30 10c45-5 85 20 95 70 8 40-5 85-45 95-42 10-80-15-90-55C-20 80 0 20 30 10Z"
								opacity="0.9"
							/>
						{:else}
							<path
								fill="currentColor"
								d="M15 30c35-25 90-20 110 25 18 40 5 90-40 110-48 22-90-5-95-55C-15 70 0 45 15 30Z"
								opacity="0.88"
							/>
						{/if}
					</svg>

					{#if plan.popular}
						<span class="sp__popular">
							<span class="sp__popular-dot" aria-hidden="true"></span>
							Most Popular
						</span>
					{/if}

					<div class="sp__top">
						<h3 class="sp__name">{plan.name}</h3>
						<p class="sp__price">
							<span class="sp__amount" aria-live="polite">
								{#key price}
									<span class="sp__digits">${price}</span>
								{/key}
							</span>
							<span class="sp__per">/month</span>
						</p>
						<p class="sp__blurb">{plan.blurb}</p>
					</div>

					<ul class="sp__features">
						{#each plan.features as f}
							<li>• {f}</li>
						{/each}
					</ul>

					<a class="sp__cta" href="#{plan.id}" onclick={(e) => e.preventDefault()}>
						<span class="sp__cta-roll">
							<span class="sp__cta-label">Select Plan</span>
							<span class="sp__cta-label" aria-hidden="true">
								Select Plan
								<svg class="sp__cta-arrow" viewBox="0 0 16 16" aria-hidden="true">
									<path
										d="M3 8h9m-4-4 4 4-4 4"
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</main>
