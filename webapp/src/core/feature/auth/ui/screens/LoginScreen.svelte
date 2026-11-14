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

<section class="login">
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

		<div class="panel">
			{#if passwordChanged}
				<UiBanner
						tone="success"
						message={i18n.t('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')}
				/>
			{/if}

			{#if state.error}
				<UiBanner tone="error" message={state.error} />
			{/if}

			<form onsubmit={onSubmit} aria-busy={state.loading}>
				<label>
					<span>{i18n.t('Usuario')}</span>
					<input
							type="text"
							name="username"
							autocomplete="username"
							required
							value={state.username}
							oninput={(e) => state.setUsername(e.currentTarget.value)}
							disabled={state.loading}
							aria-invalid={state.error ? 'true' : undefined}
					/>
				</label>
				<label>
					<span>{i18n.t('Contraseña')}</span>
					<input
							type="password"
							name="password"
							autocomplete="current-password"
							required
							value={state.password}
							oninput={(e) => state.setPassword(e.currentTarget.value)}
							disabled={state.loading}
							aria-invalid={state.error ? 'true' : undefined}
					/>
				</label>
				<button class="primary" type="submit" disabled={state.loading}>
					<span class="label">{state.loading ? i18n.t('Entrando…') : i18n.t('Entrar')}</span>
					{#if state.loading}
						<span class="loader" aria-hidden="true"></span>
					{/if}
				</button>
			</form>

			<div class="progress" class:active={state.loading} aria-hidden="true">
				<span class="bar"></span>
			</div>
		</div>
	</main>

	<footer class="footer">
		<p class="legal">© {YEAR} {COMPANY}</p>
		<p class="contact">
			<a href="tel:{PHONE.replace(/\s/g, '')}">{PHONE}</a>
			<span class="sep" aria-hidden="true">·</span>
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
		background:
				radial-gradient(
						ellipse at 20% 10%,
						color-mix(in srgb, var(--lightblue, #8fb4da) 22%, transparent),
						transparent 55%
				),
				radial-gradient(
						ellipse at 80% 90%,
						color-mix(in srgb, var(--gold, #e9a50b) 12%, transparent),
						transparent 50%
				),
				var(--bg);
		color: var(--ink);
	}

	.toolbar {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.content {
		align-self: center;
		justify-self: center;
		width: min(22rem, 100%);
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	/* ───────── Marca ───────── */
	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		text-align: center;
		animation: rise 420ms ease-out both;
	}

	.mark {
		display: block;
		margin-bottom: 0.75rem;
	}

	.eyebrow {
		margin: 0;
		font: 600 var(--fs-xs, 0.72rem) var(--disp, system-ui);
		letter-spacing: var(--tracking-label, 0.14em);
		text-transform: uppercase;
		color: var(--navy);
	}

	h1 {
		margin: 0;
		font: 700 var(--fs-2xl, 1.65rem) / var(--lh-tight, 1.2) var(--disp, system-ui);
		letter-spacing: var(--tracking-display, -0.02em);
		color: var(--head-ink, var(--navy-deep));
	}

	.lead {
		margin: 0.5rem 0 0;
		color: var(--slate);
		font: 500 var(--fs-md, 0.92rem) var(--body, system-ui);
	}

	/* ───────── Formulario ───────── */
	.panel {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem 1.35rem;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--surface);
		box-shadow: var(--shadow-1);
		overflow: hidden;
		animation: rise 420ms ease-out 80ms both;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.88rem;
		color: var(--ink);
	}

	input {
		min-height: 42px;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-field, 10px);
		background: var(--surface);
		color: var(--ink);
		font: 500 0.92rem var(--body, system-ui);
		transition:
				border-color 140ms ease,
				box-shadow 140ms ease;
	}

	input:focus-visible {
		outline: none;
		border-color: var(--gold);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 24%, transparent);
	}

	input[aria-invalid='true'] {
		border-color: var(--danger);
	}

	button.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		min-height: 44px;
		margin-top: 0.25rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: linear-gradient(
				135deg,
				var(--navy),
				color-mix(in srgb, var(--navy) 78%, var(--lightblue, #8fb4da))
		);
		color: #fff;
		font: 600 0.92rem var(--body, system-ui);
		cursor: pointer;
		transition:
				transform 140ms ease,
				box-shadow 140ms ease;
	}

	button.primary:hover:not(:disabled) {
		box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--navy) 70%, transparent);
	}

	button.primary:active:not(:disabled) {
		transform: scale(0.99);
	}

	button.primary:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	button.primary:disabled {
		opacity: 0.8;
		cursor: wait;
	}

	/* ───────── Carga ───────── */
	.loader {
		width: 14px;
		height: 14px;
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

	.progress.active {
		opacity: 1;
	}

	.bar {
		display: block;
		width: 40%;
		height: 100%;
		background: linear-gradient(90deg, transparent, var(--gold), transparent);
		animation: slide 1.1s ease-in-out infinite;
	}

	/* ───────── Footer ───────── */
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

	.footer p {
		margin: 0;
	}

	.legal {
		color: var(--slate);
		font-weight: 600;
	}

	.footer a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition:
				color 140ms ease,
				border-color 140ms ease;
	}

	.footer a:hover,
	.footer a:focus-visible {
		color: var(--navy);
		border-bottom-color: var(--gold);
		outline: none;
	}

	.sep {
		margin: 0 0.4rem;
		opacity: 0.6;
	}

	@media (max-width: 420px) {
		.sep {
			display: none;
		}

		.contact a {
			display: block;
		}
	}

	/* ───────── Keyframes ───────── */
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.brand,
		.panel,
		.footer,
		.loader,
		.bar {
			animation: none;
		}

		.bar {
			width: 100%;
		}
	}
</style>