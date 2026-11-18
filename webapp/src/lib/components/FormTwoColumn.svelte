<script lang="ts">
	/**
	 * FormTwoColumn — marketing contact form (headline + illustration | card form).
	 * Migrated from React + Astrayx primitives to Svelte 5 + CSS (Abellis tokens).
	 *
	 * Uso:
	 *   <FormTwoColumn onSubmit={(data) => console.log(data)} />
	 */
	import type { ContactColumn, FormTwoColumnValues } from './formTwoColumn.types';

	const DEFAULT_REASONS = [
		'New business',
		'General inquiry',
		'Press & media',
		'Partnerships',
		'Product feedback',
		'Technical support',
		'Other'
	];

	const DEFAULT_BUDGET = [
		'Under $10k',
		'$10k – $50k',
		'$50k – $100k',
		'$100k – $500k',
		'$500k+',
		'Not sure yet'
	];

	const DEFAULT_CONTACTS: ContactColumn[] = [
		{ label: 'General inquiries', email: 'hello@company.com' },
		{ label: 'New business', email: 'newbiz@company.com' },
		{ label: 'Press & partnerships', email: 'press@company.com' }
	];

	interface Props {
		title?: string;
		subtitle?: string;
		illustrationUrl?: string;
		illustrationAlt?: string;
		inquiryReasons?: string[];
		budgetOptions?: string[];
		contactColumns?: ContactColumn[];
		submitLabel?: string;
		onSubmit?: (data: FormTwoColumnValues) => void;
		class?: string;
	}

	let {
		title = "Let's work together",
		subtitle = "Tell us what you're working on and we'll help you figure out the best path forward.",
		illustrationUrl = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&h=675&fit=crop',
		illustrationAlt = 'Two people working at a desk',
		inquiryReasons = DEFAULT_REASONS,
		budgetOptions = DEFAULT_BUDGET,
		contactColumns = DEFAULT_CONTACTS,
		submitLabel = "Let's connect",
		onSubmit,
		class: className = ''
	}: Props = $props();

	let fullName = $state('');
	let email = $state('');
	let company = $state('');
	let jobTitle = $state('');
	let phone = $state('');
	let inquiryReason = $state('');
	let budget = $state('');
	let details = $state('');
	let submitted = $state(false);

	const errors = $derived(
		submitted
			? {
					fullName: !fullName.trim() ? 'Required' : undefined,
					email: !email.trim() ? 'Required' : undefined,
					details: !details.trim() ? 'Required' : undefined
				}
			: ({} as { fullName?: string; email?: string; details?: string })
	);

	function toggleReason(reason: string) {
		inquiryReason = inquiryReason === reason ? '' : reason;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		submitted = true;
		if (!fullName.trim() || !email.trim() || !details.trim()) return;
		onSubmit?.({
			fullName: fullName.trim(),
			email: email.trim(),
			company: company.trim(),
			jobTitle: jobTitle.trim(),
			phone: phone.trim(),
			inquiryReason,
			budget,
			details: details.trim()
		});
	}
</script>

<div class="ftc {className}" role="main">
	<div class="ftc__inner">
		<div class="ftc__grid">
			<!-- Left: copy + illustration -->
			<div class="ftc__intro">
				<div class="ftc__copy">
					<h1 class="ftc__title">{title}</h1>
					<p class="ftc__subtitle">{subtitle}</p>
				</div>
				<div class="ftc__illu">
					<img src={illustrationUrl} alt={illustrationAlt} />
				</div>
			</div>

			<!-- Right: form card -->
			<form class="ftc__card" onsubmit={handleSubmit} novalidate>
				<p class="ftc__section-label">Your details</p>

				<div class="ftc__field">
					<label class="sr-only" for="ftc-name">Full name</label>
					<input
						id="ftc-name"
						class="ftc__input"
						class:ftc__input--error={!!errors.fullName}
						type="text"
						placeholder="Full name*"
						bind:value={fullName}
						autocomplete="name"
					/>
					{#if errors.fullName}
						<span class="ftc__error">{errors.fullName}</span>
					{/if}
				</div>

				<div class="ftc__row">
					<div class="ftc__field">
						<label class="sr-only" for="ftc-email">Email</label>
						<input
							id="ftc-email"
							class="ftc__input"
							class:ftc__input--error={!!errors.email}
							type="email"
							placeholder="Email*"
							bind:value={email}
							autocomplete="email"
						/>
						{#if errors.email}
							<span class="ftc__error">{errors.email}</span>
						{/if}
					</div>
					<div class="ftc__field">
						<label class="sr-only" for="ftc-company">Company name</label>
						<input
							id="ftc-company"
							class="ftc__input"
							type="text"
							placeholder="Company name"
							bind:value={company}
							autocomplete="organization"
						/>
					</div>
				</div>

				<div class="ftc__row">
					<div class="ftc__field">
						<label class="sr-only" for="ftc-job">Job title</label>
						<input
							id="ftc-job"
							class="ftc__input"
							type="text"
							placeholder="Job title"
							bind:value={jobTitle}
							autocomplete="organization-title"
						/>
					</div>
					<div class="ftc__field">
						<label class="sr-only" for="ftc-phone">Phone number</label>
						<input
							id="ftc-phone"
							class="ftc__input"
							type="tel"
							placeholder="Phone number"
							bind:value={phone}
							autocomplete="tel"
						/>
					</div>
				</div>

				<div class="ftc__field">
					<p class="ftc__section-label">What are you reaching out about?</p>
					<div class="ftc__tokens" role="group" aria-label="Inquiry reason">
						{#each inquiryReasons as reason (reason)}
							<button
								type="button"
								class="ftc__token"
								class:ftc__token--active={inquiryReason === reason}
								aria-pressed={inquiryReason === reason}
								onclick={() => toggleReason(reason)}
							>
								{reason}
							</button>
						{/each}
					</div>
				</div>

				<div class="ftc__field">
					<label class="ftc__section-label" for="ftc-budget">Budget range</label>
					<select id="ftc-budget" class="ftc__select" bind:value={budget}>
						<option value="">Select a budget range...</option>
						{#each budgetOptions as opt (opt)}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</div>

				<div class="ftc__field">
					<label class="sr-only" for="ftc-details">Project details</label>
					<textarea
						id="ftc-details"
						class="ftc__textarea"
						class:ftc__input--error={!!errors.details}
						placeholder="Project details*"
						rows="4"
						bind:value={details}
					></textarea>
					{#if errors.details}
						<span class="ftc__error">{errors.details}</span>
					{/if}
				</div>

				<button type="submit" class="ftc__submit">{submitLabel}</button>
			</form>
		</div>

		<hr class="ftc__divider" />

		<div class="ftc__contacts">
			{#each contactColumns as col (col.email)}
				<div class="ftc__contact">
					<span class="ftc__contact-label">{col.label}</span>
					<a class="ftc__contact-email" href="mailto:{col.email}">{col.email}</a>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.ftc {
		width: 100%;
		min-height: 100%;
		display: flex;
		justify-content: center;
	}

	.ftc__inner {
		width: 100%;
		max-width: 1100px;
		padding: 1.5rem 1rem 2.5rem;
	}

	@media (min-width: 768px) {
		.ftc__inner {
			padding: 2.5rem 1.5rem 3rem;
		}
	}

	.ftc__grid {
		display: grid;
		gap: 2rem;
		align-items: center;
	}

	@media (min-width: 800px) {
		.ftc__grid {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
		}
	}

	.ftc__intro {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.ftc__copy {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ftc__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
		color: var(--head-ink, #012a50);
	}

	.ftc__subtitle {
		margin: 0;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
		max-width: 36ch;
	}

	.ftc__illu {
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: var(--radius-card, 16px);
		background: var(--surface-2, #f5f8fc);
	}

	.ftc__illu img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.ftc__card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: var(--radius-card, 16px);
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		box-shadow: var(--shadow-1, 0 4px 16px -6px rgba(0, 0, 0, 0.08));
	}

	@media (min-width: 640px) {
		.ftc__card {
			padding: 2rem;
		}
	}

	.ftc__section-label {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.ftc__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.ftc__row {
		display: grid;
		gap: 0.75rem;
	}

	@media (min-width: 480px) {
		.ftc__row {
			grid-template-columns: 1fr 1fr;
		}
	}

	.ftc__input,
	.ftc__select,
	.ftc__textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.7rem 0.85rem;
		border: 1.5px solid var(--line, #d9e2ec);
		border-radius: 10px;
		background: var(--surface-2, #f5f8fc);
		font: inherit;
		font-size: 0.9375rem;
		color: var(--ink, #132234);
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.ftc__input:focus,
	.ftc__select:focus,
	.ftc__textarea:focus {
		border-color: var(--navy, #004c8b);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy, #004c8b) 18%, transparent);
		background: var(--card, #fff);
	}

	.ftc__input--error {
		border-color: #c0392b;
	}

	.ftc__textarea {
		resize: vertical;
		min-height: 6rem;
	}

	.ftc__error {
		font-size: 0.75rem;
		font-weight: 600;
		color: #c0392b;
	}

	.ftc__tokens {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ftc__token {
		padding: 0.4rem 0.75rem;
		border: 1.5px solid var(--line, #d9e2ec);
		border-radius: 999px;
		background: var(--surface-2, #f5f8fc);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.ftc__token:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 35%, var(--line));
		color: var(--ink, #132234);
	}

	.ftc__token--active {
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, #fff);
		border-color: var(--navy, #004c8b);
		color: var(--navy, #004c8b);
		font-weight: 600;
	}

	.ftc__submit {
		width: 100%;
		margin-top: 0.25rem;
		padding: 0.8rem 1.25rem;
		border: 0;
		border-radius: 12px;
		background: var(--navy, #004c8b);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		cursor: pointer;
		transition: transform 0.12s ease, opacity 0.12s ease;
	}

	.ftc__submit:hover {
		opacity: 0.92;
	}

	.ftc__submit:active {
		transform: scale(0.98);
	}

	.ftc__divider {
		margin: 2.5rem 0 1.75rem;
		border: 0;
		border-top: 1px solid var(--line, #d9e2ec);
	}

	.ftc__contacts {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 560px) {
		.ftc__contacts {
			grid-template-columns: repeat(3, 1fr);
			gap: 1.5rem;
		}
	}

	.ftc__contact {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		text-align: center;
	}

	.ftc__contact-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
	}

	.ftc__contact-email {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.ftc__contact-email:hover {
		text-decoration: underline;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
