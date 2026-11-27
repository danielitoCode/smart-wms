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
	import { resolveSafeInternalRedirect } from '../../../../../lib/navigation/routeAliases';
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
			const home = resolveHomePath({
				role: result.user.role,
				allowedPages: result.user.allowedPages,
				mustChangePassword: result.user.mustChangePassword
			});
			const requested = resolveSafeInternalRedirect(page.url.searchParams.get('redirect'));
			await goto(result.user.mustChangePassword ? home : requested ?? home, { replaceState: true });
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

		const safeRedirect = resolveSafeInternalRedirect(page.url.searchParams.get('redirect'));

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
			<UiBanner
				tone="success"
				message={i18n.t('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')}
			/>
		{/if}

		{#if state.error}
			<UiBanner tone="error" message={state.error} />
		{/if}

		<form class="form" onsubmit={onSubmit}>
			<div class="flex-column">
				<label for="login-username">{i18n.t('Usuario')}</label>
			</div>
			<div class="inputForm">
				<svg
					class="field-icon"
					height="20"
					width="20"
					viewBox="0 0 16 16"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
				>
					<path
						fill="currentColor"
						d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z"
					/>
				</svg>
				<input
					id="login-username"
					class="input"
					type="text"
					name="username"
					autocomplete="username"
					placeholder={i18n.t('Usuario')}
					bind:value={state.username}
					disabled={state.submitting}
					required
				/>
			</div>

			<div class="flex-column">
				<label for="login-password">{i18n.t('Contraseña')}</label>
			</div>
			<div class="inputForm">
				<svg
					class="field-icon"
					height="20"
					width="20"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
				>
					<path
						fill="currentColor"
						d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V6zm-1 5h8v8H8v-8z"
					/>
				</svg>
				<input
					id="login-password"
					class="input"
					type="password"
					name="password"
					autocomplete="current-password"
					placeholder={i18n.t('Contraseña')}
					bind:value={state.password}
					disabled={state.submitting}
					required
				/>
			</div>

			<button class="button-submit" type="submit" disabled={state.submitting}>
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
		width: min(28rem, 100%);
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

	.mark {
		display: block;
	}

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

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		width: 100%;
		padding: 1.65rem 1.5rem 1.35rem;
		border-radius: 20px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--card) 94%, transparent);
		backdrop-filter: blur(12px);
		box-shadow:
			0 20px 44px -28px color-mix(in srgb, var(--navy) 50%, transparent),
			0 1px 0 color-mix(in srgb, #fff 6%, transparent) inset;
		animation: rise 480ms ease-out 60ms both;
		font-family: var(--body, system-ui);
		overflow: hidden;
		position: relative;
	}

	.flex-column > label {
		display: block;
		margin: 0.15rem 0 0;
		color: var(--ink);
		font: 600 0.82rem var(--body, system-ui);
		letter-spacing: 0.01em;
	}

	.inputForm {
		display: flex;
		align-items: center;
		height: 3.1rem;
		padding-left: 0.75rem;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		background: var(--surface, var(--card));
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background-color 0.2s ease;
	}

	.field-icon {
		flex-shrink: 0;
		color: var(--slate);
		opacity: 0.9;
	}

	.input {
		margin-left: 0.65rem;
		padding-right: 0.85rem;
		border: none;
		border-radius: 12px;
		width: 100%;
		height: 100%;
		background: transparent;
		color: var(--ink);
		font: 500 0.95rem / 1.3 var(--body, system-ui);
		outline: none;
		box-shadow: none;
		min-height: 0;
	}

	.input::placeholder {
		color: var(--muted, var(--slate));
		opacity: 0.85;
	}

	.input:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.inputForm:hover:not(:focus-within) {
		border-color: color-mix(in srgb, var(--line) 40%, var(--slate));
	}

	.inputForm:focus-within {
		border-color: var(--gold);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--gold) 45%, transparent);
		background: var(--card);
	}

	.inputForm:focus-within .field-icon {
		color: var(--gold);
	}

	.button-submit {
		margin: 1rem 0 0.35rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		height: 3.1rem;
		border: none;
		border-radius: 12px;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--navy) 88%, var(--gold) 12%) 0%,
			var(--navy) 100%
		);
		color: #fff;
		font: 600 0.95rem var(--body, system-ui);
		letter-spacing: 0.01em;
		cursor: pointer;
		box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--navy) 70%, transparent);
		transition:
			opacity 0.2s ease,
			transform 0.15s ease,
			box-shadow 0.2s ease;
	}

	.button-submit:hover:not(:disabled) {
		opacity: 0.94;
		box-shadow: 0 12px 26px -12px color-mix(in srgb, var(--navy) 80%, transparent);
	}

	.button-submit:active:not(:disabled) {
		transform: translateY(1px);
	}

	.button-submit:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.button-submit:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	.progress {
		height: 3px;
		border-radius: 99px;
		background: var(--line);
		overflow: hidden;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.progress.active {
		opacity: 1;
	}

	.bar {
		display: block;
		height: 100%;
		width: 42%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--navy), var(--gold));
		animation: slide 1.1s ease-in-out infinite;
	}

	.loader {
		width: 1rem;
		height: 1rem;
		border: 2px solid color-mix(in srgb, #fff 35%, transparent);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.footer {
		text-align: center;
		padding-top: 1rem;
		color: var(--slate);
		font-size: 0.8rem;
		animation: rise 500ms ease-out 100ms both;
	}

	.legal {
		margin: 0 0 0.25rem;
	}

	.contact {
		margin: 0;
	}

	.contact a {
		color: var(--slate);
		text-decoration: none;
	}

	.contact a:hover {
		color: var(--navy);
		text-decoration: underline;
	}

	.sep {
		margin: 0 0.35rem;
		opacity: 0.6;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(250%);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.brand,
		.form,
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
