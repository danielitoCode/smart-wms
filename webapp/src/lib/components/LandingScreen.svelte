<script lang="ts">
	/**
	 * LandingScreen — presentación SaaS Smart WMS (carga en frío en `/`).
	 * Ensambla componentes migrados React→Svelte con tokens Abellis e imágenes logísticas.
	 */
	import HoverExpand from './HoverExpand.svelte';
	import type { HoverExpandImage } from './hoverExpand.types';
	import TaskWidget from './TaskWidget.svelte';
	import type { TaskData } from './taskWidget.types';
	import SharedTooltipAvatars from './SharedTooltipAvatars.svelte';
	import type { AvatarItem } from './sharedTooltipAvatars.types';
	import Tags from './Tags.svelte';
	import type { Tag } from './tags.types';
	import PremiumTestimonial from './PremiumTestimonial.svelte';
	import BlobCard from './BlobCard.svelte';
	import ViewOnMap from './ViewOnMap.svelte';

	let menuOpen = $state(false);
	let navScrolled = $state(false);

	function onScroll() {
		navScrolled = typeof window !== 'undefined' && window.scrollY > 12;
	}

	const gallery: HoverExpandImage[] = [
		{
			src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=1000&fit=crop',
			alt: 'Pasillos de almacén con estanterías',
			code: 'WH-01'
		},
		{
			src: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=1000&fit=crop',
			alt: 'Operario con scanner en picking',
			code: 'PK-12'
		},
		{
			src: 'https://images.unsplash.com/photo-1605745341112-859dfc6c8d2a?w=800&h=1000&fit=crop',
			alt: 'Paquetería y cajas preparadas',
			code: 'PK-08'
		},
		{
			src: 'https://images.unsplash.com/photo-1578574577315-52ac14238d5d?w=800&h=1000&fit=crop',
			alt: 'Muelles de carga y camiones',
			code: 'SH-04'
		},
		{
			src: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=1000&fit=crop',
			alt: 'Contenedores y logística',
			code: 'LG-22'
		},
		{
			src: 'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=800&h=1000&fit=crop',
			alt: 'Inventario y estiba',
			code: 'IV-15'
		}
	];

	const opsTask: TaskData = {
		title: 'Wave de picking · Nave 2',
		progress: 68,
		completedCount: 17,
		totalCount: 25,
		priority: 'Alta',
		status: 'En curso',
		subtasks: [
			{ id: '1', title: 'Validar ola de pedidos', completed: true },
			{ id: '2', title: 'Asignar operarios', completed: true },
			{ id: '3', title: 'Confirmar bins preferidos', completed: true },
			{ id: '4', title: 'Cerrar y empaquetar', completed: false }
		],
		assignees: [
			{ name: 'María', avatar: 'https://i.pravatar.cc/150?u=maria-wms' },
			{ name: 'Luis', avatar: 'https://i.pravatar.cc/150?u=luis-wms' },
			{ name: 'Ana', avatar: 'https://i.pravatar.cc/150?u=ana-wms' }
		]
	};

	const team: AvatarItem[] = [
		{ id: '1', name: 'Ops Madrid', image: 'https://i.pravatar.cc/150?u=ops-mad' },
		{ id: '2', name: 'Ops Valencia', image: 'https://i.pravatar.cc/150?u=ops-val' },
		{ id: '3', name: 'Supervisor', image: 'https://i.pravatar.cc/150?u=sup-wms' },
		{ id: '4', name: 'Calidad', image: 'https://i.pravatar.cc/150?u=qa-wms' },
		{ id: '5', name: 'IT', image: 'https://i.pravatar.cc/150?u=it-wms' }
	];

	const capabilityTags: Tag[] = [
		{ id: 'rcv', label: 'Receiving' },
		{ id: 'put', label: 'Putaway' },
		{ id: 'pck', label: 'Picking' },
		{ id: 'pak', label: 'Packing' },
		{ id: 'shp', label: 'Shipping' },
		{ id: 'cyc', label: 'Cycle count' },
		{ id: 'xfr', label: 'Transfers' },
		{ id: 'inv', label: 'Inventory' },
		{ id: 'mwh', label: 'Multi-almacén' }
	];

	const testimonials = [
		{
			name: 'Elena Ruiz',
			role: 'Directora de operaciones',
			company: 'LogiSur',
			avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'Unificamos tres naves con un solo flujo de recepción a expedición. Menos papel, menos errores de bin y visibilidad en tiempo real.',
			results: ['−32% tiempo de picking', 'Inventario fiable', 'Multi-almacén']
		},
		{
			name: 'Carlos Mena',
			role: 'Jefe de almacén',
			company: 'Distribex',
			avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'El núcleo operativo es claro: receiving, putaway, olas de picking y packing sin saltar de herramientas.',
			results: ['Olas validadas', 'Menos roturas', 'Onboarding rápido']
		},
		{
			name: 'Sofía Alarcón',
			role: 'Supply chain lead',
			company: 'NortePack',
			avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: 'Diseñado para crecer: hoy un negocio multi-almacén; mañana usuarios y centros sin reescribir el modelo.',
			results: ['Escalable', 'Permisos claros', 'Trazabilidad']
		}
	];

	const navLinks = [
		{ href: '#operaciones', label: 'Operaciones' },
		{ href: '#capacidades', label: 'Capacidades' },
		{ href: '#confianza', label: 'Confianza' },
		{ href: '#contacto', label: 'Ubicación' }
	];

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window onscroll={onScroll} />

<div class="lp">
	<!-- Nav -->
	<header class="lp-nav" class:lp-nav--solid={navScrolled || menuOpen}>
		<div class="lp-nav__inner">
			<a href="/" class="lp-brand" onclick={closeMenu}>
				<span class="lp-brand__mark">SW</span>
				<span class="lp-brand__text">
					<span class="lp-brand__name">Smart WMS</span>
					<span class="lp-brand__sub">by Abellis</span>
				</span>
			</a>

			<nav class="lp-nav__links" aria-label="Secciones">
				{#each navLinks as link}
					<a href={link.href}>{link.label}</a>
				{/each}
			</nav>

			<div class="lp-nav__actions">
				<a class="lp-btn lp-btn--ghost lp-btn--sm" href="/lab">UI Lab</a>
				<a class="lp-btn lp-btn--primary lp-btn--sm" href="/login">Iniciar sesión</a>
				<button
					type="button"
					class="lp-menu-btn"
					aria-expanded={menuOpen}
					aria-controls="lp-drawer"
					aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
					onclick={() => (menuOpen = !menuOpen)}
				>
					{#if menuOpen}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
							><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" /></svg
						>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
							><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" /></svg
						>
					{/if}
				</button>
			</div>
		</div>

		{#if menuOpen}
			<div id="lp-drawer" class="lp-drawer">
				{#each navLinks as link}
					<a href={link.href} onclick={closeMenu}>{link.label}</a>
				{/each}
				<a class="lp-btn lp-btn--primary" href="/login" onclick={closeMenu}>Iniciar sesión</a>
			</div>
		{/if}
	</header>

	<!-- Hero -->
	<section class="lp-hero">
		<div class="lp-hero__copy">
			<p class="lp-kicker">Núcleo operativo · Multi-almacén</p>
			<h1 class="lp-hero__title">
				El WMS que ordena recepción,
				<span class="lp-hero__accent">picking y expedición</span>
				en un solo flujo
			</h1>
			<p class="lp-hero__lead">
				Smart WMS es la base moderna para operaciones de almacén reales: inventario fiable, olas de
				picking, packing y shipping, pensado hoy para un negocio multi-almacén y preparado para crecer a
				multi-usuario y multi-centro.
			</p>
			<div class="lp-hero__cta">
				<a class="lp-btn lp-btn--primary lp-btn--lg" href="/login">Entrar a la plataforma</a>
				<a class="lp-btn lp-btn--secondary lp-btn--lg" href="#operaciones">Ver el núcleo</a>
			</div>
			<div class="lp-hero__team">
				<SharedTooltipAvatars items={team} />
				<p>Equipos de piso, supervisión e IT en el mismo contexto de almacén.</p>
			</div>
		</div>
		<div class="lp-hero__visual" aria-hidden="true">
			<img
				src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=900&fit=crop"
				alt=""
				class="lp-hero__img"
				width="600"
				height="450"
			/>
			<div class="lp-hero__float">
				<span class="lp-hero__float-label">Estado</span>
				<strong>Inventario sincronizado</strong>
				<span class="lp-pill">3 almacenes activos</span>
			</div>
		</div>
	</section>

	<!-- Gallery -->
	<section class="lp-section lp-section--muted" id="galeria">
		<div class="lp-section__head">
			<p class="lp-kicker">Operativa real</p>
			<h2 class="lp-h2">Almacén, estiba y paquetería</h2>
			<p class="lp-lead">Imágenes del entorno que el producto controla: naves, picking, packing y muelles.</p>
		</div>
		<div class="lp-gallery">
			<HoverExpand images={gallery} />
		</div>
	</section>

	<!-- Ops + TaskWidget -->
	<section class="lp-section" id="operaciones">
		<div class="lp-split">
			<div>
				<p class="lp-kicker">Flujo de piso</p>
				<h2 class="lp-h2">Del muelle al camión sin perder el hilo</h2>
				<p class="lp-lead">
					Receiving, putaway, olas de picking, packing y shipping forman la cadena operativa. Cada paso
					respeta el almacén activo y las reglas de inventario.
				</p>
				<ul class="lp-list">
					<li>Contexto de almacén en cada petición</li>
					<li>Validación de olas y lotes de picking</li>
					<li>Cycle count y ajustes controlados</li>
					<li>Permisos por página alineados al rol</li>
				</ul>
			</div>
			<div class="lp-split__widget">
				<TaskWidget data={opsTask} />
			</div>
		</div>
	</section>

	<!-- Feature cards Blob -->
	<section class="lp-section lp-section--muted" id="capacidades">
		<div class="lp-section__head">
			<p class="lp-kicker">Capacidades</p>
			<h2 class="lp-h2">Núcleo funcional, arquitectura limpia</h2>
			<p class="lp-lead">Frontend SvelteKit + Clean Architecture consumiendo el backend WMS existente.</p>
		</div>
		<div class="lp-blobs">
			<BlobCard colorPrimary="#004c8b" colorSecondary="#012a50" colorAccent="#c9a227" colorHighlight="#e8c547">
				<div class="lp-blob-copy">
					<strong>Multi-almacén</strong>
					<span>Un negocio, varios centros, un solo modelo operativo.</span>
				</div>
			</BlobCard>
			<BlobCard colorPrimary="#0f3460" colorSecondary="#16213e" colorAccent="#e94560" colorHighlight="#ff6b6b">
				<div class="lp-blob-copy">
					<strong>Inventario fiable</strong>
					<span>Conteos, ajustes y trazabilidad sin romper consistencia.</span>
				</div>
			</BlobCard>
			<BlobCard colorPrimary="#1a1a2e" colorSecondary="#16213e" colorAccent="#0f3460" colorHighlight="#533483">
				<div class="lp-blob-copy">
					<strong>Listo para escalar</strong>
					<span>De un tenant multi-nave a multi-usuario y multi-tenant.</span>
				</div>
			</BlobCard>
		</div>

		<div class="lp-tags-wrap">
			<p class="lp-tags-label">Módulos del núcleo</p>
			<Tags tags={capabilityTags} />
		</div>
	</section>

	<!-- Testimonials -->
	<section class="lp-section" id="confianza">
		<PremiumTestimonial
			title="Operadores que ya ordenan el piso"
			subTitle="Referencias"
			tagline="Confianza operativa"
			des="Historias alineadas al núcleo WMS: menos fricción entre muelle, pasillo y expedición."
			items={testimonials}
		/>
	</section>

	<!-- Map / location -->
	<section class="lp-section lp-section--muted" id="contacto">
		<div class="lp-split lp-split--map">
			<div>
				<p class="lp-kicker">Presencia</p>
				<h2 class="lp-h2">Centros que importan en el mapa</h2>
				<p class="lp-lead">
					Cada almacén es un contexto de trabajo. El panel lateral del producto y el selector de nave
					mantienen al equipo en el sitio correcto.
				</p>
				<a class="lp-btn lp-btn--primary" href="/login">Acceder al escritorio</a>
			</div>
			<div class="lp-map">
				<ViewOnMap
					locationName="Hub logístico"
					address="Zona de actividad logística, Valencia, ES"
					mapImageUrl="https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=1600&auto=format&fit=crop"
				/>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="lp-cta">
		<div class="lp-cta__inner">
			<h2 class="lp-h2 lp-h2--on-dark">Empieza por el núcleo. Escala después.</h2>
			<p>
				Autentícate para entrar al escritorio operativo. La landing es el preludio; el producto es el
				almacén en movimiento.
			</p>
			<a class="lp-btn lp-btn--gold lp-btn--lg" href="/login">Iniciar sesión</a>
		</div>
	</section>

	<footer class="lp-foot">
		<div class="lp-foot__inner">
			<span class="lp-brand__mark lp-brand__mark--sm">SW</span>
			<p>Smart WMS · Abellis · Presentación de producto</p>
			<div class="lp-foot__links">
				<a href="/login">Login</a>
				<a href="/lab">Component Lab</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.lp {
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}

	.lp-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
		border-bottom: 1px solid transparent;
		background: color-mix(in srgb, var(--bg, #edf2f8) 75%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.lp-nav--solid {
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		border-bottom-color: var(--line, #d9e2ec);
		box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
	}

	.lp-nav__inner {
		max-width: 1120px;
		margin: 0 auto;
		padding: 0.85rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.lp-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		color: inherit;
	}

	.lp-brand__mark {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: linear-gradient(145deg, var(--navy, #004c8b), #012a50);
		color: #fff;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		box-shadow: 0 2px 10px color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
	}

	.lp-brand__mark--sm {
		width: 28px;
		height: 28px;
		font-size: 0.62rem;
	}

	.lp-brand__text {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.lp-brand__name {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--head-ink, #012a50);
	}

	.lp-brand__sub {
		font-size: 0.68rem;
		color: var(--slate, #5c6b7d);
	}

	.lp-nav__links {
		display: none;
		flex: 1;
		justify-content: center;
		gap: 1.25rem;
	}

	.lp-nav__links a {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
		text-decoration: none;
	}

	.lp-nav__links a:hover {
		color: var(--navy, #004c8b);
	}

	.lp-nav__actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.lp-menu-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 10px;
		border: 1px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
		color: var(--head-ink, #012a50);
		cursor: pointer;
	}

	.lp-drawer {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem 1.25rem 1rem;
		border-top: 1px solid var(--line, #d9e2ec);
	}

	.lp-drawer a:not(.lp-btn) {
		padding: 0.65rem 0.35rem;
		text-decoration: none;
		color: var(--head-ink, #012a50);
		font-weight: 600;
	}

	@media (min-width: 880px) {
		.lp-nav__links {
			display: flex;
		}
		.lp-menu-btn,
		.lp-drawer {
			display: none;
		}
	}

	.lp-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		border-radius: 11px;
		font-weight: 700;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		text-decoration: none;
		border: 1.5px solid transparent;
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			transform 0.12s ease;
	}

	.lp-btn:active {
		transform: scale(0.98);
	}

	.lp-btn--sm {
		padding: 0.45rem 0.85rem;
		font-size: 0.8125rem;
	}

	.lp-btn--lg {
		padding: 0.85rem 1.35rem;
		font-size: 0.95rem;
	}

	.lp-btn--primary {
		background: var(--navy, #004c8b);
		color: #fff;
	}

	.lp-btn--primary:hover {
		opacity: 0.92;
	}

	.lp-btn--secondary {
		background: var(--card, #fff);
		border-color: var(--line, #d9e2ec);
		color: var(--head-ink, #012a50);
	}

	.lp-btn--ghost {
		background: transparent;
		color: var(--slate, #5c6b7d);
		border-color: transparent;
	}

	.lp-btn--ghost:hover {
		color: var(--navy, #004c8b);
	}

	.lp-btn--gold {
		background: linear-gradient(135deg, #c9a227, #e8c547);
		color: #1a1508;
	}

	.lp-hero {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 3rem;
		display: grid;
		gap: 2rem;
		align-items: center;
	}

	@media (min-width: 960px) {
		.lp-hero {
			grid-template-columns: 1.05fr 0.95fr;
			padding-top: 3.5rem;
			padding-bottom: 4rem;
		}
	}

	.lp-kicker {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--navy, #004c8b);
	}

	.lp-hero__title {
		margin: 0 0 1rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.85rem, 4.2vw, 2.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
		color: var(--head-ink, #012a50);
	}

	.lp-hero__accent {
		color: var(--navy, #004c8b);
	}

	.lp-hero__lead,
	.lp-lead {
		margin: 0 0 1.25rem;
		font-size: 1.02rem;
		line-height: 1.6;
		color: var(--slate, #5c6b7d);
		max-width: 36rem;
	}

	.lp-hero__cta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-bottom: 1.5rem;
	}

	.lp-hero__team {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
	}

	.lp-hero__team p {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.lp-hero__visual {
		position: relative;
	}

	.lp-hero__img {
		width: 100%;
		height: auto;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: 20px;
		border: 1.5px solid var(--line, #d9e2ec);
		box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
	}

	.lp-hero__float {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		padding: 0.85rem 1rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		backdrop-filter: blur(10px);
		border: 1px solid var(--line, #d9e2ec);
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.lp-hero__float-label {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lp-hero__float strong {
		font-size: 0.9rem;
		color: var(--head-ink, #012a50);
	}

	.lp-pill {
		margin-top: 0.25rem;
		width: fit-content;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, #fff);
		color: var(--navy, #004c8b);
	}

	.lp-section {
		max-width: 1120px;
		margin: 0 auto;
		padding: 3rem 1.25rem;
	}

	.lp-section--muted {
		max-width: none;
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 80%, var(--bg, #edf2f8));
		border-block: 1px solid var(--line, #d9e2ec);
	}

	.lp-section--muted > .lp-section__head,
	.lp-section--muted > .lp-gallery,
	.lp-section--muted > .lp-blobs,
	.lp-section--muted > .lp-tags-wrap,
	.lp-section--muted > .lp-split {
		max-width: 1120px;
		margin-left: auto;
		margin-right: auto;
		padding-left: 1.25rem;
		padding-right: 1.25rem;
	}

	.lp-section--muted > .lp-section__head {
		padding-top: 3rem;
	}

	.lp-section--muted > .lp-tags-wrap {
		padding-bottom: 3rem;
	}

	.lp-section__head {
		margin-bottom: 1.75rem;
	}

	.lp-h2 {
		margin: 0 0 0.65rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.45rem, 2.8vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.lp-h2--on-dark {
		color: #fff;
	}

	.lp-gallery {
		overflow-x: auto;
		padding-bottom: 2.5rem;
	}

	.lp-split {
		display: grid;
		gap: 2rem;
		align-items: center;
	}

	@media (min-width: 900px) {
		.lp-split {
			grid-template-columns: 1fr 1fr;
		}
	}

	.lp-list {
		margin: 0 0 1.25rem;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.lp-list li {
		position: relative;
		padding-left: 1.15rem;
		font-size: 0.95rem;
		color: var(--ink, #132234);
	}

	.lp-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.45rem;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: var(--navy, #004c8b);
	}

	.lp-split__widget {
		display: flex;
		justify-content: center;
	}

	.lp-blobs {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
		padding-bottom: 1.5rem;
	}

	@media (min-width: 800px) {
		.lp-blobs {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.lp-blob-copy {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1rem;
		color: #fff;
	}

	.lp-blob-copy strong {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.05rem;
	}

	.lp-blob-copy span {
		font-size: 0.85rem;
		opacity: 0.9;
		line-height: 1.4;
	}

	.lp-tags-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.lp-tags-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lp-map {
		min-height: 220px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lp-cta {
		padding: 3.5rem 1.25rem;
		background: linear-gradient(145deg, #012a50, var(--navy, #004c8b) 55%, #0a3d6b);
		color: rgba(255, 255, 255, 0.88);
	}

	.lp-cta__inner {
		max-width: 640px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.lp-cta p {
		margin: 0;
		line-height: 1.55;
		max-width: 32rem;
	}

	.lp-foot {
		border-top: 1px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
	}

	.lp-foot__inner {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
	}

	.lp-foot p {
		margin: 0;
		flex: 1;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.lp-foot__links {
		display: flex;
		gap: 1rem;
	}

	.lp-foot__links a {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}

	.lp-foot__links a:hover {
		text-decoration: underline;
	}

	:global([data-theme='dark']) .lp {
		/* hereda tokens de app cuando existen */
	}
</style>
