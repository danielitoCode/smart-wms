<script lang="ts">
	/**
	 * Demo Terminal — secuencia WMS (typing + spans).
	 */
	import Terminal from './Terminal.svelte';
	import TypingAnimation from './TypingAnimation.svelte';
	import AnimatedSpan from './AnimatedSpan.svelte';
</script>

<Terminal class="td-term">
	<TypingAnimation text="> smartwms auth login --user ana" duration={42} />
	<AnimatedSpan>
		<span class="td-ok">✓</span> Sesión iniciada · Nave Madrid
	</AnimatedSpan>
	<TypingAnimation text="> smartwms receiving lookup --asn ASN-1042" duration={38} />
	<AnimatedSpan>
		<span class="td-muted">ASN-1042</span> · 48 líneas · estado <span class="td-info">OPEN</span>
	</AnimatedSpan>
	<TypingAnimation text="> smartwms picking wave create --wh 2" duration={40} />
	<AnimatedSpan>
		<span class="td-ok">✓</span> Ola <span class="td-info">W-8841</span> creada · 126 picks
	</AnimatedSpan>
	<TypingAnimation text="> smartwms inventory adjust --sku SKU-88 --qty -2" duration={36} />
	<AnimatedSpan>
		<span class="td-warn">!</span> Requiere aprobación de conteo
	</AnimatedSpan>
	<TypingAnimation text="> smartwms ship complete --load L-220" duration={40} />
	<AnimatedSpan>
		<span class="td-ok">✓</span> Carga cerrada · 12 bultos en muelle B
	</AnimatedSpan>
</Terminal>

<style>
	:global(.td-term) {
		margin: 0 auto;
	}

	.td-ok {
		color: #16a34a;
		font-weight: 700;
	}
	.td-warn {
		color: #d97706;
		font-weight: 700;
	}
	.td-info {
		color: var(--navy, #004c8b);
		font-weight: 650;
	}
	.td-muted {
		color: var(--slate, #5c6b7d);
	}

	:global(.dark) .td-info,
	:global(html.dark) .td-info {
		color: #7dd3fc;
	}
</style>
