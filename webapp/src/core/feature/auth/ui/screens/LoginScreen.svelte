<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createLoginState } from '../state/loginState.svelte';

	const state = createLoginState();
	const passwordChanged = page.url.searchParams.get('passwordChanged') === '1';

	async function onSubmit(event: Event) {
		event.preventDefault();
		const ok = await state.submit();
		if (ok) {
			const redirect = page.url.searchParams.get('redirect');
			const target =
				redirect && redirect.startsWith('/') && !redirect.startsWith('//')
					? redirect
					: '/inventory';
			await goto(target);
		}
	}
</script>

<section class="login">
	<div class="card">
		<header>
			<img src="/brand/abellis_mark_principal.svg" width="40" height="40" alt="Abellis" />
			<div><p class="eyebrow">Abellis</p><h1>Smart WMS</h1></div>
		</header>
		<p class="lead">Inicia sesión para operar el almacén.</p>
		{#if passwordChanged}<p class="success" role="status">Contraseña actualizada. Inicia sesión con tu nueva contraseña.</p>{/if}
		<form onsubmit={onSubmit}>
			<label><span>Usuario</span><input type="text" name="username" autocomplete="username" required
				value={state.username} oninput={(e) => state.setUsername(e.currentTarget.value)} disabled={state.loading} /></label>
			<label><span>Contraseña</span><input type="password" name="password" autocomplete="current-password" required
				value={state.password} oninput={(e) => state.setPassword(e.currentTarget.value)} disabled={state.loading} /></label>
			{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
			<button type="submit" class="primary" disabled={state.loading}>{state.loading ? 'Entrando…' : 'Entrar'}</button>
		</form>
	</div>
</section>

<style>
	.login { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem 1rem; background: var(--bg); animation: fade-in 180ms ease-out; }
	.card { width: 100%; max-width: 22rem; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 1.5rem 1.35rem 1.4rem; box-shadow: var(--shadow-1); }
	header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem; }
	.eyebrow { margin: 0; font-family: var(--disp); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); }
	h1 { margin: 0.1rem 0 0; font-size: 1.35rem; }
	.lead { margin: 0 0 1.15rem; color: var(--slate); font-size: 0.9rem; }
	form { display: flex; flex-direction: column; gap: 0.9rem; }
	label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: var(--slate); font-weight: 500; }
	input { padding: 0.55rem 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-field); font-size: 0.95rem; color: var(--ink); background: #fff; }
	input:focus { outline: none; border-color: var(--navy); box-shadow: var(--focus); }
	.error { margin: 0; color: var(--danger); font-size: 0.88rem; }
	.success { margin: 0 0 1rem; padding: 0.65rem 0.75rem; border-radius: 8px; background: var(--success-bg, #e6f3ea); color: var(--success, #0f5132); font-size: 0.86rem; }
	.primary { margin-top: 0.15rem; padding: 0.6rem 1rem; border: none; border-radius: var(--radius-btn); background: var(--navy); color: #fff; font-weight: 600; cursor: pointer; }
	.primary:hover:not(:disabled) { background: var(--navy-2); }
	.primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
