<!-- Session lock motif — inspired by Flowbite PasswordLockKey (MIT), Abellis colors -->
<script lang="ts">
	let { height = '160' }: { height?: string } = $props();
</script>

<svg
	class="illust"
	aria-hidden="true"
	viewBox="0 0 320 280"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	style:height={height + 'px'}
>
	<ellipse cx="160" cy="248" rx="110" ry="14" fill="color-mix(in srgb, var(--navy) 12%, transparent)" />
	<path
		d="M160 36c-36 18-72 22-96 24v88c0 52 36 88 96 112 60-24 96-60 96-112V60c-24-2-60-6-96-24Z"
		fill="color-mix(in srgb, var(--lightblue, #8fb4da) 35%, white)"
		stroke="var(--navy)"
		stroke-width="3"
	/>
	<path
		d="M160 56c-28 14-56 17-74 18v72c0 40 28 68 74 88 46-20 74-48 74-88V74c-18-1-46-4-74-18Z"
		fill="color-mix(in srgb, var(--navy) 8%, white)"
	/>
	<rect x="118" y="132" width="84" height="64" rx="12" fill="var(--navy)" />
	<rect x="126" y="140" width="68" height="48" rx="8" fill="color-mix(in srgb, var(--navy-deep, #012a50) 80%, black)" />
	<path
		d="M138 132v-18c0-14 10-26 22-26s22 12 22 26v18"
		stroke="var(--gold)"
		stroke-width="8"
		stroke-linecap="round"
		fill="none"
	/>
	<circle cx="160" cy="160" r="8" fill="var(--gold)" />
	<path d="M160 166v18" stroke="var(--gold)" stroke-width="6" stroke-linecap="round" />
	<circle class="dot d1" cx="56" cy="100" r="5" fill="var(--gold)" opacity="0.7" />
	<circle class="dot d2" cx="268" cy="120" r="4" fill="var(--lightblue, #8fb4da)" opacity="0.8" />
	<circle class="dot d3" cx="80" cy="200" r="3.5" fill="var(--navy)" opacity="0.45" />
</svg>

<style>
	.illust {
		width: auto;
		max-width: min(14rem, 70vw);
		display: block;
		margin-inline: auto;
		animation: float-y 3.2s ease-in-out infinite;
	}
	.dot { animation: pulse-dot 2.4s ease-in-out infinite; }
	.d2 { animation-delay: 0.4s; }
	.d3 { animation-delay: 0.8s; }
	@keyframes float-y {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}
	@keyframes pulse-dot {
		0%, 100% { opacity: 0.45; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.15); }
	}
	@media (prefers-reduced-motion: reduce) {
		.illust, .dot { animation: none; }
	}
</style>
