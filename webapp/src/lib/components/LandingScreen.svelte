<script lang="ts">
	/**
	 * LandingScreen — presentación SaaS Smart WMS.
	 * Tema + idioma, i18n, motion de scroll. Galería Unsplash corregida.
	 */
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';
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
	import './landing-screen.css';

	const i18n = getContext<I18nState>('i18n');

	let menuOpen = $state(false);
	let navScrolled = $state(false);
	let scrollProgress = $state(0);
	let heroParallax = $state(0);
	let rootEl = $state<HTMLElement | null>(null);

	function onScroll() {
		if (typeof window === 'undefined') return;
		const y = window.scrollY;
		navScrolled = y > 12;
		const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		scrollProgress = Math.min(1, y / max);
		heroParallax = Math.min(28, y * 0.12);
	}

	function closeMenu() {
		menuOpen = false;
	}

	onMount(() => {
		onScroll();
		const nodes = rootEl?.querySelectorAll('[data-reveal]');
		if (!nodes?.length) return;
		const reduced =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) {
			nodes.forEach((n) => n.classList.add('is-in'));
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						e.target.classList.add('is-in');
						io.unobserve(e.target);
					}
				}
			},
			{ rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
		);
		nodes.forEach((n) => io.observe(n));
		return () => io.disconnect();
	});

	const gallery: HoverExpandImage[] = [
		{
			src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=1000&fit=crop',
			alt: 'Warehouse aisles',
			code: 'WH-01'
		},
		{
			src: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=1000&fit=crop',
			alt: 'Picking with scanner',
			code: 'PK-12'
		},
		{
			src: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=1000&fit=crop',
			alt: 'Packing station',
			code: 'PK-08'
		},
		{
			src: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=1000&fit=crop',
			alt: 'Loading docks',
			code: 'SH-04'
		},
		{
			src: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=1000&fit=crop',
			alt: 'Containers',
			code: 'LG-22'
		},
		{
			src: 'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=800&h=1000&fit=crop',
			alt: 'Inventory',
			code: 'IV-15'
		}
	];

	const opsTask = $derived<TaskData>({
		title: i18n.t('Wave de picking · Nave 2'),
		progress: 68,
		completedCount: 17,
		totalCount: 25,
		priority: i18n.t('Alta'),
		status: i18n.t('En curso'),
		subtasks: [
			{ id: '1', title: i18n.t('Validar ola de pedidos'), completed: true },
			{ id: '2', title: i18n.t('Asignar operarios'), completed: true },
			{ id: '3', title: i18n.t('Confirmar bins preferidos'), completed: true },
			{ id: '4', title: i18n.t('Cerrar y empaquetar'), completed: false }
		],
		assignees: [
			{ name: 'María', avatar: 'https://i.pravatar.cc/150?u=maria-wms' },
			{ name: 'Luis', avatar: 'https://i.pravatar.cc/150?u=luis-wms' },
			{ name: 'Ana', avatar: 'https://i.pravatar.cc/150?u=ana-wms' }
		]
	});

	const team: AvatarItem[] = [
		{ id: '1', name: 'Ops Madrid', image: 'https://i.pravatar.cc/150?u=ops-mad' },
		{ id: '2', name: 'Ops Valencia', image: 'https://i.pravatar.cc/150?u=ops-val' },
		{ id: '3', name: 'Supervisor', image: 'https://i.pravatar.cc/150?u=sup-wms' },
		{ id: '4', name: 'QA', image: 'https://i.pravatar.cc/150?u=qa-wms' },
		{ id: '5', name: 'IT', image: 'https://i.pravatar.cc/150?u=it-wms' }
	];

	const capabilityTags = $derived<Tag[]>([
		{ id: 'rcv', label: i18n.t('Receiving') },
		{ id: 'put', label: i18n.t('Putaway') },
		{ id: 'pck', label: i18n.t('Picking') },
		{ id: 'pak', label: i18n.t('Packing') },
		{ id: 'shp', label: i18n.t('Shipping') },
		{ id: 'cyc', label: i18n.t('Cycle count') },
		{ id: 'xfr', label: i18n.t('Transfers') },
		{ id: 'inv', label: i18n.t('Inventory') },
		{ id: 'mwh', label: i18n.t('Multi-almacén') }
	]);

	const testimonials = $derived([
		{
			name: 'Elena Ruiz',
			role: 'Ops Director',
			company: 'LogiSur',
			avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: i18n.t(
				'Unificamos tres naves con un solo flujo de recepción a expedición. Menos papel, menos errores de bin y visibilidad en tiempo real.'
			),
			results: ['−32% picking', 'Inventory', 'Multi-WH']
		},
		{
			name: 'Carlos Mena',
			role: 'Warehouse lead',
			company: 'Distribex',
			avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: i18n.t(
				'El núcleo operativo es claro: receiving, putaway, olas de picking y packing sin saltar de herramientas.'
			),
			results: ['Waves', 'Fewer breaks', 'Onboarding']
		},
		{
			name: 'Sofía Alarcón',
			role: 'Supply chain',
			company: 'NortePack',
			avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
			rating: 5,
			text: i18n.t(
				'Diseñado para crecer: hoy un negocio multi-almacén; mañana usuarios y centros sin reescribir el modelo.'
			),
			results: ['Scale', 'Permissions', 'Traceability']
		}
	]);

	const navLinks = $derived([
		{ href: '#operaciones', label: i18n.t('Operaciones') },
		{ href: '#capacidades', label: i18n.t('Capacidades') },
		{ href: '#confianza', label: i18n.t('Confianza') },
		{ href: '#contacto', label: i18n.t('Ubicación') }
	]);
</script>

<svelte:window onscroll={onScroll} />

<div class="lp" bind:this={rootEl}>
	<div class="lp-progress" style="transform: scaleX({scrollProgress})" aria-hidden="true"></div>

	<header class="lp-nav" class:lp-nav--solid={navScrolled || menuOpen}>
		<div class="lp-nav__inner">
			<a href="/" class="lp-brand" onclick={closeMenu}>
				<img class="lp-brand__mark" src="/brand/abellis_mark_principal.svg" width="36" height="36" alt="Abellis" />
				<span class="lp-brand__text">
					<span class="lp-brand__name">Smart WMS</span>
					<span class="lp-brand__sub">Abellis</span>
				</span>
			</a>
			<nav class="lp-nav__links" aria-label={i18n.t('Secciones')}>
				{#each navLinks as link}
					<a href={link.href}>{link.label}</a>
				{/each}
			</nav>
			<div class="lp-nav__actions">
				<div class="lp-tool" title={i18n.t('Idioma')}><LocaleSwitcher /></div>
				<div class="lp-tool lp-tool--theme" title={i18n.t('Tema')}><ThemeToggle /></div>
				<a class="lp-btn lp-btn--ghost lp-btn--sm lp-hide-sm" href="/lab">{i18n.t('UI Lab')}</a>
				<a class="lp-btn lp-btn--primary lp-btn--sm" href="/login">{i18n.t('Iniciar sesión')}</a>
				<button
					type="button"
					class="lp-menu-btn"
					aria-expanded={menuOpen}
					aria-controls="lp-drawer"
					aria-label={menuOpen ? i18n.t('Cerrar menú') : i18n.t('Abrir menú')}
					onclick={() => (menuOpen = !menuOpen)}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						{#if menuOpen}
							<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
						{:else}
							<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
						{/if}
					</svg>
				</button>
			</div>
		</div>
		{#if menuOpen}
			<div id="lp-drawer" class="lp-drawer">
				{#each navLinks as link}
					<a href={link.href} onclick={closeMenu}>{link.label}</a>
				{/each}
				<div class="lp-drawer__tools">
					<span class="lp-drawer__label">{i18n.t('Idioma')}</span>
					<LocaleSwitcher />
					<span class="lp-drawer__label">{i18n.t('Tema')}</span>
					<ThemeToggle />
				</div>
				<a class="lp-btn lp-btn--primary" href="/login" onclick={closeMenu}>{i18n.t('Iniciar sesión')}</a>
			</div>
		{/if}
	</header>

	<section class="lp-hero">
		<div class="lp-hero__copy" data-reveal>
			<p class="lp-kicker">{i18n.t('Núcleo operativo · Multi-almacén')}</p>
			<h1 class="lp-hero__title">
				{i18n.t('El WMS que ordena recepción,')}
				<span class="lp-hero__accent">{i18n.t('picking y expedición')}</span>
				{i18n.t('en un solo flujo')}
			</h1>
			<p class="lp-hero__lead">
				{i18n.t(
					'Smart WMS es la base moderna para operaciones de almacén reales: inventario fiable, olas de picking, packing y shipping, pensado hoy para un negocio multi-almacén y preparado para crecer a multi-usuario y multi-centro.'
				)}
			</p>
			<div class="lp-hero__cta">
				<a class="lp-btn lp-btn--primary lp-btn--lg" href="/login">{i18n.t('Entrar a la plataforma')}</a>
				<a class="lp-btn lp-btn--secondary lp-btn--lg" href="#operaciones">{i18n.t('Ver el núcleo')}</a>
			</div>
			<div class="lp-hero__team">
				<SharedTooltipAvatars items={team} />
				<p>{i18n.t('Equipos de piso, supervisión e IT en el mismo contexto de almacén.')}</p>
			</div>
		</div>
		<div class="lp-hero__visual" data-reveal style="--d: 90ms">
			<div class="lp-hero__frame">
				<img
					src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=900&fit=crop"
					alt=""
					class="lp-hero__img"
					width="600"
					height="450"
				/>
			</div>
			<div class="lp-hero__float">
				<span class="lp-hero__float-label">{i18n.t('Estado')}</span>
				<strong>{i18n.t('Inventario sincronizado')}</strong>
				<span class="lp-pill">{i18n.t('3 almacenes activos')}</span>
			</div>
		</div>
	</section>

	<section class="lp-section lp-section--muted" id="galeria">
		<div class="lp-section__head" data-reveal>
			<p class="lp-kicker">{i18n.t('Operativa real')}</p>
			<h2 class="lp-h2">{i18n.t('Almacén, estiba y paquetería')}</h2>
			<p class="lp-lead">
				{i18n.t('Imágenes del entorno que el producto controla: naves, picking, packing y muelles.')}
			</p>
		</div>
		<div class="lp-gallery" data-reveal style="--d: 60ms">
			<HoverExpand images={gallery} />
		</div>
	</section>

	<section class="lp-section" id="operaciones">
		<div class="lp-split">
			<div data-reveal>
				<p class="lp-kicker">{i18n.t('Flujo de piso')}</p>
				<h2 class="lp-h2">{i18n.t('Del muelle al camión sin perder el hilo')}</h2>
				<p class="lp-lead">
					{i18n.t(
						'Receiving, putaway, olas de picking, packing y shipping forman la cadena operativa. Cada paso respeta el almacén activo y las reglas de inventario.'
					)}
				</p>
				<ul class="lp-list">
					<li>{i18n.t('Contexto de almacén en cada petición')}</li>
					<li>{i18n.t('Validación de olas y lotes de picking')}</li>
					<li>{i18n.t('Cycle count y ajustes controlados')}</li>
					<li>{i18n.t('Permisos por página alineados al rol')}</li>
				</ul>
			</div>
			<div class="lp-split__widget" data-reveal style="--d: 100ms">
				<TaskWidget data={opsTask} />
			</div>
		</div>
	</section>

	<section class="lp-section lp-section--muted" id="capacidades">
		<div class="lp-section__head" data-reveal>
			<p class="lp-kicker">{i18n.t('Capacidades')}</p>
			<h2 class="lp-h2">{i18n.t('Núcleo funcional, arquitectura limpia')}</h2>
			<p class="lp-lead">
				{i18n.t('Frontend SvelteKit + Clean Architecture consumiendo el backend WMS existente.')}
			</p>
		</div>
		<div class="lp-blobs">
			<div data-reveal>
				<BlobCard colorPrimary="#004c8b" colorSecondary="#012a50" colorAccent="#c9a227" colorHighlight="#e8c547">
					<div class="lp-blob-copy">
						<strong>{i18n.t('Multi-almacén')}</strong>
						<span>{i18n.t('Un negocio, varios centros, un solo modelo operativo.')}</span>
					</div>
				</BlobCard>
			</div>
			<div data-reveal style="--d: 70ms">
				<BlobCard colorPrimary="#0f3460" colorSecondary="#16213e" colorAccent="#e94560" colorHighlight="#ff6b6b">
					<div class="lp-blob-copy">
						<strong>{i18n.t('Inventario fiable')}</strong>
						<span>{i18n.t('Conteos, ajustes y trazabilidad sin romper consistencia.')}</span>
					</div>
				</BlobCard>
			</div>
			<div data-reveal style="--d: 140ms">
				<BlobCard colorPrimary="#1a1a2e" colorSecondary="#16213e" colorAccent="#0f3460" colorHighlight="#533483">
					<div class="lp-blob-copy">
						<strong>{i18n.t('Listo para escalar')}</strong>
						<span>{i18n.t('De un tenant multi-nave a multi-usuario y multi-tenant.')}</span>
					</div>
				</BlobCard>
			</div>
		</div>
		<div class="lp-tags-wrap" data-reveal>
			<p class="lp-tags-label">{i18n.t('Módulos del núcleo')}</p>
			<Tags tags={capabilityTags} />
		</div>
	</section>

	<section class="lp-section" id="confianza" data-reveal>
		<PremiumTestimonial
			title={i18n.t('Operadores que ya ordenan el piso')}
			subTitle={i18n.t('Referencias')}
			tagline={i18n.t('Confianza operativa')}
			des={i18n.t('Historias alineadas al núcleo WMS: menos fricción entre muelle, pasillo y expedición.')}
			items={testimonials}
		/>
	</section>

	<section class="lp-section lp-section--muted" id="contacto">
		<div class="lp-split">
			<div data-reveal>
				<p class="lp-kicker">{i18n.t('Presencia')}</p>
				<h2 class="lp-h2">{i18n.t('Centros que importan en el mapa')}</h2>
				<p class="lp-lead">
					{i18n.t(
						'Cada almacén es un contexto de trabajo. El panel lateral del producto y el selector de nave mantienen al equipo en el sitio correcto.'
					)}
				</p>
				<a class="lp-btn lp-btn--primary" href="/login">{i18n.t('Acceder al escritorio')}</a>
			</div>
			<div class="lp-map" data-reveal style="--d: 90ms">
				<ViewOnMap
					locationName="Hub"
					address="Zona de actividad logística, Valencia, ES"
					mapImageUrl="https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=1600&auto=format&fit=crop"
				/>
			</div>
		</div>
	</section>

	<section class="lp-cta" data-reveal>
		<div class="lp-cta__inner">
			<div class="lp-cta__line" aria-hidden="true"></div>
			<h2 class="lp-h2 lp-h2--on-dark">{i18n.t('Empieza por el núcleo. Escala después.')}</h2>
			<p>
				{i18n.t(
					'Autentícate para entrar al escritorio operativo. La landing es el preludio; el producto es el almacén en movimiento.'
				)}
			</p>
			<a class="lp-btn lp-btn--gold lp-btn--lg" href="/login">{i18n.t('Iniciar sesión')}</a>
		</div>
	</section>

	<footer class="lp-foot">
		<div class="lp-foot__inner">
			<img class="lp-brand__mark lp-brand__mark--sm" src="/brand/abellis_mark_principal.svg" width="28" height="28" alt="" />
			<p>{i18n.t('Smart WMS · Abellis · Presentación de producto')}</p>
			<div class="lp-foot__links">
				<a href="/login">{i18n.t('Login')}</a>
				<a href="/lab">{i18n.t('Component Lab')}</a>
			</div>
		</div>
	</footer>
</div>
