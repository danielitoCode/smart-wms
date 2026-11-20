<script lang="ts">
	/**
	 * About3 — bloque “About” (shadcnblocks about3 → Svelte 5).
	 * Grid imagen + breakout, marquee de logos, logros y secciones de contenido.
	 * Tokens Abellis / Smart WMS.
	 */
	import Marquee from './Marquee.svelte';

	export type AboutImage = { src: string; alt: string };
	export type AboutBreakout = {
		src?: string;
		alt?: string;
		title: string;
		description: string;
		buttonText?: string;
		buttonUrl?: string;
	};
	export type AboutCompany = { src: string; alt: string };
	export type AboutAchievement = { label: string; value: string };
	export type AboutContentSection = { title: string; content: string };

	interface Props {
		class?: string;
		title?: string;
		description?: string;
		mainImage?: AboutImage;
		secondaryImage?: AboutImage;
		breakout?: AboutBreakout;
		companiesTitle?: string;
		companies?: AboutCompany[] | null;
		achievementsTitle?: string;
		achievementsDescription?: string;
		achievements?: AboutAchievement[];
		contentSections?: AboutContentSection[];
	}

	const defaultCompanies: AboutCompany[] = [
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-1.svg', alt: 'Arc' },
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-2.svg', alt: 'Descript' },
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-3.svg', alt: 'Mercury' },
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-4.svg', alt: 'Ramp' },
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-5.svg', alt: 'Retool' },
		{ src: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/company/fictional-company-logo-6.svg', alt: 'Watershed' }
	];

	const defaultAchievements: AboutAchievement[] = [
		{ label: 'Almacenes activos', value: '3+' },
		{ label: 'Flujos operativos', value: '12' },
		{ label: 'Precisión inventario', value: '99%' },
		{ label: 'Módulos núcleo', value: '24' }
	];

	let {
		class: className = '',
		title = 'Sobre Smart WMS',
		description = 'Plataforma WMS moderna para operaciones multi-almacén: recepción, putaway, picking, packing y expedición en un solo flujo, con arquitectura limpia y continuidad funcional respecto a la experiencia operativa acumulada.',
		mainImage = {
			src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=900&fit=crop',
			alt: 'Nave de almacén'
		},
		secondaryImage = {
			src: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=1000&fit=crop',
			alt: 'Operario con escáner'
		},
		breakout = {
			src: '/brand/abellis_mark_principal.svg',
			alt: 'Abellis',
			title: 'Núcleo operativo multi-almacén',
			description: 'Herramientas reales de piso: olas de picking, conteos cíclicos y contexto de almacén en cada petición.',
			buttonText: 'Ver el producto',
			buttonUrl: '/login'
		},
		companiesTitle = 'Confianza operativa',
		companies = defaultCompanies,
		achievementsTitle = 'Resultados que importan en el piso',
		achievementsDescription = 'Métricas orientadas a consistencia de inventario, velocidad de ola y control multi-nave.',
		achievements = defaultAchievements,
		contentSections = [
			{
				title: 'Nuestra visión',
				content: 'Durante años, el software de almacén ha sido o demasiado rígido o demasiado genérico. Smart WMS arranca de procesos reales — recepción, ubicación, olas, empaque y despacho — y los organiza en una arquitectura que el equipo puede comprender y evolucionar.\n\nNo buscamos una traducción visual de pantallas heredadas: buscamos continuidad funcional con una implementación frontend moderna (SvelteKit, Clean Architecture, Feature-First).\n\nEl objetivo es que cada módulo se pueda desarrollar, probar y mantener sin arrastrar dependencias innecesarias del pasado.'
			},
			{
				title: 'Cómo construimos',
				content: 'Aprovechamos el conocimiento operativo acumulado en sistemas WMS de referencia y lo reimplementamos con contratos claros, capas separadas y pruebas paralelas al código.\n\nEl backend existente permanece como fuente de verdad durante la migración frontend: respetamos endpoints y reglas de negocio, documentamos gaps y evitamos tocar el servidor sin acuerdo.\n\nEl resultado es una plataforma comercializable, mantenible por nuestro equipo y alineada a la identidad Abellis.'
			}
		]
	}: Props = $props();
</script>

<section class="ab3 {className}">
	<div class="ab3-container">
		<div class="ab3-intro">
			<h1 class="ab3-title">{title}</h1>
			{#if description}
				<p class="ab3-lead">{description}</p>
			{/if}
		</div>

		<div class="ab3-grid">
			<img class="ab3-main" src={mainImage.src} alt={mainImage.alt} width="900" height="620" />
			<div class="ab3-side">
				<div class="ab3-breakout">
					{#if breakout.src}
						<img class="ab3-breakout__logo" src={breakout.src} alt={breakout.alt ?? ''} height="48" />
					{/if}
					<div>
						<p class="ab3-breakout__title">{breakout.title}</p>
						<p class="ab3-breakout__desc">{breakout.description}</p>
					</div>
					{#if breakout.buttonText && breakout.buttonUrl}
						<a class="ab3-btn" href={breakout.buttonUrl}>{breakout.buttonText}</a>
					{/if}
				</div>
				<img class="ab3-secondary" src={secondaryImage.src} alt={secondaryImage.alt} width="400" height="480" />
			</div>
		</div>

		{#if companies && companies.length > 0}
			<div class="ab3-marquee-wrap">
				{#if companiesTitle}
					<p class="ab3-marquee-label">{companiesTitle}</p>
				{/if}
				<Marquee duration={40}>
					{#each companies as company, idx (company.src + String(idx))}
						<span class="ab3-logo">
							<img src={company.src} alt={company.alt} height="28" />
						</span>
					{/each}
				</Marquee>
			</div>
		{/if}

		<div class="ab3-stats">
			<div class="ab3-stats__head">
				<h2 class="ab3-stats__title">{achievementsTitle}</h2>
				{#if achievementsDescription}
					<p class="ab3-stats__desc">{achievementsDescription}</p>
				{/if}
			</div>
			<div class="ab3-stats__grid">
				{#each achievements ?? [] as item, idx (item.label + String(idx))}
					<div class="ab3-stat">
						<span class="ab3-stat__value">{item.value}</span>
						<p class="ab3-stat__label">{item.label}</p>
					</div>
				{/each}
			</div>
		</div>

		{#if contentSections && contentSections.length > 0}
			<div class="ab3-content">
				{#each contentSections as section, idx (section.title + String(idx))}
					<div class="ab3-content__col">
						<h2 class="ab3-content__title">{section.title}</h2>
						<p class="ab3-content__body">{section.content}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.ab3 {
		--ab3-ease: cubic-bezier(0.22, 1, 0.36, 1);
		padding: 3.5rem 0;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}
	.ab3-container { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem; }
	.ab3-intro {
		display: flex; flex-direction: column; gap: 0.85rem;
		margin-bottom: 2.75rem; max-width: 42rem;
	}
	.ab3-title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(2rem, 4.5vw, 3.25rem);
		font-weight: 700; letter-spacing: -0.04em; line-height: 1.08;
		color: var(--head-ink, #012a50);
	}
	.ab3-lead {
		margin: 0;
		font-size: clamp(1rem, 1.6vw, 1.2rem);
		line-height: 1.6; color: var(--slate, #5c6b7d);
	}
	.ab3-grid { display: grid; gap: 1.25rem; }
	@media (min-width: 1024px) {
		.ab3-grid { grid-template-columns: 2fr 1fr; align-items: stretch; }
	}
	.ab3-main {
		width: 100%; max-height: 620px; height: 100%; object-fit: cover;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
		display: block;
	}
	.ab3-side { display: flex; flex-direction: column; gap: 1.25rem; }
	@media (min-width: 768px) and (max-width: 1023px) {
		.ab3-side { flex-direction: row; }
		.ab3-breakout, .ab3-secondary { flex: 1; min-width: 0; }
	}
	.ab3-breakout {
		display: flex; flex-direction: column; justify-content: space-between;
		gap: 1.1rem; padding: 1.35rem; border-radius: 16px;
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 85%, var(--card, #fff));
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		flex: 1;
	}
	.ab3-breakout__logo { height: 2.75rem; width: auto; object-fit: contain; align-self: flex-start; }
	.ab3-breakout__title {
		margin: 0 0 0.35rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700; font-size: 1.05rem; letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}
	.ab3-breakout__desc { margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--slate, #5c6b7d); }
	.ab3-btn {
		display: inline-flex; align-items: center; justify-content: center; align-self: flex-start;
		padding: 0.5rem 1rem; border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 90%, transparent);
		color: var(--navy, #004c8b);
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 650; font-size: 0.8125rem; text-decoration: none;
		transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.2s ease, background 0.2s ease;
	}
	.ab3-btn:hover {
		transform: translateY(-1px);
		background: var(--navy, #004c8b); color: #fff;
		box-shadow: 0 8px 20px color-mix(in srgb, var(--navy, #004c8b) 25%, transparent);
	}
	.ab3-secondary {
		width: 100%; min-height: 12rem; flex: 1; object-fit: cover; border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
		display: block;
	}
	.ab3-marquee-wrap { padding: 3rem 0 2rem; }
	.ab3-marquee-label {
		margin: 0 0 1rem; text-align: center; font-size: 0.72rem; font-weight: 700;
		letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate, #5c6b7d);
	}
	.ab3-logo {
		display: inline-flex; align-items: center; margin: 0 2rem;
		opacity: 0.7; filter: grayscale(1); transition: opacity 0.2s ease;
	}
	.ab3-logo:hover { opacity: 1; }
	.ab3-logo img { height: 1.75rem; width: auto; display: block; }
	@media (min-width: 768px) { .ab3-logo img { height: 2rem; } }
	:global(.dark) .ab3-logo img,
	:global(html.dark) .ab3-logo img { filter: invert(1) grayscale(1); }
	.ab3-stats {
		position: relative; overflow: hidden; border-radius: 16px; padding: 1.5rem;
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 80%, var(--card, #fff));
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	@media (min-width: 768px) { .ab3-stats { padding: 2.75rem; } }
	.ab3-stats__head { display: flex; flex-direction: column; gap: 0.65rem; text-align: center; }
	@media (min-width: 768px) { .ab3-stats__head { text-align: left; } }
	.ab3-stats__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.45rem, 2.5vw, 2rem); font-weight: 650; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.ab3-stats__desc {
		margin: 0; max-width: 32rem; font-size: 0.95rem; line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.ab3-stats__grid {
		margin-top: 2rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem 1rem;
	}
	@media (min-width: 768px) {
		.ab3-stats__grid { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1.5rem 2rem; }
	}
	.ab3-stat { display: flex; flex-direction: column; gap: 0.25rem; text-align: center; }
	@media (min-width: 768px) { .ab3-stat { text-align: left; } }
	.ab3-stat__value {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.75rem, 3vw, 2.75rem); font-weight: 700; letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums; color: var(--navy, #004c8b); line-height: 1.1;
	}
	.ab3-stat__label { margin: 0; font-size: 0.85rem; color: var(--slate, #5c6b7d); }
	.ab3-content {
		display: grid; gap: 2.5rem; max-width: 56rem; margin: 0 auto; padding: 3.5rem 0 0;
	}
	@media (min-width: 768px) {
		.ab3-content { grid-template-columns: 1fr 1fr; gap: 3rem 4rem; }
	}
	.ab3-content__title {
		margin: 0 0 1rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.2vw, 1.85rem); font-weight: 650; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.ab3-content__body {
		margin: 0; font-size: 1rem; line-height: 1.65; color: var(--slate, #5c6b7d);
		white-space: pre-line;
	}
</style>
