<script lang="ts">
	/**
	 * PremiumTestimonial — carousel de testimonios con autoplay.
	 * Migrado de React + Framer Motion a Svelte 5 (CSS transitions, sin motion lib).
	 *
	 * Uso:
	 *   <PremiumTestimonial />
	 *   <PremiumTestimonial title="Trusted by" subTitle="Industry Leaders" />
	 */
	import type { Testimonial } from './premiumTestimonial.types';

	interface Props {
		title?: string;
		subTitle?: string;
		tagline?: string;
		des?: string;
		items?: Testimonial[];
		autoplayMs?: number;
		class?: string;
	}

	const DEFAULT_ITEMS: Testimonial[] = [
		{
			name: 'Sarah Chen',
			role: 'CEO, TechFlow Solutions',
			company: 'TechFlow',
			avatar:
				'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: "Lord AI transformed our entire operation. We've seen a 300% increase in efficiency and saved over $2M in operational costs. The autonomous agents work flawlessly.",
			results: ['300% efficiency increase', '$2M cost savings', '24/7 automation']
		},
		{
			name: 'Marcus Johnson',
			role: 'CTO, DataDrive Inc',
			company: 'DataDrive',
			avatar:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'The AI voice agents are revolutionary. Our customer satisfaction increased by 40% while reducing response time from hours to seconds. Incredible ROI.',
			results: ['40% satisfaction boost', 'Instant responses', 'Seamless integration']
		},
		{
			name: 'Elena Rodriguez',
			role: 'VP Operations, ScaleUp Co',
			company: 'ScaleUp',
			avatar:
				'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'From workflow automation to social media management, Lord AI handles everything. Our team can finally focus on strategy instead of repetitive tasks.',
			results: ['Full automation', 'Strategic focus', 'Team productivity']
		},
		{
			name: 'David Kim',
			role: 'Founder, GrowthLab',
			company: 'GrowthLab',
			avatar:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'The custom AI systems delivered results beyond our expectations. Revenue increased 150% while operational overhead decreased significantly.',
			results: ['150% revenue growth', 'Reduced overhead', 'Scalable systems']
		},
		{
			name: 'Lisa Thompson',
			role: 'Director, InnovateCorp',
			company: 'InnovateCorp',
			avatar:
				'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: "Exceptional AI solutions that actually work. The implementation was smooth, and the results were immediate. Best investment we've made.",
			results: ['Immediate results', 'Smooth integration', 'High ROI']
		}
	];

	const STATS = [
		{ number: '500+', label: 'Happy Clients' },
		{ number: '98%', label: 'Satisfaction Rate' },
		{ number: '$10M+', label: 'Cost Savings' },
		{ number: '99.9%', label: 'Uptime SLA' }
	] as const;

	let {
		title = 'Trusted by',
		subTitle = 'Industry Leaders',
		tagline = 'Client Success Stories',
		des = 'Join thousands of businesses already transforming their operations with our premium AI solutions.',
		items = DEFAULT_ITEMS,
		autoplayMs = 6000,
		class: className = ''
	}: Props = $props();

	let currentIndex = $state(0);
	let direction = $state(1);
	let animKey = $state(0);

	const current = $derived(items[currentIndex] ?? items[0]);
	const len = $derived(items.length);

	function goTo(index: number) {
		if (index === currentIndex || len === 0) return;
		direction = index > currentIndex ? 1 : -1;
		currentIndex = ((index % len) + len) % len;
		animKey += 1;
	}

	function next() {
		if (len === 0) return;
		direction = 1;
		currentIndex = (currentIndex + 1) % len;
		animKey += 1;
	}

	function prev() {
		if (len === 0) return;
		direction = -1;
		currentIndex = (currentIndex - 1 + len) % len;
		animKey += 1;
	}

	$effect(() => {
		if (!autoplayMs || autoplayMs <= 0 || len < 2) return;
		const id = setInterval(() => {
			direction = 1;
			currentIndex = (currentIndex + 1) % len;
			animKey += 1;
		}, autoplayMs);
		return () => clearInterval(id);
	});
</script>

<section class="pt {className}" id="testimonials" aria-roledescription="carousel">
	<div class="pt__bg" aria-hidden="true">
		<div class="pt__mesh"></div>
		<div class="pt__orb pt__orb--a"></div>
		<div class="pt__orb pt__orb--b"></div>
	</div>

	<div class="pt__inner">
		<header class="pt__header">
			<div class="pt__badge">
				<span class="pt__spark" aria-hidden="true">✦</span>
				<span>{tagline}</span>
				<span class="pt__pulse" aria-hidden="true"></span>
			</div>
			<h2 class="pt__title">
				<span class="pt__title-main">{title}</span>
				<br />
				<span class="pt__title-grad">{subTitle}</span>
			</h2>
			<p class="pt__des">{des}</p>
		</header>

		{#if current}
			<div class="pt__stage">
				{#key animKey}
					<article
						class="pt__card"
						class:pt__card--from-right={direction > 0}
						class:pt__card--from-left={direction < 0}
						aria-live="polite"
					>
						<div class="pt__quote-icon" aria-hidden="true">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.25">
								<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
							</svg>
						</div>

						<div class="pt__body">
							<div class="pt__person">
								<div class="pt__avatar-wrap">
									<img
										class="pt__avatar"
										src={current.avatar}
										alt={current.name}
										width="96"
										height="96"
										loading="lazy"
									/>
									<span class="pt__ring" aria-hidden="true"></span>
								</div>
								<h3 class="pt__name">{current.name}</h3>
								<p class="pt__role">{current.role}</p>
								<p class="pt__company">{current.company}</p>
								<div class="pt__stars" aria-label="{current.rating} out of 5 stars">
									{#each Array(current.rating) as _, i (i)}
										<span class="pt__star" aria-hidden="true">★</span>
									{/each}
								</div>
							</div>

							<div class="pt__content">
								<blockquote class="pt__text">“{current.text}”</blockquote>
								<ul class="pt__results">
									{#each current.results as result (result)}
										<li class="pt__result">{result}</li>
									{/each}
								</ul>
							</div>
						</div>
					</article>
				{/key}
			</div>

			<div class="pt__nav">
				<button type="button" class="pt__arrow" onclick={prev} aria-label="Previous testimonial">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 6 9 12l6 6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>

				<div class="pt__dots" role="tablist" aria-label="Testimonials">
					{#each items as _, index (index)}
						<button
							type="button"
							class="pt__dot"
							class:pt__dot--active={index === currentIndex}
							onclick={() => goTo(index)}
							aria-label="Go to testimonial {index + 1}"
							aria-selected={index === currentIndex}
							role="tab"
						></button>
					{/each}
				</div>

				<button type="button" class="pt__arrow" onclick={next} aria-label="Next testimonial">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
		{/if}

		<div class="pt__stats">
			{#each STATS as stat (stat.label)}
				<div class="pt__stat">
					<div class="pt__stat-num">{stat.number}</div>
					<div class="pt__stat-label">{stat.label}</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.pt {
		position: relative;
		padding: 4.5rem 0;
		overflow: hidden;
		color: #f4f6fb;
		background: linear-gradient(145deg, #0a0c12 0%, #12182a 45%, #0a0c12 100%);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}

	.pt__bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.pt__mesh {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at 20% 30%, rgba(99, 102, 241, 0.12), transparent 50%),
			radial-gradient(ellipse at 80% 70%, rgba(244, 63, 94, 0.1), transparent 50%);
		animation: pt-mesh 25s linear infinite;
		background-size: 200% 200%;
	}

	@keyframes pt-mesh {
		0%,
		100% {
			background-position: 0% 0%;
		}
		50% {
			background-position: 100% 100%;
		}
	}

	.pt__orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(64px);
		opacity: 0.35;
	}

	.pt__orb--a {
		top: 20%;
		left: 12%;
		width: 18rem;
		height: 18rem;
		background: rgba(99, 102, 241, 0.35);
		animation: pt-float-a 20s ease-in-out infinite;
	}

	.pt__orb--b {
		bottom: 18%;
		right: 10%;
		width: 20rem;
		height: 20rem;
		background: rgba(244, 63, 94, 0.28);
		animation: pt-float-b 22s ease-in-out infinite;
	}

	@keyframes pt-float-a {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(40px, 24px) scale(1.15);
		}
	}

	@keyframes pt-float-b {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(-32px, -20px) scale(1.2);
		}
	}

	.pt__inner {
		position: relative;
		z-index: 1;
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1.25rem;
	}

	.pt__header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.pt__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(8px);
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
	}

	.pt__spark {
		color: #a5b4fc;
	}

	.pt__pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: #4ade80;
		animation: pt-pulse 1.5s ease-in-out infinite;
	}

	@keyframes pt-pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(0.85);
		}
	}

	.pt__title {
		margin: 0 0 1.25rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(2rem, 5vw, 3.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.pt__title-main {
		color: rgba(255, 255, 255, 0.92);
	}

	.pt__title-grad {
		background: linear-gradient(90deg, #a5b4fc, #c4b5fd, #fda4af);
		background-size: 200% 200%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: pt-grad 5s ease-in-out infinite;
	}

	@keyframes pt-grad {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.pt__des {
		margin: 0 auto;
		max-width: 40rem;
		font-size: clamp(1rem, 2vw, 1.25rem);
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.55);
	}

	.pt__stage {
		position: relative;
		max-width: 56rem;
		margin: 0 auto 1.75rem;
		min-height: 22rem;
	}

	.pt__card {
		position: relative;
		padding: 1.75rem 1.5rem;
		border-radius: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
		backdrop-filter: blur(16px);
		overflow: hidden;
		animation: pt-enter 450ms cubic-bezier(0.23, 0.86, 0.39, 0.96) both;
	}

	.pt__card--from-right {
		--pt-x: 48px;
	}

	.pt__card--from-left {
		--pt-x: -48px;
	}

	@keyframes pt-enter {
		from {
			opacity: 0;
			transform: translateX(var(--pt-x, 32px)) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	.pt__quote-icon {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		color: #fff;
		pointer-events: none;
	}

	.pt__body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
	}

	@media (min-width: 768px) {
		.pt__card {
			padding: 2.5rem;
		}

		.pt__body {
			flex-direction: row;
			align-items: flex-start;
			text-align: left;
			gap: 2rem;
		}

		.pt__stage {
			min-height: 18rem;
		}
	}

	.pt__person {
		flex-shrink: 0;
		width: 100%;
		max-width: 14rem;
	}

	.pt__avatar-wrap {
		position: relative;
		width: 6rem;
		height: 6rem;
		margin: 0 auto 1rem;
	}

	@media (min-width: 768px) {
		.pt__avatar-wrap {
			margin-left: 0;
		}
	}

	.pt__avatar {
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
		border: 3px solid rgba(255, 255, 255, 0.2);
		display: block;
	}

	.pt__ring {
		position: absolute;
		inset: -4px;
		border-radius: 999px;
		border: 2px solid rgba(129, 140, 248, 0.35);
		animation: pt-ring 2s ease-out infinite;
		pointer-events: none;
	}

	@keyframes pt-ring {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.35);
			opacity: 0;
		}
	}

	.pt__name {
		margin: 0 0 0.25rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.35rem;
		font-weight: 700;
		color: #fff;
	}

	.pt__role {
		margin: 0 0 0.15rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: #a5b4fc;
	}

	.pt__company {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.55);
	}

	.pt__stars {
		display: flex;
		justify-content: center;
		gap: 0.15rem;
	}

	@media (min-width: 768px) {
		.pt__stars {
			justify-content: flex-start;
		}
	}

	.pt__star {
		color: #facc15;
		font-size: 1.1rem;
		line-height: 1;
	}

	.pt__content {
		flex: 1;
		min-width: 0;
	}

	.pt__text {
		margin: 0 0 1.25rem;
		font-size: clamp(1.05rem, 2vw, 1.35rem);
		font-weight: 300;
		font-style: italic;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.88);
	}

	.pt__results {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (min-width: 480px) {
		.pt__results {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.pt__result {
		padding: 0.65rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.72);
		text-align: center;
		transition: background 160ms ease;
	}

	.pt__result:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.pt__nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		margin-bottom: 3rem;
	}

	.pt__arrow {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		cursor: pointer;
		transition: background 160ms ease, transform 120ms ease;
	}

	.pt__arrow:hover {
		background: rgba(255, 255, 255, 0.16);
	}

	.pt__arrow:active {
		transform: scale(0.94);
	}

	.pt__dots {
		display: flex;
		gap: 0.55rem;
	}

	.pt__dot {
		width: 0.7rem;
		height: 0.7rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: transform 160ms ease, background 160ms ease;
	}

	.pt__dot:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	.pt__dot--active {
		background: #818cf8;
		transform: scale(1.25);
	}

	.pt__stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.pt__stats {
			grid-template-columns: repeat(4, 1fr);
			gap: 2rem;
		}
	}

	.pt__stat {
		text-align: center;
	}

	.pt__stat-num {
		margin-bottom: 0.35rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: 700;
		background: linear-gradient(90deg, #a5b4fc, #fda4af);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.pt__stat-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.55);
	}
</style>
