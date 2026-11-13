<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import LocaleSwitcher from '../../../../../lib/components/LocaleSwitcher.svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createLoginState } from '../state/loginState.svelte';
	import { createAuthDependencies } from '../../di/auth.dependencies';
	import { resolveHomePath } from '../../domain/policy/AccessPolicy';

	const i18n = getContext<I18nState>('i18n');
	const state = createLoginState();
	const auth = createAuthDependencies();
	const passwordChanged = page.url.searchParams.get('passwordChanged') === '1';

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
		if (!ok) return;

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
	<div class="card">
		<header>
			<img src="/brand/abellis_mark_principal.svg" width="40" height="40" alt="Abellis" />
			<div>
				<p class="eyebrow">Abellis</p>
				<h1>Smart WMS</h1>
			</div>
			<LocaleSwitcher />
		</header>
		<p class="lead">{i18n.t('Inicia sesión para operar el almacén.')}</p>
		{#if passwordChanged}
			<p class="success" role="status">
				{i18n.t('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')}
			</p>
		{/if}
		<form onsubmit={onSubmit}>
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
				/>
			</label>
			{#if state.error}
				<p class="error" role="alert">{state.error}</p>
			{/if}
			<button class="primary" type="submit" disabled={state.loading}>
				{state.loading ? i18n.t('Entrando…') : i18n.t('Entrar')}
			</button>
		</form>
	</div>
</section>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background:
			radial-gradient(ellipse at 15% 0%, rgba(143, 180, 218, 0.2), transparent 55%),
			var(--bg, #f4f7fb);
	}
	.card {
		width: min(24rem, 100%);
		padding: 1.5rem 1.35rem 1.4rem;
		border: 1px solid var(--line, #d5dee8);
		border-radius: 14px;
		background: var(--surface, #fff);
		box-shadow: var(--shadow-1, 0 8px 28px rgba(1, 18, 34, 0.08));
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}
	header img {
		flex: none;
	}
	header div {
		flex: 1;
		min-width: 0;
	}
	.eyebrow {
		margin: 0;
		font: 600 0.65rem var(--disp, system-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--navy, #0b3a5b);
	}
	h1 {
		margin: 0.15rem 0 0;
		font: 700 1.35rem var(--disp, system-ui);
		color: var(--navy-deep, #011222);
	}
	.lead {
		margin: 0 0 1rem;
		color: var(--slate, #5b6b7c);
		font-size: 0.92rem;
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
		color: var(--ink, #0f1c2e);
	}
	input {
		min-height: 42px;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line, #d5dee8);
		border-radius: var(--radius-field, 10px);
		background: var(--surface, #fff);
		color: var(--ink, #0f1c2e);
		font: 500 0.92rem var(--body, system-ui);
	}
	button.primary {
		min-height: 44px;
		margin-top: 0.25rem;
		border: 1px solid var(--navy, #0b3a5b);
		border-radius: 10px;
		background: var(--navy, #0b3a5b);
		color: #fff;
		font: 600 0.92rem var(--body, system-ui);
		cursor: pointer;
	}
	button.primary:disabled {
		opacity: 0.7;
		cursor: wait;
	}
	.error {
		margin: 0;
		color: var(--danger, #b42318);
		font-size: 0.88rem;
	}
	.success {
		margin: 0 0 0.75rem;
		padding: 0.55rem 0.7rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--success, #0f5132) 12%, #fff);
		color: var(--success, #0f5132);
		font-size: 0.86rem;
	}
</style>
