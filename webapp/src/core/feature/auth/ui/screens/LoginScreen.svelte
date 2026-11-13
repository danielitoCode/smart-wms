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

<section class="login motion-page-in">
	<div class="card">
		<header>
			<img src="/brand/abellis_mark_principal.svg" width="40" height="40" alt="Abellis" />
			<div>
				<p class="eyebrow">Abellis</p>
				<h1>Smart WMS</h1>
			</div>
			<div class="toolbar"><ThemeToggle /><LocaleSwitcher /></div>
		</header>
		<p class="lead">{i18n.t('Inicia sesión para operar el almacén.')}</p>

		{#if passwordChanged}
			<UiBanner
				tone="success"
				message={i18n.t('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')}
			/>
		{/if}

		{#if state.error}
			<UiBanner tone="error" message={state.error} />
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
			radial-gradient(ellipse at 15% 0%, color-mix(in srgb, var(--lightblue, #8fb4da) 28%, transparent), transparent 55%),
			var(--bg);
	}
	.card {
		width: min(24rem, 100%);
		padding: 1.5rem 1.35rem 1.4rem;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--surface);
		box-shadow: var(--shadow-1);
		color: var(--ink);
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
	header div:not(.toolbar) {
		flex: 1;
		min-width: 0;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}
	.eyebrow {
		margin: 0;
		font: 600 0.65rem var(--disp, system-ui);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--navy);
	}
	h1 {
		margin: 0.15rem 0 0;
		font: 700 1.35rem var(--disp, system-ui);
		color: var(--head-ink, var(--navy-deep));
	}
	.lead {
		margin: 0 0 1rem;
		color: var(--slate);
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
	}
	button.primary {
		min-height: 44px;
		margin-top: 0.25rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: var(--navy);
		color: #fff;
		font: 600 0.92rem var(--body, system-ui);
		cursor: pointer;
	}
	button.primary:disabled {
		opacity: 0.7;
		cursor: wait;
	}
</style>
