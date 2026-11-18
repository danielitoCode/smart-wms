<script lang="ts">
	/**
	 * Lab detail — OnboardingScreen
	 */
	import OnboardingScreen from '../../../lib/components/OnboardingScreen.svelte';
	import type { OnboardingCompleteData } from '../../../lib/components/onboardingScreen.types';

	let lastResult = $state<OnboardingCompleteData | null>(null);

	function handleComplete(data: OnboardingCompleteData) {
		lastResult = data;
	}
</script>

<svelte:head>
	<title>OnboardingScreen · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">OnboardingScreen</h1>
	<p class="detail-lead">
		Card multi-paso de alta de negocio / workspace. Migrado desde React + motion a Svelte 5 con
		tokens Abellis. Progress bars CSS, preview panel en desktop, callback onComplete.
	</p>
</section>

{#if lastResult}
	<p class="detail-result" role="status">
		onComplete → businessName: <strong>{lastResult.businessName}</strong>, legalName:
		<strong>{lastResult.legalName || '—'}</strong>
	</p>
{/if}

<section class="detail-block">
	<h2 class="detail-h2">Default (Business Details)</h2>
	<div class="detail-stage">
		<OnboardingScreen onComplete={handleComplete} />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Workspace copy</h2>
	<div class="detail-stage">
		<OnboardingScreen
			title="Create Workspace"
			subtitle="Setting up your private workspace for collaboration."
			businessNameLabel="Workspace Name"
			businessNamePlaceholder="e.g. Design Team"
			legalNameLabel="Company Entity"
			legalNamePlaceholder="e.g. Design Lab LLC"
			nextButtonText="Continue Setup"
			finishButtonText="Launch App"
			tooltipMainText="Upload workspace logo"
			rightSectionDescription="This information will be used to customize your dashboard experience and team collaboration settings."
			onComplete={handleComplete}
		/>
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 1.5rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-result {
		margin: 0 0 1.25rem;
		padding: 0.65rem 0.9rem;
		border-radius: 10px;
		border: 1px solid var(--success, #1e7a46);
		background: var(--success-bg, #eaf5ee);
		font-size: 0.8125rem;
		color: var(--ink, #132234);
	}

	.detail-block {
		margin-bottom: 2rem;
	}

	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.detail-stage {
		padding: 1.25rem 0.75rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}
</style>
