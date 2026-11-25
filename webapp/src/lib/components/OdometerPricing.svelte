<script lang="ts">
	/**
	 * Odometer Pricing — three plans + monthly/annual switch.
	 * Digit wheels roll via CSS transform; popular card has grain glow + cursor trail.
	 */
	import { onMount } from 'svelte';
	import './odometer-pricing.css';

	type Billing = 'annual' | 'monthly';

	type Plan = {
		id: string;
		name: string;
		price: Record<Billing, number>;
		features: string[];
		popular?: boolean;
	};

	const PLANS: Plan[] = [
		{
			id: 'starter',
			name: 'Starter',
			price: { monthly: 20, annual: 16 },
			features: [
				'Limited decision runs per month',
				'Access to core AI agents',
				'Basic structured outputs',
				'Standard reasoning depth'
			]
		},
		{
			id: 'growth',
			name: 'Growth',
			price: { monthly: 99, annual: 79 },
			popular: true,
			features: [
				'Higher decision limits',
				'Multiple expert agents',
				'Debate style reasoning',
				'Context aware memory',
				'Priority support'
			]
		},
		{
			id: 'enterprise',
			name: 'Enterprise',
			price: { monthly: 299, annual: 239 },
			features: [
				'Unlimited decision runs',
				'Custom AI agents',
				'Team collaboration dashboard',
				'Dedicated account manager',
				'SLA & priority support'
			]
		}
	];

	const POPULAR_INDEX = PLANS.findIndex((p) => p.popular);
	const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const CARD_DELAYS = [0.62, 0.5, 0.74];

	let billing = $state<Billing>('monthly');
	let active = $state(POPULAR_INDEX >= 0 ? POPULAR_INDEX : 0);
	let finePointer = $state(false);
	let trackEl = $state<HTMLDivElement | null>(null);
	const cardEls: (HTMLElement | null)[] = [];

	function cards(): HTMLElement[] {
		return Array.from(trackEl?.querySelectorAll<HTMLElement>('.op-plan') ?? []);
	}
	function isCarousel() {
		const t = trackEl;
		return !!t && t.scrollWidth > t.clientWidth + 1;
	}
	function leftFor(el: HTMLElement) {
		const t = trackEl!;
		return el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2;
	}
	function goTo(i: number) {
		const t = trackEl;
		const el = cards()[i];
		if (t && el) t.scrollTo({ left: leftFor(el), behavior: 'smooth' });
	}

	function mountTrail(host: HTMLElement, canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return () => {};
		const LIFE = 240;
		const pts: { x: number; y: number; t: number }[] = [];
		const spot = { x: 0, y: 0, a: 0, target: 0 };
		let dpr = 1,
			w = 0,
			h = 0,
			raf = 0,
			last = 0;

		const resize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = host.clientWidth;
			h = host.clientHeight;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
		};
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(host);

		const frame = (now: number) => {
			const dt = last ? Math.min(64, now - last) : 16;
			last = now;
			while (pts.length && now - pts[0]!.t > LIFE) pts.shift();
			spot.a += (spot.target - spot.a) * Math.min(1, dt / 140);

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			if (spot.a > 0.002) {
				const g = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, 150);
				g.addColorStop(0, `rgba(255,255,255,${0.12 * spot.a})`);
				g.addColorStop(1, 'rgba(255,255,255,0)');
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, w, h);
			}

			if (pts.length > 1) {
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.shadowColor = 'rgba(255,255,255,0.6)';
				ctx.shadowBlur = 8;
				for (let i = 1; i < pts.length; i++) {
					const life = 1 - (now - pts[i]!.t) / LIFE;
					const k = life * life;
					ctx.strokeStyle = `rgba(255,255,255,${0.28 * k})`;
					ctx.lineWidth = 1 + 3 * k;
					ctx.beginPath();
					ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
					ctx.lineTo(pts[i]!.x, pts[i]!.y);
					ctx.stroke();
				}
				ctx.shadowBlur = 0;
			}

			if (pts.length || Math.abs(spot.target - spot.a) > 0.002 || spot.a > 0.002) {
				raf = requestAnimationFrame(frame);
			} else {
				raf = 0;
				last = 0;
			}
		};
		const wake = () => {
			if (!raf) raf = requestAnimationFrame(frame);
		};

		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
			const r = host.getBoundingClientRect();
			const x = e.clientX - r.left,
				y = e.clientY - r.top;
			pts.push({ x, y, t: performance.now() });
			spot.x = x;
			spot.y = y;
			spot.target = 1;
			wake();
		};
		const onLeave = () => {
			spot.target = 0;
			wake();
		};
		host.addEventListener('pointermove', onMove);
		host.addEventListener('pointerleave', onLeave);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			host.removeEventListener('pointermove', onMove);
			host.removeEventListener('pointerleave', onLeave);
		};
	}

	onMount(() => {
		const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
		const updateFine = () => {
			finePointer = mq.matches && !reduce.matches;
		};
		updateFine();
		mq.addEventListener('change', updateFine);
		reduce.addEventListener('change', updateFine);

		const t = trackEl;
		if (t) {
			const el = cards()[POPULAR_INDEX];
			if (el && isCarousel()) t.scrollLeft = leftFor(el);

			let raf = 0;
			const onScroll = () => {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					const mid = t.scrollLeft + t.clientWidth / 2;
					let best = 0,
						dist = Infinity;
					cards().forEach((c, i) => {
						const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
						if (d < dist) {
							dist = d;
							best = i;
						}
					});
					active = best;
				});
			};
			const ro = new ResizeObserver(() => {
				const el2 = cards()[active];
				if (el2 && isCarousel()) t.scrollLeft = leftFor(el2);
			});
			t.addEventListener('scroll', onScroll, { passive: true });
			ro.observe(t);

			return () => {
				mq.removeEventListener('change', updateFine);
				reduce.removeEventListener('change', updateFine);
				cancelAnimationFrame(raf);
				t.removeEventListener('scroll', onScroll);
				ro.disconnect();
			};
		}

		return () => {
			mq.removeEventListener('change', updateFine);
			reduce.removeEventListener('change', updateFine);
		};
	});

	$effect(() => {
		if (!finePointer) return;
		const host = cardEls[POPULAR_INDEX];
		if (!host) return;
		const canvas = host.querySelector<HTMLCanvasElement>('.op-plan__trail');
		if (!canvas) return;
		return mountTrail(host, canvas);
	});
</script>

<main class="op-pricing-page">
	<section class="op-pricing" aria-labelledby="pricing-title">
		<div class="op-pricing__head">
			<h1 id="pricing-title" class="op-pricing__title">
				<span class="op-pricing__word">Plans</span>
				<span class="op-pricing__word">and</span>
				<span class="op-pricing__word op-pricing__word--accent">Pricing</span>
			</h1>

			<div class="op-billing" role="radiogroup" aria-label="Billing period">
				{#each [{ id: 'annual' as Billing, label: 'Bill annually' }, { id: 'monthly' as Billing, label: 'Bill monthly' }] as o}
					<button
						type="button"
						role="radio"
						aria-checked={billing === o.id}
						class="op-billing__opt"
						class:is-on={billing === o.id}
						onclick={() => (billing = o.id)}
					>
						{#if billing === o.id}
							<span class="op-billing__pill" aria-hidden="true"></span>
						{/if}
						<span class="op-billing__label">{o.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="op-pricing__track" bind:this={trackEl} data-lenis-prevent-horizontal="">
			{#each PLANS as plan, i (plan.id)}
				<article
					class="op-plan"
					class:op-plan--popular={plan.popular}
					class:is-active={i === active}
					aria-labelledby="plan-{plan.id}"
					style="animation-delay: {CARD_DELAYS[i]}s"
					bind:this={cardEls[i]}
				>
					{#if plan.popular}
						<svg
							class="op-plan__glow"
							viewBox="0 0 866 893"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<defs>
								<filter
									id="growth-glow"
									x="0"
									y="0"
									width="866"
									height="893"
									filterUnits="userSpaceOnUse"
									color-interpolation-filters="sRGB"
								>
									<feGaussianBlur in="SourceGraphic" stdDeviation="75" result="blur" />
									<feTurbulence
										type="fractalNoise"
										baseFrequency="0.5"
										numOctaves="3"
										seed="2227"
										stitchTiles="stitch"
										result="noise"
									/>
									<feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
									<feComponentTransfer in="alphaNoise" result="grain">
										<feFuncA
											type="discrete"
											tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"
										/>
									</feComponentTransfer>
									<feComposite operator="in" in="grain" in2="blur" result="grainClipped" />
									<feFlood flood-color="#ffffff" flood-opacity="0.25" result="white" />
									<feComposite operator="in" in="white" in2="grainClipped" result="speckle" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="speckle" />
									</feMerge>
								</filter>
							</defs>
							<ellipse
								cx="433"
								cy="446.5"
								rx="283"
								ry="296.5"
								fill="#008bff"
								filter="url(#growth-glow)"
							/>
						</svg>
						{#if finePointer}
							<canvas class="op-plan__trail" aria-hidden="true"></canvas>
						{/if}
					{/if}

					<div class="op-plan__body">
						<div class="op-plan__head">
							<h2 id="plan-{plan.id}" class="op-plan__name">{plan.name}</h2>
							{#if plan.popular}
								<span class="op-plan__badge">Most Popular</span>
							{/if}
						</div>

						{@const value = plan.price[billing]}
						{@const digits = String(value).split('').map(Number)}
						<p class="op-plan__price">
							<span
								class="op-plan__amount"
								role="text"
								aria-label="${value} per month{billing === 'annual' ? ', billed yearly' : ''}"
							>
								<span class="op-plan__currency" aria-hidden="true">$</span>
								<span class="op-roll" aria-hidden="true">
									{#each digits as d, di (digits.length - di)}
										<span class="op-roll__win">
											<span
												class="op-roll__col"
												style="transform: translateY({-d}em); transition-delay: {di * 0.06}s"
											>
												{#each DIGITS as n}
													<span>{n}</span>
												{/each}
											</span>
										</span>
									{/each}
								</span>
							</span>
							<span class="op-plan__per" aria-hidden="true">
								{#if billing === 'annual'}
									<span class="op-plan__note">billed yearly</span>
								{/if}
								<span>/ month</span>
							</span>
						</p>

						<a href="#start-trial" class="op-plan__cta" onclick={(e) => e.preventDefault()}>
							Start Free Trial
						</a>

						<ul class="op-plan__features">
							{#each plan.features as f, fi}
								<li style="animation-delay: {(CARD_DELAYS[i] ?? 0.5) + 0.35 + fi * 0.05}s">
									<svg class="op-plan__tick" viewBox="0 0 24 24" aria-hidden="true">
										<path
											d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8-1.41-1.42Z"
										/>
									</svg>
									<span>{f}</span>
								</li>
							{/each}
						</ul>
					</div>
				</article>
			{/each}
		</div>

		<div class="op-pricing__dots" role="tablist" aria-label="Plans">
			{#each PLANS as p, i}
				<button
					type="button"
					role="tab"
					aria-selected={i === active}
					aria-label="Show {p.name} plan"
					class="op-pricing__dot"
					class:is-on={i === active}
					onclick={() => goTo(i)}
				></button>
			{/each}
		</div>
	</section>
</main>
