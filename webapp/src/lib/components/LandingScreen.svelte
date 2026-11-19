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

<!-- STYLE_AND_MARKUP_CONTINUES_FROM_ARTIFACTS -->
