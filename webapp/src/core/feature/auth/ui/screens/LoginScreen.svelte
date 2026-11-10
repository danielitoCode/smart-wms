<script lang="ts">
	import { goto } from '$app/navigation';
	import { createLoginState } from '../state/loginState.svelte';

	const state = createLoginState();

	async function onSubmit(event: Event) {
		event.preventDefault();
		const ok = await state.submit();
		if (ok) {
			await goto('/inventory');
		}
	}
</script>

<section class="login">
	<header>
		<h1>Smart WMS</h1>
		<p class="subtitle">Iniciar sesión</p>
	</header>

	<form onsubmit={onSubmit}>
		<label>
			<span>Usuario</span>
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
			<span>Contraseña</span>
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

		<button type="submit" disabled={state.loading}>
			{state.loading ? 'Entrando…' : 'Entrar'}
		</button>
	</form>
</section>

<style>
	.login {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 22rem;
		margin: 4rem auto;
		padding: 0 1.25rem;
	}
	header {
		margin-bottom: 1.5rem;
		text-align: center;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	.subtitle {
		margin: 0;
		color: #64748b;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		color: #334155;
	}
	input {
		padding: 0.55rem 0.7rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 1rem;
	}
	input:focus {
		outline: 2px solid #38bdf8;
		outline-offset: 1px;
	}
	.error {
		margin: 0;
		color: #b91c1c;
		font-size: 0.9rem;
	}
	button {
		padding: 0.6rem 1rem;
		border: none;
		border-radius: 6px;
		background: #0f172a;
		color: #fff;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
