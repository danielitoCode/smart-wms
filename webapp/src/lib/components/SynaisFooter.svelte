<script lang="ts">
	/**
	 * Synais Footer — near-black finance footer with giant cream wordmark.
	 * CSS stagger + letter rise replace Motion; newsletter validates and cycles states.
	 */
	import './synais-footer.css';

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const WORDMARK = 'synais.';

	type Status = 'idle' | 'sending' | 'done';
	type Link = { label: string; href: string };
	type Props = {
		onSubscribe?: (email: string) => Promise<void> | void;
	};

	let { onSubscribe }: Props = $props();

	const COLUMNS: { title: string; links: Link[] }[] = [
		{
			title: 'Company',
			links: ['Platform', 'About', 'Features', 'Pricing', 'Careers', 'Help'].map((label) => ({
				label,
				href: '#'
			}))
		},
		{
			title: 'Solutions',
			links: [
				'Financial Planning',
				'Budget Management',
				'Cash Flow Forecasting',
				'Financial Reporting',
				'Variance Analysis',
				'Executive Dashboards'
			].map((label) => ({ label, href: '#' }))
		},
		{
			title: 'Resources',
			links: [
				'Blog',
				'AI for Finance Guide',
				'Case Studies',
				'Knowledge Base',
				'API Documentation',
				'Product Updates'
			].map((label) => ({ label, href: '#' }))
		},
		{
			title: 'Contact',
			links: [
				{ label: 'hello@synais.ai', href: 'mailto:hello@synais.ai' },
				{ label: '+62 21 5555 8888', href: 'tel:+622155558888' },
				{ label: 'Surabaya, Indonesia', href: '#' }
			]
		}
	];

	const SOCIALS: { label: string; path: string }[] = [
		{
			label: 'GitHub',
			path: 'M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0 1 12 6.9c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.1 10.1 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z'
		},
		{
			label: 'X',
			path: 'M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.1 14.45Z'
		},
		{
			label: 'LinkedIn',
			path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z'
		},
		{
			label: 'YouTube',
			path: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14c.34-1.91.5-3.85.5-5.8s-.16-3.89-.5-5.8ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z'
		}
	];

	const COL_DELAY = ['sy__d-3', 'sy__d-4', 'sy__d-5', 'sy__d-6'] as const;

	let email = $state('');
	let error = $state('');
	let status = $state<Status>('idle');

	async function subscribe(e: Event) {
		e.preventDefault();
		if (status === 'sending') return;
		if (!EMAIL_RE.test(email.trim())) {
			error = 'Enter a valid email';
			return;
		}
		error = '';
		status = 'sending';
		try {
			if (onSubscribe) {
				await onSubscribe(email.trim());
			} else {
				await new Promise((r) => setTimeout(r, 900));
			}
			status = 'done';
			email = '';
			setTimeout(() => (status = 'idle'), 3200);
		} catch {
			status = 'idle';
			error = 'Something went wrong, try again';
		}
	}

	function preventHash(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<main class="sy-page">
	<footer class="sy" aria-label="Synais">
		<div class="sy__top">
			<div class="sy__brand sy__fade sy__d-1">
				<a href="#top" class="sy__logo" aria-label="Synais home" onclick={preventHash}>
					<svg class="sy__mark" viewBox="0 0 24 24" aria-hidden="true">
						<rect width="24" height="24" rx="6" fill="currentColor" />
						<path
							d="M15.6 8.6c-.7-1-1.9-1.6-3.4-1.6-2 0-3.4 1-3.4 2.5 0 3.2 7.2 1.7 7.2 5 0 1.6-1.6 2.6-3.7 2.6-1.6 0-2.9-.6-3.7-1.8"
							fill="none"
							stroke="#0b0b0b"
							stroke-width="2.1"
							stroke-linecap="round"
						/>
					</svg>
					<span>synais.</span>
				</a>
				<p class="sy__about">
					Empower finance teams with AI-driven insights, automated reporting, and smarter
					decision-making.
				</p>
				<ul class="sy__socials">
					{#each SOCIALS as s}
						<li>
							<a href="#" aria-label={s.label} onclick={preventHash}>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d={s.path} fill="currentColor" />
								</svg>
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<div class="sy__news sy__fade sy__d-2">
				<h2 class="sy__heading" id="sy-news">Stay Ahead in Finance</h2>
				<form
					class="sy__field"
					class:is-invalid={Boolean(error)}
					onsubmit={subscribe}
					novalidate
					aria-labelledby="sy-news"
				>
					<input
						type="email"
						name="email"
						inputmode="email"
						autocomplete="email"
						placeholder="Enter your email"
						aria-label="Email address"
						aria-invalid={Boolean(error)}
						aria-describedby="sy-news-note"
						bind:value={email}
						oninput={() => {
							if (error) error = '';
						}}
					/>
					<button
						type="submit"
						aria-label="Subscribe"
						disabled={status === 'sending'}
						aria-busy={status === 'sending'}
					>
						{#key status}
							<svg
								class="sy__btn-icon"
								class:is-spin={status === 'sending'}
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								{#if status === 'done'}
									<path
										d="m5 12.5 4.5 4.5L19 7.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								{:else if status === 'sending'}
									<path
										d="M12 4a8 8 0 1 0 8 8"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								{:else}
									<path
										d="M5 12h13m-5-5 5 5-5 5"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								{/if}
							</svg>
						{/key}
					</button>
				</form>
				<p
					id="sy-news-note"
					class="sy__note"
					class:is-error={Boolean(error)}
					role="status"
					aria-live="polite"
				>
					{#if error}
						{error}
					{:else if status === 'done'}
						You're in. Look out for the first issue.
					{:else}
						Get the latest finance insights, AI trends, and product updates delivered to your inbox.
					{/if}
				</p>
			</div>
		</div>

		<nav class="sy__cols" aria-label="Footer">
			{#each COLUMNS as col, ci}
				<div class="sy__col">
					<h2 class="sy__heading sy__fade {COL_DELAY[ci]}">{col.title}</h2>
					<ul class="sy__list">
						{#each col.links as l, li}
							<li class="sy__fade" style="animation-delay: {0.36 + ci * 0.07 + li * 0.035}s">
								<a
									class="sy__link"
									href={l.href}
									onclick={l.href === '#' ? preventHash : undefined}
								>
									{l.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="sy__fine sy__fade sy__d-9">
			<p>© 2026 Synais. All rights reserved.</p>
			<ul>
				<li>
					<a href="#" onclick={preventHash}>Terms & Conditions</a>
				</li>
				<li>
					<a href="#" onclick={preventHash}>Privacy Policy</a>
				</li>
			</ul>
		</div>

		<p class="sy__word" aria-hidden="true">
			{#each Array.from(WORDMARK) as ch, i (i)}
				<span>{ch}</span>
			{/each}
		</p>
	</footer>
</main>
