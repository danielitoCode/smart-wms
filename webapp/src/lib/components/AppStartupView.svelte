<script lang="ts">
	let {
		status = 'initializing',
		onRetry
	}: {
		status?: 'initializing' | 'error';
		onRetry?: () => void;
	} = $props();
</script>

<main class="startup" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'initializing'}>
	<section class="panel">
		<div class="mark" aria-hidden="true">
			<span></span>
			<span></span>
			<span></span>
		</div>
		<p class="eyebrow">ABELLIS · Smart WMS</p>
		<h1>{status === 'error' ? 'No se pudo iniciar la aplicación' : 'Preparando Smart WMS'}</h1>
		<p class="message">
			{status === 'error'
				? 'La inicialización no pudo completarse. Puedes intentarlo nuevamente.'
				: 'Preparando el entorno de trabajo…'}
		</p>
		{#if status === 'initializing'}
			<div class="progress" aria-hidden="true"><span></span></div>
		{:else if onRetry}
			<button type="button" onclick={onRetry}>Reintentar</button>
		{/if}
	</section>
</main>

<style>
	.startup {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background:
			radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--lightblue, #8fb4da) 18%, transparent), transparent 55%),
			radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--gold) 10%, transparent), transparent 50%),
			var(--bg);
		color: var(--ink);
	}
	.panel {
		width: min(25rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		text-align: center;
	}
	.mark {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		height: 2rem;
	}
	.mark span {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: var(--gold);
		animation: pulse 900ms ease-in-out infinite alternate;
	}
	.mark span:nth-child(2) { animation-delay: 150ms; }
	.mark span:nth-child(3) { animation-delay: 300ms; }
	.eyebrow {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--navy);
	}
	h1 {
		margin: 0;
		font-size: clamp(1.2rem, 4vw, 1.55rem);
		line-height: 1.25;
		color: var(--head-ink, var(--navy-deep));
	}
	.message {
		margin: 0;
		max-width: 30rem;
		color: var(--slate);
		line-height: 1.5;
	}
	.progress {
		width: min(13rem, 70%);
		height: 3px;
		overflow: hidden;
		border-radius: 99px;
		background: var(--line);
	}
	.progress span {
		display: block;
		width: 40%;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--navy), var(--gold));
		animation: slide 1.15s ease-in-out infinite;
	}
	button {
		min-height: 42px;
		margin-top: 0.25rem;
		padding: 0.55rem 1.2rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: var(--navy);
		color: #fff;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	button:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
	@keyframes pulse { to { opacity: 0.35; transform: scale(0.8); } }
	@keyframes slide { from { transform: translateX(-120%); } to { transform: translateX(320%); } }
	@media (prefers-reduced-motion: reduce) {
		.mark span, .progress span { animation: none; }
	}
</style>
