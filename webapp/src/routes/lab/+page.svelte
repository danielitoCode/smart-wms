<script lang="ts">
	/**
	 * Component Lab — overview de componentes migrados React → Svelte.
	 */
	import TaskWidget from '../../lib/components/TaskWidget.svelte';
	import type { TaskData } from '../../lib/components/taskWidget.types';
	import HoverExpand from '../../lib/components/HoverExpand.svelte';
	import type { HoverExpandImage } from '../../lib/components/hoverExpand.types';

	const MOCK_TASK: TaskData = {
		title: 'Design System',
		progress: 75,
		completedCount: 3,
		totalCount: 4,
		priority: 'Urgent',
		status: 'In Progress',
		subtasks: [
			{ id: '1', title: 'Design Tokens', completed: true },
			{ id: '2', title: 'Color System', completed: true },
			{ id: '3', title: 'Type System', completed: true },
			{ id: '4', title: 'Documentation', completed: false }
		],
		assignees: [
			{ name: 'Chloe', avatar: 'https://i.pravatar.cc/150?u=chloe' },
			{ name: 'Anna', avatar: 'https://i.pravatar.cc/150?u=anna' },
			{ name: 'Ramesh', avatar: 'https://i.pravatar.cc/150?u=ramesh' }
		]
	};

	const DEMO_IMAGES: HoverExpandImage[] = [
		{ src: 'https://picsum.photos/seed/he01/600/900', alt: 'Panel 1', code: '# 01' },
		{ src: 'https://picsum.photos/seed/he02/600/900', alt: 'Panel 2', code: '# 23' },
		{ src: 'https://picsum.photos/seed/he03/600/900', alt: 'Panel 3', code: '# 07' },
		{ src: 'https://picsum.photos/seed/he04/600/900', alt: 'Panel 4', code: '# 12' },
		{ src: 'https://picsum.photos/seed/he05/600/900', alt: 'Panel 5', code: '# 18' },
		{ src: 'https://picsum.photos/seed/he06/600/900', alt: 'Panel 6', code: '# 04' }
	];

	const components = [
		{ id: 'task-widget', name: 'TaskWidget', status: 'ready', href: '/lab/task-widget', description: 'Tarjeta expandible de tarea con progreso, subtasks, priority/status y assignees.' },
		{ id: 'hover-expand', name: 'HoverExpand', status: 'ready', href: '/lab/hover-expand', description: 'Franja de imágenes: el panel activo se ensancha al hover o click (CSS, sin Framer).' },
		{ id: 'onboarding', name: 'OnboardingScreen', status: 'ready', href: '/lab/onboarding', description: 'Card multi-paso de alta de negocio/workspace con progress y preview panel.' },
		{ id: 'form-two-column', name: 'FormTwoColumn', status: 'ready', href: '/lab/form-two-column', description: 'Formulario de contacto marketing a dos columnas (copy + card).' },
		{ id: 'product-detail', name: 'ProductDetail', status: 'ready', href: '/lab/product-detail', description: 'PDP: galería, info sticky, opciones glaze/finish, cantidad y acordeones.' },
		{ id: 'order-detail', name: 'OrderDetail', status: 'ready', href: '/lab/order-detail', description: 'Detalle de pedido: items, invoice, timeline y panel lateral.' },
		{ id: 'blob-card', name: 'BlobCard', status: 'ready', href: '/lab/blob-card', description: 'Card con blob orgánico que sigue el cursor (lerp + rAF, sin GSAP).' },
		{ id: 'testimonial', name: 'PremiumTestimonial', status: 'ready', href: '/lab/testimonial', description: 'Carrusel de testimonios con autoplay, dots y stats (CSS, sin Framer).' },
		{ id: 'byobu', name: 'ByobuCarousel', status: 'ready', href: '/lab/byobu', description: 'Carrusel 3D tipo biombo: paneles plegados, drag e inercia (RAF).' },
		{ id: 'disperse', name: 'DisperseCarousel', status: 'ready', href: '/lab/disperse', description: 'Carrusel con salida en fragmentos (WAAPI) y entrada suave (sin GSAP).' },
		{ id: 'sticky-cards', name: 'StickyCardStack', status: 'ready', href: '/lab/sticky-cards', description: 'Stack sticky de cards que escalan con el scroll (sin Framer/Lenis).' },
		{ id: 'inline-table', name: 'InlineTableControl', status: 'ready', href: '/lab/inline-table', description: 'Tabla de gastos con edición inline por fila (CSS, sin Motion).' },
		{ id: 'view-on-map', name: 'ViewOnMap', status: 'ready', href: '/lab/view-on-map', description: 'Pill que se expande a mapa embebido (CSS, sin Motion).' },
		{ id: 'option-picker', name: 'OptionPicker', status: 'ready', href: '/lab/option-picker', description: 'Selector Private/Public compacto con menú emergente (CSS, sin Motion).' },
		{ id: 'shared-tooltip', name: 'SharedTooltipAvatars', status: 'ready', href: '/lab/shared-tooltip', description: 'Stack de avatares con tooltip flotante compartido (CSS, sin Framer).' },
		{ id: 'tags', name: 'Tags', status: 'ready', href: '/lab/tags', description: 'Multi-select de chips pool → seleccionados (CSS, sin Motion).' },
		{ id: 'popover-form', name: 'PopoverForm', status: 'ready', href: '/lab/popover-form', description: 'Panel flotante con idle/loading/success, cutouts y ejemplos feedback/contacto/tema.' },
		{ id: 'sidebar', name: 'AppSidebar', status: 'ready', href: '/lab/sidebar', description: 'Shell colapsable a iconos: almacén, nav grupos, en curso y usuario (shadcn-style).' },
		{ id: 'about3', name: 'About3', status: 'ready', href: '/lab/about3', description: 'Bloque About: grid de imágenes, breakout, marquee de logos, logros y secciones de visión.' },
		{ id: 'stacked-bars', name: 'StackedBars', status: 'ready', href: '/lab/stacked-bars', description: 'Barras apiladas con scrub/tooltip y categorías WMS (día/semana).' },
		{ id: 'cutout-card', name: 'CutoutCard', status: 'ready', href: '/lab/cutout-card', description: 'Card con media, cutout corners, pin, stagger CSS y acción flotante.' },
		{ id: 'toast', name: 'Toast', status: 'ready', href: '/lab/toast', description: 'Toasts squircle con iconos animados y API success/error/promise (tipo Sonner).' },
		{ id: 'animated-beam', name: 'AnimatedBeam', status: 'ready', href: '/lab/animated-beam', description: 'Haz SVG animado entre nodos (gradiente SMIL, curvatura configurable).' },
		{ id: 'bento-eight', name: 'BentoEight', status: 'ready', href: '/lab/bento-eight', description: 'Grid bento 8 celdas: ticker, counter, typing, barras y skeletons (Animata Eight).' },
		{ id: 'terminal', name: 'Terminal', status: 'ready', href: '/lab/terminal', description: 'Terminal secuencial con typing y spans (CLI demo Smart WMS).' },
		{ id: 'globe', name: 'Globe', status: 'ready', href: '/lab/globe', description: 'Globo WebGL (cobe) con drag, spring e inercia; marcadores de hubs.' },
		{ id: 'tweet-card', name: 'TweetCard', status: 'ready', href: '/lab/tweet-card', description: 'Tarjeta de post X: header, entidades, media y skeleton (syndication + demo).' },
		{ id: 'dotted-map', name: 'DottedMap', status: 'ready', href: '/lab/dotted-map', description: 'Mapa mundial de puntos SVG con markers pulse (svg-dotted-map).' },
		{ id: 'iphone', name: 'Iphone', status: 'ready', href: '/lab/iphone', description: 'Marco SVG de iPhone con pantalla img/video y dynamic island.' },
		{ id: 'android', name: 'Android', status: 'ready', href: '/lab/android', description: 'Marco SVG de teléfono Android con cámara, botones y media.' },
		{ id: 'interactive-grid', name: 'InteractiveGridPattern', status: 'ready', href: '/lab/interactive-grid', description: 'Rejilla SVG interactiva: celdas con hover fill (fade-in rápido / fade-out lento).' },
		{ id: 'pixel-image', name: 'PixelImage', status: 'ready', href: '/lab/pixel-image', description: 'Imagen que se revela por celdas (clip-path) con delays y paso grayscale → color.' },
		{ id: 'warp-background', name: 'WarpBackground', status: 'ready', href: '/lab/warp-background', description: 'Caja 3D con rejilla y beams de color en las caras (CSS, sin Motion).' },
		{ id: 'backlight', name: 'Backlight', status: 'ready', href: '/lab/backlight', description: 'Glow SVG: blur + saturación detrás del contenido (feGaussianBlur).' },
		{ id: 'get-started-button', name: 'GetStartedButton', status: 'ready', href: '/lab/get-started-button', description: 'CTA amber/orange con flecha deslizante al hover.' },
		{ id: 'status-button', name: 'StatusButton', status: 'ready', href: '/lab/status-button', description: 'CTA teal: idle → loading spinner → success check → idle.' },
		{ id: 'card-stack', name: 'CardStack', status: 'ready', href: '/lab/card-stack', description: 'Pila de cards con peek, throw-out, press y autoplay (CSS, reduced-motion).' },
		{ id: 'collab-card', name: 'CollabCard', status: 'ready', href: '/lab/collab-card', description: 'Card multiplayer: presence, live ping y cursores animados (CSS @container).' },
		{ id: 'swap-text', name: 'SwapText', status: 'ready', href: '/lab/swap-text', description: 'Texto que intercambia capa al hover (card + standalone click).' },
		{ id: 'speed-dial', name: 'SpeedDial', status: 'ready', href: '/lab/speed-dial', description: 'FAB + acciones staggered (up/down/left/right), teclado y click-outside.' },
		{ id: 'transaction-list', name: 'TransactionList', status: 'ready', href: '/lab/transaction-list', description: 'Lista de transacciones con detalle (tarjeta, fecha) y transición CSS.' },
		{ id: 'stacked-sections', name: 'StackedSections', status: 'ready', href: '/lab/stacked-sections', description: 'Paneles sticky apilados con drama scale al pin (sin Lenis/Motion).' },
		{ id: 'stacked-sections-demo', name: 'StackedSections Demo', status: 'ready', href: '/lab/stacked-sections-demo', description: 'Release notes: 4 capítulos light/dark (tools, cycles, inbox, CTA).' },
		{ id: 'delivery-card', name: 'DeliveryCard', status: 'ready', href: '/lab/delivery-card', description: 'Tracking: ETA, barra con camión, estado y ubicación (simulateProgress).' },
		{ id: 'aperture-reveal', name: 'ApertureReveal', status: 'ready', href: '/lab/aperture-reveal', description: 'Scroll sticky: diafragma circular abre la imagen (Lead + Opening + Trail, caption, hint).' },
		{ id: 'cinema-row', name: 'CinemaRow', status: 'ready', href: '/lab/cinema-row', description: 'Hero WaveReveal + premieres Marquee + stills verticales (reduced-motion).' },
		{ id: 'animated-counter', name: 'AnimatedCounter', status: 'ready', href: '/lab/animated-counter', description: 'Rueda de dígitos con spring CSS, separators western/indian, prefix/suffix.' },
		{ id: 'grid-reveal', name: 'GridReveal', status: 'ready', href: '/lab/grid-reveal', description: 'Revelado BSP en canvas: celdas se separan, colorean y entregan la foto.' },
		{ id: 'delete-button', name: 'DeleteButton', status: 'ready', href: '/lab/delete-button', description: 'Papelera expandible: confirmar / cancelar, tapa animada y check stroke.' },
		{ id: 'magic-bento', name: 'MagicBento', status: 'ready', href: '/lab/magic-bento', description: 'Bento WMS: throughput, ocupación, cycle count, wave pipeline, conectores y roles.' },
		{ id: 'flowing-menu', name: 'FlowingMenu', status: 'ready', href: '/lab/flowing-menu', description: 'Menú ops WMS con band marquee spring, magnet al cursor e intro staggered.' },
		{ id: 'true-focus', name: 'TrueFocus', status: 'ready', href: '/lab/true-focus', description: 'Foco animado sobre palabras: brackets, box, underline, highlight (WAAPI).' },
		{ id: 'branched-menu', name: 'BranchedMenu', status: 'ready', href: '/lab/branched-menu', description: 'Árbol nav WMS con ramas SVG, fold animado y trazo de acento al seleccionar.' },
		{ id: 'bell-toggle', name: 'BellToggle', status: 'ready', href: '/lab/bell-toggle', description: 'Toggle notificaciones: ring WAAPI, badge, waves y labels WMS.' }
	] as const;
</script>

<svelte:head>
	<title>Component Lab · Smart WMS</title>
</svelte:head>

<section class="lab-intro">
	<p class="lab-kicker">Migración UI</p>
	<h1 class="lab-title">Component Lab</h1>
	<p class="lab-lead">
		Previsualización de componentes migrados de React a Svelte 5, anclados a los tokens Abellis.
		Sin shell de app ni autenticación.
	</p>
</section>

<section class="lab-grid">
	{#each components as c}
		<a class="lab-card" href={c.href} data-status={c.status}>
			<span class="lab-card__name">{c.name}</span>
			<span class="lab-card__status">{c.status}</span>
			<p class="lab-card__desc">{c.description}</p>
		</a>
	{/each}
</section>

<style>
	.lab-intro { margin-bottom: 1.75rem; }
	.lab-kicker {
		margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700;
		letter-spacing: 0.12em; text-transform: uppercase; color: var(--navy, #004c8b);
	}
	.lab-title {
		margin: 0 0 0.5rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.lab-lead { margin: 0; max-width: 36rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d); }
	.lab-grid {
		display: grid; gap: 0.85rem;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
	}
	.lab-card {
		display: flex; flex-direction: column; gap: 0.35rem; padding: 1rem 1.1rem;
		border-radius: 12px; border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 88%, transparent);
		text-decoration: none; color: inherit;
		transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
	}
	.lab-card:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
		transform: translateY(-1px);
	}
	.lab-card__name {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700; font-size: 0.95rem; color: var(--head-ink, #012a50);
	}
	.lab-card__status {
		width: fit-content; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em;
		text-transform: uppercase; padding: 0.15rem 0.45rem; border-radius: 999px;
		background: color-mix(in srgb, #16a34a 12%, transparent); color: #15803d;
	}
	.lab-card__desc { margin: 0.15rem 0 0; font-size: 0.8rem; line-height: 1.45; color: var(--slate, #5c6b7d); }
</style>
