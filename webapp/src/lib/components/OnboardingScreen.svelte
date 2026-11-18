<script lang="ts">
	/**
	 * OnboardingScreen — multi-step business/workspace setup card.
	 * Migrated from React + motion/react to Svelte 5.
	 * Tokens Abellis; CSS transitions (no motion lib).
	 *
	 * Uso:
	 *   <OnboardingScreen onComplete={(d) => console.log(d)} />
	 *   <OnboardingScreen title="Create Workspace" businessNameLabel="Workspace Name" />
	 */
	import type { OnboardingCompleteData } from './onboardingScreen.types';

	interface Props {
		title?: string;
		subtitle?: string;
		businessNameLabel?: string;
		businessNamePlaceholder?: string;
		legalNameLabel?: string;
		legalNamePlaceholder?: string;
		nextButtonText?: string;
		finishButtonText?: string;
		tooltipMainText?: string;
		tooltipSubText?: string;
		rightSectionDescription?: string;
		onComplete?: (data: OnboardingCompleteData) => void;
		class?: string;
	}

	let {
		title = 'Business Details',
		subtitle = 'Tell us about your brand to start creating campaigns.',
		businessNameLabel = 'Business name',
		businessNamePlaceholder = 'Enter your name',
		legalNameLabel = 'Business Legal name',
		legalNamePlaceholder = 'Enter your business legal name',
		nextButtonText = 'Create business account',
		finishButtonText = 'Finish Setup',
		tooltipMainText = 'Click here to add your profile image.',
		tooltipSubText = 'You can always do this later.',
		rightSectionDescription = "With your creator profile ready, it's time to set up your business account.",
		onComplete,
		class: className = ''
	}: Props = $props();

	const totalSteps = 3;

	let businessName = $state('Acme Inc');
	let legalName = $state('');
	let currentStep = $state(1);

	function handleNext() {
		if (currentStep < totalSteps) {
			currentStep += 1;
		} else {
			onComplete?.({ businessName, legalName });
		}
	}

	function handleBack() {
		if (currentStep > 1) currentStep -= 1;
	}
</script>

<div class="ob {className}">
	<div class="ob__card">
		<section class="ob__form">
			<div class="ob__form-inner">
				<div class="ob__logo" aria-hidden="true">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
						<path
							d="M7 8H5C3.34315 8 2 9.34315 2 11V13C2 14.6569 3.34315 16 5 16H7M17 8H19C20.6569 8 22 9.34315 22 11V13C22 14.6569 20.6569 16 19 16H17M8 12H16"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
						/>
					</svg>
				</div>

				<h1 class="ob__title">{title}</h1>
				<p class="ob__subtitle">{subtitle}</p>

				<div class="ob__steps" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
					{#each [1, 2, 3] as i (i)}
						<div class="ob__step-track">
							<div class="ob__step-fill" class:ob__step-fill--on={i <= currentStep}></div>
						</div>
					{/each}
				</div>

				<div class="ob__fields">
					<div class="ob__field">
						<label class="ob__label" for="ob-business-name">
							{businessNameLabel}
							<span class="ob__info" title="Required" aria-hidden="true">ⓘ</span>
						</label>
						<input
							id="ob-business-name"
							class="ob__input"
							type="text"
							placeholder={businessNamePlaceholder}
							bind:value={businessName}
							autocomplete="organization"
						/>
					</div>

					<div class="ob__field">
						<label class="ob__label" for="ob-legal-name">
							{legalNameLabel}
							<span class="ob__info" title="Optional" aria-hidden="true">ⓘ</span>
						</label>
						<input
							id="ob-legal-name"
							class="ob__input"
							type="text"
							placeholder={legalNamePlaceholder}
							bind:value={legalName}
							autocomplete="organization"
						/>
					</div>
				</div>

				<div class="ob__actions">
					<button type="button" class="ob__back" onclick={handleBack} disabled={currentStep <= 1} aria-label="Back">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M15 6 9 12l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</button>
					<button type="button" class="ob__next" onclick={handleNext}>
						{currentStep === totalSteps ? finishButtonText : nextButtonText}
					</button>
				</div>
			</div>
		</section>

		<aside class="ob__preview" aria-hidden="true">
			<div class="ob__tooltip">
				<p class="ob__tooltip-main">{tooltipMainText}</p>
				<p class="ob__tooltip-sub">{tooltipSubText}</p>
			</div>

			<div class="ob__preview-card">
				<div class="ob__preview-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M12 5v14M5 12h14" stroke-linecap="round" />
						<rect x="3" y="3" width="18" height="18" rx="4" />
					</svg>
				</div>
				<div class="ob__preview-name">
					<span>{businessName || 'Your Brand'}</span>
					<svg class="ob__badge" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M12 2l2.4 2.1 3.2-.4 1.2 3 .2 3.2 2.1 2.4-2.1 2.4-.2 3.2-1.2 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1.2-3-.2-3.2L3.1 12l2.1-2.4.2-3.2 1.2-3 3.2.4L12 2zm-1.1 13.3 5.3-5.3-1.4-1.4-3.9 3.9-1.8-1.8-1.4 1.4 3.2 3.2z" />
					</svg>
				</div>
				<div class="ob__skeleton">
					<div class="ob__skel-line"></div>
					<div class="ob__skel-line ob__skel-line--short"></div>
				</div>
			</div>

			<p class="ob__preview-desc">{rightSectionDescription}</p>
		</aside>
	</div>
</div>

<style>
	.ob {
		display: flex;
		width: 100%;
		min-height: 100%;
		align-items: center;
		justify-content: center;
		background: transparent;
	}

	.ob__card {
		display: flex;
		width: 100%;
		max-width: 24rem;
		flex-direction: column;
		overflow: hidden;
		border-radius: 32px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		padding: 0.5rem;
		box-shadow: var(--shadow-3, 0 22px 48px rgba(10, 30, 60, 0.16));
	}

	.ob__form {
		display: flex;
		flex: 1.2;
		flex-direction: column;
		justify-content: center;
		border-radius: 26px;
		border: 1px solid color-mix(in srgb, var(--ink, #132234) 6%, transparent);
		background: var(--surface-2, #f5f8fc);
		padding: 2.5rem 2rem;
	}

	.ob__form-inner {
		width: 100%;
		max-width: 22rem;
		margin-inline: auto;
	}

	.ob__logo {
		display: inline-grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		margin-bottom: 1.75rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--ink, #132234) 6%, transparent);
		color: var(--ink, #132234);
	}

	.ob__title {
		margin: 0 0 0.35rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}

	.ob__subtitle {
		margin: 0 0 1.75rem;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--slate, #5c6b7d);
	}

	.ob__steps {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.ob__step-track {
		position: relative;
		flex: 1;
		height: 4px;
		overflow: hidden;
		border-radius: 999px;
		background: color-mix(in srgb, var(--ink, #132234) 8%, transparent);
	}

	.ob__step-fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0%;
		background: var(--success, #1e7a46);
		border-radius: inherit;
		transition: width 320ms cubic-bezier(0.32, 1.1, 0.55, 1);
	}

	.ob__step-fill--on {
		width: 100%;
	}

	.ob__fields {
		display: flex;
		flex-direction: column;
		gap: 1.35rem;
		margin-bottom: 2rem;
	}

	.ob__field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.ob__label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted, #7e8b9b);
	}

	.ob__info {
		opacity: 0.55;
		font-size: 0.75rem;
		font-weight: 400;
		letter-spacing: 0;
		text-transform: none;
	}

	.ob__input {
		width: 100%;
		padding: 0.85rem 1.15rem;
		border-radius: 16px;
		border: 1.5px solid color-mix(in srgb, var(--ink, #132234) 18%, transparent);
		background: var(--card, #fff);
		color: var(--ink, #132234);
		font-size: 0.875rem;
		font-family: inherit;
		outline: none;
		transition: border-color 160ms ease, box-shadow 160ms ease;
	}

	.ob__input::placeholder {
		color: var(--muted, #7e8b9b);
	}

	.ob__input:focus {
		border-color: var(--navy, #004c8b);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy, #004c8b) 18%, transparent);
	}

	.ob__actions {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.ob__back {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		padding: 0;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		color: var(--slate, #5c6b7d);
		cursor: pointer;
		transition: background 140ms ease, opacity 140ms ease;
	}

	.ob__back:hover:not(:disabled) {
		background: var(--surface-2, #f5f8fc);
	}

	.ob__back:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.ob__next {
		flex: 1;
		min-width: 0;
		padding: 1rem 1.5rem;
		border: 0;
		border-radius: 16px;
		background: var(--ink, #132234);
		color: var(--card, #fff);
		font-size: 0.875rem;
		font-weight: 700;
		font-family: inherit;
		white-space: nowrap;
		cursor: pointer;
		box-shadow: var(--shadow-2, 0 6px 18px rgba(16, 38, 64, 0.12));
		transition: transform 120ms ease, filter 120ms ease;
	}

	.ob__next:hover {
		filter: brightness(1.08);
	}

	.ob__next:active {
		transform: scale(0.98);
	}

	.ob__preview {
		display: none;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 26px;
		border: 1px solid color-mix(in srgb, var(--ink, #132234) 5%, transparent);
		background: var(--surface-3, #e7eef6);
		padding: 2.5rem 2rem;
	}

	.ob__tooltip {
		z-index: 1;
		margin-bottom: -0.85rem;
		padding: 0.55rem 1rem;
		border-radius: 14px;
		border: 1px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		box-shadow: var(--shadow-2, 0 6px 18px rgba(16, 38, 64, 0.1));
		text-align: center;
	}

	.ob__tooltip-main {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ink, #132234);
		white-space: nowrap;
	}

	.ob__tooltip-sub {
		margin: 0.15rem 0 0;
		font-size: 0.65rem;
		font-weight: 400;
		opacity: 0.6;
		color: var(--ink, #132234);
		white-space: nowrap;
	}

	.ob__preview-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 18rem;
		aspect-ratio: 1;
		margin: 1.75rem 0;
		padding: 2rem;
		border-radius: 32px;
		border: 2px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		box-shadow: var(--shadow-1);
	}

	.ob__preview-icon {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		margin-bottom: 1.25rem;
		border-radius: 16px;
		background: var(--surface-2, #f5f8fc);
		color: var(--muted, #7e8b9b);
	}

	.ob__preview-name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 1.25rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
		white-space: nowrap;
	}

	.ob__badge {
		flex-shrink: 0;
		color: var(--warning, #9a6a00);
	}

	.ob__skeleton {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		opacity: 0.18;
	}

	.ob__skel-line {
		height: 6px;
		width: 100%;
		border-radius: 999px;
		background: var(--ink, #132234);
	}

	.ob__skel-line--short {
		width: 66%;
		margin-inline: auto;
	}

	.ob__preview-desc {
		margin: 0;
		max-width: 16rem;
		text-align: center;
		font-size: 0.75rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	@media (min-width: 768px) {
		.ob__card {
			max-width: 64rem;
			flex-direction: row;
			min-height: 37.5rem;
		}

		.ob__form {
			border-radius: 26px 0 0 26px;
			border-right: 0;
			padding: 2.5rem 3.5rem;
		}

		.ob__preview {
			display: flex;
			border-radius: 0 26px 26px 0;
			border-left: 0;
		}
	}
</style>
