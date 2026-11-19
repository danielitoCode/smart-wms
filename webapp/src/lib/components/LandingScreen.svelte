<script lang="ts">
	/**
	 * LandingScreen — presentación SaaS Smart WMS.
	 * Tema + idioma (contextos globales), copy vía i18n, motion de scroll fino (MotioDesign).
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
			src: 'https://images.unsplash.com/photo-1605745341112-859dfc6c8d2a?w=800&h=1000&fit=crop',
			alt: 'Packing station',
			code: 'PK-08'
		},
		{
			src: 'https://images.unsplash.com/photo-1578574577315-52ac14238d5d?w=800&h=1000&fit=crop',
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
			avatar:
				'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
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
			avatar:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
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
			avatar:
				'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
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
				<img
					class="lp-brand__mark"
					src="/brand/abellis_mark_principal.svg"
					width="36"
					height="36"
					alt="Abellis"
				/>
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
				<div class="lp-tool" title={i18n.t('Idioma')}>
					<LocaleSwitcher />
				</div>
				<div class="lp-tool lp-tool--theme" title={i18n.t('Tema')}>
					<ThemeToggle />
				</div>
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
		<div
			class="lp-hero__visual"
			data-reveal
			style="--d: 90ms; --parallax: {heroParallax}px"
		>
			<div class="lp-hero__frame">
				<img
					src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=900&fit=crop"
					alt=""
					class="lp-hero__img"
					width="600"
					height="450"
				/>
				<div class="lp-hero__shine" aria-hidden="true"></div>
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
			des={i18n.t(
				'Historias alineadas al núcleo WMS: menos fricción entre muelle, pasillo y expedición.'
			)}
			items={testimonials}
		/>
	</section>

	<section class="lp-section lp-section--muted" id="contacto">
		<div class="lp-split lp-split--map">
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
			<img
				class="lp-brand__mark lp-brand__mark--sm"
				src="/brand/abellis_mark_principal.svg"
				width="28"
				height="28"
				alt=""
			/>
			<p>{i18n.t('Smart WMS · Abellis · Presentación de producto')}</p>
			<div class="lp-foot__links">
				<a href="/login">{i18n.t('Login')}</a>
				<a href="/lab">{i18n.t('Component Lab')}</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.lp {
		--lp-ease: cubic-bezier(0.22, 1, 0.36, 1);
		--lp-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
		--lp-line: color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		--lp-hair: color-mix(in srgb, var(--line, #d9e2ec) 55%, transparent);
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
		overflow-x: clip;
	}

	.lp-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 1.5px;
		z-index: 60;
		transform-origin: 0 50%;
		background: linear-gradient(90deg, var(--navy, #004c8b), var(--gold, #c9a227));
		pointer-events: none;
		will-change: transform;
		box-shadow: 0 0 12px color-mix(in srgb, var(--gold, #c9a227) 35%, transparent);
	}

	.lp-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		border-bottom: 1px solid transparent;
		background: color-mix(in srgb, var(--bg, #edf2f8) 68%, transparent);
		backdrop-filter: blur(16px) saturate(1.25);
		-webkit-backdrop-filter: blur(16px) saturate(1.25);
		transition:
			background 0.4s var(--lp-ease),
			border-color 0.35s var(--lp-ease),
			box-shadow 0.4s var(--lp-ease);
	}

	.lp-nav--solid {
		background: color-mix(in srgb, var(--card, #fff) 86%, transparent);
		border-bottom-color: var(--lp-hair);
		box-shadow: 0 8px 28px rgba(15, 23, 42, 0.04);
	}

	.lp-nav__inner {
		max-width: 1120px;
		margin: 0 auto;
		padding: 0.7rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.lp-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: inherit;
	}

	.lp-brand__mark {
		display: block;
		width: 34px;
		height: 34px;
		border-radius: 9px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.lp-brand__mark--sm {
		width: 26px;
		height: 26px;
	}

	.lp-brand__text {
		display: flex;
		flex-direction: column;
		line-height: 1.12;
	}

	.lp-brand__name {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 0.92rem;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}

	.lp-brand__sub {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lp-nav__links {
		display: none;
		flex: 1;
		justify-content: center;
		gap: 0.1rem;
	}

	.lp-nav__links a {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
		text-decoration: none;
		padding: 0.38rem 0.72rem;
		border-radius: 999px;
		border: 1px solid transparent;
		transition:
			color 0.22s ease,
			background 0.22s ease,
			border-color 0.22s ease;
	}

	.lp-nav__links a:hover {
		color: var(--navy, #004c8b);
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		border-color: var(--lp-hair);
	}

	.lp-nav__actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.lp-tool {
		display: flex;
		align-items: center;
		padding: 0.15rem;
		border-radius: 10px;
		border: 1px solid var(--lp-hair);
		background: color-mix(in srgb, var(--card, #fff) 55%, transparent);
		transform: scale(0.94);
		transform-origin: center;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.lp-tool:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 22%, transparent);
		box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
	}

	.lp-menu-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 10px;
		border: 1px solid var(--lp-hair);
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 80%, transparent);
		color: var(--head-ink, #012a50);
		cursor: pointer;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
	}

	.lp-menu-btn:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 25%, transparent);
	}

	.lp-drawer {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.4rem 1.25rem 1.1rem;
		border-top: 1px solid var(--lp-hair);
	animation: lp-drawer-in 0.28s var(--lp-ease) both;
	}

	@keyframes lp-drawer-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.lp-drawer a:not(.lp-btn) {
		padding: 0.55rem 0.25rem;
		text-decoration: none;
		color: var(--head-ink, #012a50);
		font-weight: 600;
		font-size: 0.92rem;
	}

	.lp-drawer__tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		padding: 0.55rem 0 0.85rem;
		border-bottom: 1px solid var(--lp-hair);
		margin-bottom: 0.55rem;
	}

	.lp-drawer__label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	@media (min-width: 920px) {
		.lp-nav__links {
			display: flex;
		}
		.lp-menu-btn,
		.lp-drawer {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.lp-hide-sm {
			display: none;
		}
	}

	.lp-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 650;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
		letter-spacing: -0.01em;
		transition:
			transform 0.28s var(--lp-spring),
			box-shadow 0.28s var(--lp-ease),
			background 0.2s ease,
			border-color 0.2s ease;
	}

	.lp-btn:hover {
		transform: translateY(-1.5px);
	}

	.lp-btn:active {
		transform: translateY(0) scale(0.98);
	}

	.lp-btn--sm {
		padding: 0.42rem 0.9rem;
		font-size: 0.78rem;
	}

	.lp-btn--lg {
		padding: 0.8rem 1.35rem;
		font-size: 0.92rem;
	}

	.lp-btn--primary {
		background: var(--navy, #004c8b);
		color: #fff;
		box-shadow: 0 8px 22px color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
	}

	.lp-btn--secondary {
		background: color-mix(in srgb, var(--card, #fff) 90%, transparent);
		border-color: var(--lp-line);
		color: var(--head-ink, #012a50);
	}

	.lp-btn--ghost {
		background: transparent;
		color: var(--slate, #5c6b7d);
	}

	.lp-btn--gold {
		background: linear-gradient(135deg, #c9a227, #e8c547);
		color: #1a1508;
		box-shadow: 0 10px 28px rgba(201, 162, 39, 0.28);
	}

	.lp-hero {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2.75rem 1.25rem 3.25rem;
		display: grid;
		gap: 2.25rem;
		align-items: center;
	}

	@media (min-width: 960px) {
		.lp-hero {
			grid-template-columns: 1.05fr 0.95fr;
			padding-top: 3.75rem;
			padding-bottom: 4.25rem;
		}
	}

	.lp-kicker {
		margin: 0 0 0.55rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--navy, #004c8b);
	}

	.lp-hero__title {
		margin: 0 0 1rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.9rem, 4.4vw, 2.85rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 1.12;
		color: var(--head-ink, #012a50);
	}

	.lp-hero__accent {
		background: linear-gradient(
			120deg,
			var(--navy, #004c8b),
			color-mix(in srgb, var(--navy, #004c8b) 70%, #c9a227)
			);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.lp-hero__lead,
	.lp-lead {
		margin: 0 0 1.35rem;
		font-size: 1.02rem;
		line-height: 1.65;
		color: var(--slate, #5c6b7d);
		max-width: 34rem;
		font-weight: 450;
	}

	.lp-hero__cta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1.6rem;
	}

	.lp-hero__team {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
	}

	.lp-hero__team p {
		margin: 0;
		font-size: 0.78rem;
		color: var(--slate, #5c6b7d);
		max-width: 22rem;
	}

	.lp-hero__visual {
		position: relative;
	}

	.lp-hero__frame {
		position: relative;
		border-radius: 22px;
		overflow: hidden;
		border: 1px solid var(--lp-line);
		box-shadow:
			0 1px 0 color-mix(in srgb, #fff 40%, transparent) inset,
			0 24px 50px rgba(15, 23, 42, 0.12);
		transform: translate3d(0, calc(var(--parallax, 0px) * 0.35), 0);
		transition: transform 0.15s linear;
		will-change: transform;
	}

	.lp-hero__img {
		width: 100%;
		height: auto;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
		transform: scale(1.03);
		transition: transform 1.35s var(--lp-ease);
	}

	.lp-hero__visual.is-in .lp-hero__img {
		transform: scale(1);
	}

	.lp-hero__shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			125deg,
			transparent 40%,
			color-mix(in srgb, #fff 18%, transparent) 48%,
			transparent 56%
		);
		transform: translateX(-40%);
		animation: lp-shine 7s var(--lp-ease) infinite;
		pointer-events: none;
	}

	@keyframes lp-shine {
		0%,
		60% {
			transform: translateX(-50%);
			opacity: 0;
		}
		70% {
			opacity: 1;
		}
		100% {
			transform: translateX(50%);
			opacity: 0;
		}
	}

	.lp-hero__float {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		padding: 0.8rem 1rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--card, #fff) 88%, transparent);
		backdrop-filter: blur(12px);
		border: 1px solid var(--lp-line);
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		animation: lp-float 5.5s ease-in-out infinite;
		transform: translate3d(0, calc(var(--parallax, 0px) * -0.2), 0);
	}

	@keyframes lp-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	.lp-hero__float-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	.lp-hero__float strong {
		font-size: 0.88rem;
		color: var(--head-ink, #012a50);
	}

	.lp-pill {
		margin-top: 0.25rem;
		width: fit-content;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.18rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
		color: var(--navy, #004c8b);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 18%, transparent);
	}

	.lp-section {
		max-width: 1120px;
		margin: 0 auto;
		padding: 3.25rem 1.25rem;
	}

	.lp-section--muted {
		max-width: none;
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 70%, var(--bg, #edf2f8));
		border-block: 1px solid var(--lp-hair);
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
		padding-top: 3.25rem;
	}

	.lp-section--muted > .lp-tags-wrap {
		padding-bottom: 3.25rem;
	}

	.lp-h2 {
		margin: 0 0 0.65rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.7vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}

	.lp-h2--on-dark {
		color: #fff;
	}

	.lp-gallery {
		overflow-x: auto;
		padding-bottom: 2.75rem;
		scrollbar-width: thin;
	}

	.lp-split {
		display: grid;
		gap: 2.25rem;
		align-items: center;
	}

	@media (min-width: 900px) {
		.lp-split {
			grid-template-columns: 1fr 1fr;
		}
	}

	.lp-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.lp-list li {
		position: relative;
		padding: 0.55rem 0.75rem 0.55rem 1.35rem;
		font-size: 0.92rem;
		border-radius: 10px;
		border: 1px solid transparent;
		background: color-mix(in srgb, var(--card, #fff) 55%, transparent);
		transition:
			border-color 0.25s ease,
			transform 0.25s var(--lp-ease);
	}

	.lp-list li:hover {
		border-color: var(--lp-line);
		transform: translateX(2px);
	}

	.lp-list li::before {
		content: '';
		position: absolute;
		left: 0.55rem;
		top: 50%;
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: var(--navy, #004c8b);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--navy, #004c8b) 14%, transparent);
		transform: translateY(-50%);
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
		font-size: 1.02rem;
	}

	.lp-blob-copy span {
		font-size: 0.84rem;
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
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
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
		padding: 4rem 1.25rem;
		background:
			radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, #c9a227 18%, transparent), transparent),
			linear-gradient(155deg, #012a50, var(--navy, #004c8b) 55%, #0a3d6b);
		color: rgba(255, 255, 255, 0.9);
	}

	.lp-cta__inner {
		max-width: 580px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.lp-cta__line {
		width: 48px;
		height: 2px;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, #e8c547, transparent);
	}

	.lp-cta p {
		margin: 0;
		line-height: 1.6;
		max-width: 30rem;
		opacity: 0.9;
	}

	.lp-foot {
		border-top: 1px solid var(--lp-hair);
		background: var(--card, #fff);
	}

	.lp-foot__inner {
		max-width: 1120px;
		margin: 0 auto;
		padding: 1.15rem 1.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
	}

	.lp-foot p {
		margin: 0;
		flex: 1;
		font-size: 0.78rem;
		color: var(--slate, #5c6b7d);
	}

	.lp-foot__links {
		display: flex;
		gap: 1rem;
	}

	.lp-foot__links a {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}

	/* ── Scroll reveal — MotioDesign soft physics ── */
	:global([data-reveal]) {
		opacity: 0;
		transform: translate3d(0, 18px, 0) scale(0.992);
		filter: blur(1.5px);
		transition:
			opacity 0.75s var(--lp-ease),
			transform 0.85s var(--lp-ease),
			filter 0.7s var(--lp-ease);
		transition-delay: var(--d, 0ms);
		will-change: opacity, transform;
	}

	:global([data-reveal].is-in) {
		opacity: 1;
		transform: translate3d(0, 0, 0) scale(1);
		filter: blur(0);
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-reveal]) {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
		.lp-hero__shine,
		.lp-hero__float {
			animation: none;
		}
		.lp-progress {
			display: none;
		}
		.lp-btn:hover {
			transform: none;
		}
	}
</style>
