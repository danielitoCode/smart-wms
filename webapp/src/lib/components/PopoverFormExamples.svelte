<script lang="ts">
	/**
	 * Ejemplos PopoverForm adaptados a Smart WMS / Abellis.
	 */
	import PopoverForm from './PopoverForm.svelte';
	import PopoverFormButton from './PopoverFormButton.svelte';
	import PopoverFormSuccess from './PopoverFormSuccess.svelte';
	import PopoverFormSeparator from './PopoverFormSeparator.svelte';
	import PopoverFormCutOutLeftIcon from './PopoverFormCutOutLeftIcon.svelte';
	import PopoverFormCutOutRightIcon from './PopoverFormCutOutRightIcon.svelte';

	type FormState = 'idle' | 'loading' | 'success';
	type Theme = 'light' | 'dark' | 'system';

	let fbOpen = $state(false);
	let fbState = $state<FormState>('idle');
	let feedback = $state('');

	function submitFeedback() {
		if (!feedback.trim()) return;
		fbState = 'loading';
		setTimeout(() => { fbState = 'success'; }, 1200);
		setTimeout(() => { fbOpen = false; fbState = 'idle'; feedback = ''; }, 3000);
	}

	let ctOpen = $state(false);
	let ctState = $state<FormState>('idle');
	let name = $state('');
	let email = $state('');
	let message = $state('');

	function submitContact() {
		if (!name.trim() || !email.trim() || !message.trim()) return;
		ctState = 'loading';
		setTimeout(() => { ctState = 'success'; }, 1200);
		setTimeout(() => { ctOpen = false; ctState = 'idle'; name = ''; email = ''; message = ''; }, 3000);
	}

	let nlOpen = $state(false);
	let nlState = $state<FormState>('idle');
	let nlEmail = $state('');

	function submitNewsletter() {
		if (!nlEmail.trim()) return;
		nlState = 'loading';
		setTimeout(() => { nlState = 'success'; }, 1200);
		setTimeout(() => { nlOpen = false; nlState = 'idle'; nlEmail = ''; }, 3000);
	}

	let thOpen = $state(false);
	let theme = $state<Theme>('system');
	let systemTheme = $state<'light' | 'dark'>('light');
	const themes: Theme[] = ['light', 'dark', 'system'];

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const update = () => { systemTheme = mq.matches ? 'dark' : 'light'; };
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(theme === 'system' ? systemTheme : theme);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		function onKey(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && fbOpen && fbState === 'idle') submitFeedback();
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div class="pfe">
	<section class="pfe-card">
		<p class="pfe-label">Feedback operativo</p>
		<PopoverForm bind:open={fbOpen} title="Feedback" triggerLabel="Enviar feedback" width="364px" height="192px" showCloseButton={fbState !== 'success'} showSuccess={fbState === 'success'}>
			{#snippet openChild()}
				<form class="pfe-fb" onsubmit={(e) => { e.preventDefault(); submitFeedback(); }}>
					<textarea class="pfe-ta" placeholder="Cuéntanos qué mejorar en el flujo de almacén…" bind:value={feedback} required></textarea>
					<div class="pfe-foot">
						<PopoverFormSeparator />
						<div class="pfe-cut pfe-cut--l"><PopoverFormCutOutLeftIcon /></div>
						<div class="pfe-cut pfe-cut--r"><PopoverFormCutOutRightIcon /></div>
						<div class="pfe-foot__btn"><PopoverFormButton loading={fbState === 'loading'} text="Enviar" /></div>
					</div>
				</form>
			{/snippet}
			{#snippet successChild()}
				<PopoverFormSuccess title="Feedback recibido" description="Gracias por ayudar a mejorar Smart WMS." />
			{/snippet}
		</PopoverForm>
	</section>

	<section class="pfe-card">
		<p class="pfe-label">Contacto</p>
		<PopoverForm bind:open={ctOpen} title="Contacto" triggerLabel="Contactar" width="364px" showCloseButton={ctState !== 'success'} showSuccess={ctState === 'success'}>
			{#snippet openChild()}
				<form class="pfe-ct" onsubmit={(e) => { e.preventDefault(); submitContact(); }}>
					<div class="pfe-field"><label for="pf-name">Nombre</label><input id="pf-name" type="text" bind:value={name} required /></div>
					<div class="pfe-field"><label for="pf-email">Email</label><input id="pf-email" type="email" bind:value={email} required /></div>
					<div class="pfe-field"><label for="pf-msg">Mensaje</label><textarea id="pf-msg" rows="3" bind:value={message} required></textarea></div>
					<div class="pfe-foot">
						<PopoverFormSeparator />
						<div class="pfe-cut pfe-cut--l"><PopoverFormCutOutLeftIcon /></div>
						<div class="pfe-cut pfe-cut--r"><PopoverFormCutOutRightIcon /></div>
						<div class="pfe-foot__btn"><PopoverFormButton loading={ctState === 'loading'} text="Enviar" /></div>
					</div>
				</form>
			{/snippet}
			{#snippet successChild()}
				<PopoverFormSuccess title="Mensaje enviado" description="Te responderemos en breve." />
			{/snippet}
		</PopoverForm>
	</section>

	<section class="pfe-card">
		<p class="pfe-label">Avisos / newsletter</p>
		<PopoverForm bind:open={nlOpen} title="Suscripción" triggerLabel="Recibir avisos" width="320px" showCloseButton={nlState !== 'success'} showSuccess={nlState === 'success'}>
			{#snippet openChild()}
				<form class="pfe-nl" onsubmit={(e) => { e.preventDefault(); submitNewsletter(); }}>
					<div class="pfe-field">
						<label for="nl-email">Email</label>
						<input id="nl-email" type="email" placeholder="tu@empresa.com" bind:value={nlEmail} required />
						<p class="pfe-hint">Novedades de producto y operativas, sin spam.</p>
					</div>
					<PopoverFormButton loading={nlState === 'loading'} text="Suscribirse" />
				</form>
			{/snippet}
			{#snippet successChild()}
				<PopoverFormSuccess title="Suscripción activa" description="Gracias por unirte a los avisos de Smart WMS." />
			{/snippet}
		</PopoverForm>
	</section>

	<section class="pfe-card">
		<p class="pfe-label">Tema</p>
		<PopoverForm bind:open={thOpen} title="Elegir tema" triggerLabel="Tema" width="200px" showSuccess={false} showCloseButton={true}>
			{#snippet openChild()}
				<div class="pfe-theme">
					<p class="pfe-theme__hint">Apariencia</p>
					<div class="pfe-theme__list" role="listbox" aria-label="Tema">
						{#each themes as t}
							{@const selected = theme === t}
							{@const effective = t === 'system' ? systemTheme : t}
							<button type="button" role="option" aria-selected={selected} class="pfe-theme__opt" data-on={selected || undefined} data-eff={effective} onclick={() => { theme = t; }}>
								<span>{t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}</span>
							</button>
						{/each}
					</div>
				</div>
			{/snippet}
		</PopoverForm>
	</section>
</div>

<style>
	.pfe { display: grid; gap: 1.75rem; padding: 1rem; font-family: var(--body, Inter, system-ui, sans-serif); }
	.pfe-card { display: flex; flex-direction: column; align-items: flex-start; gap: 0.55rem; }
	.pfe-label { margin: 0; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate, #5c6b7d); }
	.pfe-field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
	.pfe-field label { font-size: 0.78rem; font-weight: 600; color: var(--slate, #5c6b7d); }
	.pfe-field input, .pfe-field textarea, .pfe-ta {
		width: 100%; box-sizing: border-box; border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		border-radius: 10px; padding: 0.55rem 0.75rem; font: inherit; font-size: 0.875rem;
		color: var(--ink, #132234); background: var(--card, #fff); outline: none;
	}
	.pfe-field input:focus, .pfe-field textarea:focus, .pfe-ta:focus {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 45%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy, #004c8b) 12%, transparent);
	}
	.pfe-ta { height: 7.5rem; resize: none; border-radius: 12px 12px 0 0; border-bottom: none; }
	.pfe-hint { margin: 0.15rem 0 0; font-size: 0.7rem; color: var(--slate, #5c6b7d); }
	.pfe-fb, .pfe-ct, .pfe-nl { margin: 0; }
	.pfe-nl, .pfe-ct { padding: 0.85rem 1rem 1rem; }
	.pfe-foot { position: relative; display: flex; align-items: center; min-height: 3rem; padding: 0 0.65rem; }
	.pfe-foot__btn { flex: 1; padding: 0.35rem 0; }
	.pfe-cut { position: absolute; top: 0; transform: translateY(-50%); z-index: 1; line-height: 0; }
	.pfe-cut--l { left: 0; transform: translate(-1.5px, -50%); }
	.pfe-cut--r { right: 0; transform: translate(1.5px, -50%) rotate(180deg); }
	.pfe-theme { padding: 0.55rem 0.65rem 0.75rem; }
	.pfe-theme__hint { margin: 0 0 0.45rem; font-size: 0.72rem; font-weight: 600; color: var(--slate, #5c6b7d); }
	.pfe-theme__list { display: flex; flex-direction: column; gap: 0.3rem; }
	.pfe-theme__opt {
		display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.5rem 0.65rem;
		border: 1px solid transparent; border-radius: 10px; background: transparent;
		color: var(--ink, #132234); font: inherit; font-size: 0.8125rem; font-weight: 600;
		cursor: pointer; text-align: left;
	}
	.pfe-theme__opt:hover { background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent); }
	.pfe-theme__opt[data-on] { background: var(--navy, #004c8b); color: #fff; }
	.pfe-theme__opt[data-on][data-eff='dark'] { background: #1a2332; color: #f1f5f9; }
</style>
