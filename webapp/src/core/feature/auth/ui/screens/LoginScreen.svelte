<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import LocaleSwitcher from '../../../../../lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '../../../../../lib/components/ThemeToggle.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createLoginState } from '../state/loginState.svelte';
	import { createAuthDependencies } from '../../di/auth.dependencies';
	import { resolveHomePath } from '../../domain/policy/AccessPolicy';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	import Starfield from '../../../../../lib/components/Starfield.svelte';

	const i18n = getContext<I18nState>('i18n');
	const state = createLoginState();
	const auth = createAuthDependencies();
	const passwordChanged = page.url.searchParams.get('passwordChanged') === '1';

	const COMPANY = 'Tecno Táctil';
	const PHONE = '+599932242';
	const EMAIL = 'testemail@domain.com';
	const YEAR = new Date().getFullYear();

	onMount(() => {
		void redirectIfAlreadyAuthenticated();
	});

	async function redirectIfAlreadyAuthenticated() {
		const result = await auth.ensureAuthenticated.execute();
		if (result.ok) {
			const path = resolveHomePath({
				role: result.user.role,
				allowedPages: result.user.allowedPages,
				mustChangePassword: result.user.mustChangePassword
			});
			await goto(path, { replaceState: true });
		}
	}

	async function onSubmit(event: Event) {
		event.preventDefault();
		const ok = await state.submit();
		if (!ok) {
			if (state.error) pushToast(state.error, 'error');
			return;
		}

		pushToast(i18n.t('Sesión iniciada'), 'success');

		if (state.user?.mustChangePassword) {
			await goto('/change-password', { replaceState: true });
			return;
		}

		const redirect = page.url.searchParams.get('redirect');
		const safeRedirect =
				redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;

		const home = resolveHomePath({
			role: state.user?.role ?? 'USER',
			allowedPages: state.user?.allowedPages ?? [],
			mustChangePassword: false
		});

		await goto(safeRedirect ?? home, { replaceState: true });
	}
</script>

<section class="login starfield-host">
	<Starfield />
	<div class="toolbar">
		<ThemeToggle />
		<LocaleSwitcher />
	</div>

	<main class="content">
		<header class="brand">
			<img
					class="mark"
					src="/brand/abellis_mark_principal.svg"
					width="56"
					height="56"
					alt="Abellis"
			/>
			<p class="eyebrow">ABELLIS</p>
			<h1>Smart WMS</h1>
			<p class="lead">{i18n.t('Inicia sesión para operar el almacén.')}</p>
		</header>

		{#if passwordChanged}
			<UiBanner variant="success" message={i18n.t('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')} />
		{/if}

		{#if state.error}
			<UiBanner variant="error" message={state.error} />
		{/if}

		<form class="panel" onsubmit={onSubmit}>
			<label>
				<span>{i18n.t('Usuario')}</span>
				<input
						type="text"
						name="username"
						autocomplete="username"
						bind:value={state.username}
						disabled={state.submitting}
						required
				/>
			</label>
			<label>
				<span>{i18n.t('Contraseña')}</span>
				<input
						type="password"
						name="password"
						autocomplete="current-password"
						bind:value={state.password}
						disabled={state.submitting}
						required
				/>
			</label>
			<button class="primary" type="submit" disabled={state.submitting}>
				{#if state.submitting}
					<span class="loader" aria-hidden="true"></span>
					{i18n.t('Entrando…')}
				{:else}
					{i18n.t('Entrar')}
				{/if}
			</button>
			<div class="progress" class:active={state.submitting} aria-hidden="true">
				<span class="bar"></span>
			</div>
		</form>
	</main>

	<footer class="footer">
		<p class="legal">© {YEAR} {COMPANY}</p>
		<p class="contact">
			<a href="tel:{PHONE}">{PHONE}</a><span class="sep">·</span>
			<a href="mailto:{EMAIL}">{EMAIL}</a>
		</p>
	</footer>
</section>

<style>
	.login {
		position: relative;
		min-height: 100vh;
		display: grid;
		grid-template-rows: 1fr auto;
		padding: 1.5rem;
		background: transparent;
		color: var(--ink);
	}

	.toolbar {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		z-index: 2;
	}

	.content {
		width: min(24rem, 100%);
		margin: auto;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		text-align: center;
		animation: rise 420ms ease-out both;
	}

	.mark { display: block; }
	.eyebrow {
		margin: 0;
		font: 600 var(--fs-xs, 0.72rem) var(--disp, system-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--navy);
	}
	h1 {
		margin: 0;
		font: 700 var(--fs-2xl, 1.65rem) / 1.2 var(--disp, system-ui);
		color: var(--head-ink, var(--navy-deep));
	}
	.lead {
		margin: 0;
		color: var(--slate);
		font: 500 var(--fs-md, 0.92rem) / 1.45 var(--body, system-ui);
	}

	.panel {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.25rem;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		backdrop-filter: blur(10px);
		box-shadow: 0 18px 40px -28px color-mix(in srgb, var(--navy) 45%, transparent);
		animation: rise 480ms ease-out 60ms both;
	overflow: hidden;
	}

	label {
		display: grid;
		gap: 0.35rem;
		font: 600 0.8rem var(--body);
		color: var(--slate);
	}

	input {
		min-height: 44px;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--card, var(--surface));
		color: var(--ink);
		font: 500 0.95rem var(--body);
	}

	input:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 1px;
	}

	button.primary {
		min-height: 46px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: var(--navy);
		color: #fff;
		font: 600 0.92rem var(--body, system-ui);
		cursor: pointer;
		transition: transform 140ms ease, box-shadow 140ms ease;
	}

	button.primary:hover:not(:disabled) {
		box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--navy) 70%, transparent);
	}

	button.primary:active:not(:disabled) { transform: scale(0.99); }
	button.primary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
	button.primary:disabled { opacity: 0.8; cursor: wait; }

	.loader {
		width: 14px; height: 14px;
		border: 2px solid color-mix(in srgb, #fff 35%, transparent);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	.progress {
		position: absolute;
		inset: auto 0 0 0;
		height: 3px;
		opacity: 0;
		overflow: hidden;
		transition: opacity 140ms ease;
	}
	.progress.active { opacity: 1; }
	.bar {
		display: block; width: 40%; height: 100%;
		background: linear-gradient(90deg, transparent, var(--gold), transparent);
		animation: slide 1.1s ease-in-out infinite;
	}

	.footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding-top: 1.5rem;
		text-align: center;
		font: 500 var(--fs-xs, 0.76rem) / 1.5 var(--body, system-ui);
		color: var(--muted, var(--slate));
		animation: fade-in 500ms ease-out 200ms both;
	}
	.footer p { margin: 0; }
	.legal { color: var(--slate); font-weight: 600; }
	.footer a {
		color: inherit; text-decoration: none;
		border-bottom: 1px solid transparent;
	}
	.footer a:hover, .footer a:focus-visible {
		color: var(--navy); border-bottom-color: var(--gold); outline: none;
	}
	.sep { margin: 0 0.4rem; opacity: 0.6; }

	@media (max-width: 420px) {
		.sep { display: none; }
		.contact a { display: block; }
	}

	@keyframes rise {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: none; }
	}
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes slide {
		from { transform: translateX(-100%); }
		to { transform: translateX(250%); }
	}

	@media (prefers-reduced-motion: reduce) {
		.brand, .panel, .footer, .loader, .bar { animation: none; }
		.bar { width: 100%; }
	}
</style>
