<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { goto } from '$app/navigation';
	import { createChangePasswordState } from '../state/changePasswordState.svelte';
	import { authSession } from '../../../../infrastructure/auth/AuthSession';

	const state = createChangePasswordState();
	const forced = authSession.getUser()?.mustChangePassword ?? false;

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (await state.submit()) await goto('/login?passwordChanged=1', { replaceState: true });
	}
</script>

<section class="page">
	<div class="card">
		{#if forced}<p class="forced-banner" role="alert"><strong>{i18n.t('Configuración inicial:')}</strong> debes establecer una contraseña nueva antes de continuar.</p>{/if}
		<p class="eyebrow">{i18n.t('Seguridad de la cuenta')}</p>
		<h1>{i18n.t('Cambiar contraseña')}</h1>
		<p class="intro">{i18n.t('Actualiza tu contraseña para continuar usando Smart WMS.')}</p>
		<form onsubmit={onSubmit}>
			<label>
				<span>{i18n.t('Contraseña actual')}</span>
				<input type="password" autocomplete="current-password" required value={state.currentPassword}
					oninput={(event) => state.setCurrentPassword(event.currentTarget.value)} disabled={state.submitting} />
			</label>
			<label>
				<span>{i18n.t('Nueva contraseña')}</span>
				<input type="password" autocomplete="new-password" required value={state.newPassword}
					oninput={(event) => state.setNewPassword(event.currentTarget.value)} disabled={state.submitting} />
			</label>
			<p class="hint">{i18n.t('Mínimo 8 caracteres, al menos una letra y un número. No puede ser «admin».')}</p>
			<label>
				<span>{i18n.t('Confirmar nueva contraseña')}</span>
				<input type="password" autocomplete="new-password" required value={state.confirmPassword}
					oninput={(event) => state.setConfirmPassword(event.currentTarget.value)} disabled={state.submitting} />
			</label>
			{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
			<button type="submit" class="accent" disabled={state.submitting}>
				{state.submitting ? i18n.t('Guardando…') : i18n.t('Actualizar contraseña')}
			</button>
		</form>
	</div>
</section>

<style>
	.page { min-height: 70vh; display: grid; place-items: center; padding: 2rem 1rem; }
	.card { width: 100%; max-width: 30rem; padding: 1.5rem; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--card); box-shadow: var(--shadow-1); }
	.forced-banner { margin:0 0 1rem; padding:.75rem .85rem; border-radius:8px; background:#8e2716; color:#fff; font-size:.86rem; line-height:1.45; } .eyebrow { margin: 0 0 0.35rem; color: var(--navy); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
	h1 { margin: 0; color: var(--ink); font-size: 1.45rem; }
	.intro { margin: 0.55rem 0 1.2rem; color: var(--slate); font-size: 0.9rem; }
	form { display: flex; flex-direction: column; gap: 0.85rem; }
	label { display: flex; flex-direction: column; gap: 0.3rem; color: var(--slate); font-size: 0.85rem; font-weight: 600; }
	input { width: 100%; box-sizing: border-box; padding: 0.6rem 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-field); color: var(--ink); background: #fff; font: inherit; }
	input:focus { outline: none; border-color: var(--navy); box-shadow: var(--focus); }
	.hint { margin: -0.55rem 0 0; color: var(--slate); font-size: 0.78rem; }
	.error { margin: 0; color: var(--danger); font-size: 0.88rem; }
	.primary { margin-top: 0.25rem; padding: 0.65rem 1rem; border: 0; border-radius: var(--radius-btn); background: var(--navy); color: #fff; font-weight: 600; cursor: pointer; }
	.primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
