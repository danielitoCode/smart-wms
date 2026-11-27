<script lang="ts">
	import BlurText from '../../../lib/components/BlurText.svelte';
</script>

<svelte:head>
	<title>BlurText · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>
	<main class="lab-main">
		<p class="lab-kicker">Typography · CSS</p>
		<h1 class="lab-title">BlurText</h1>
		<p class="lab-lead">
			Palabras (o letras) salen del blur en secuencia al entrar en vista. Reduced motion muestra el texto de
			golpe.
		</p>

		<section class="demo">
			<BlurText
				as="h2"
				text="Every word drifts out of the blur and settles into sharp focus"
				by="word"
				stagger={0.08}
				duration={0.75}
				blur={14}
				direction="up"
				trigger="inView"
				class="demo-h"
			/>
		</section>

		<section class="demo demo--tight">
			<p class="demo-label">By letter · down</p>
			<BlurText
				text="Smart WMS"
				by="letter"
				stagger={0.05}
				duration={0.6}
				blur={10}
				direction="down"
				trigger="mount"
				class="demo-brand"
			/>
		</section>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 4rem;
		background: #0c0c0e;
		color: #f4f4f5;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab-head {
		max-width: 40rem;
		margin: 0 auto 1.5rem;
	}
	.back {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	.lab-main {
		max-width: 40rem;
		margin: 0 auto;
	}
	.lab-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.5;
	}
	.lab-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.lab-lead {
		margin: 0 0 2.5rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.65;
	}
	.demo {
		padding: 3rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
	.demo--tight {
		padding-top: 2rem;
	}
	.demo-label {
		margin: 0 0 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.45;
	}
	:global(.demo-h) {
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.25;
		margin: 0;
	}
	:global(.demo-brand) {
		font-size: clamp(2rem, 6vw, 3rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		margin: 0;
	}
</style>
