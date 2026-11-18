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
		{
			id: 'task-widget',
			name: 'TaskWidget',
			status: 'ready',
			href: '/lab/task-widget',
			description: 'Tarjeta expandible de tarea con progreso, subtasks, priority/status y assignees.'
		},
		{
			id: 'hover-expand',
			name: 'HoverExpand',
			status: 'ready',
			href: '/lab/hover-expand',
			description: 'Franja de imágenes: el panel activo se ensancha al hover o click (CSS, sin Framer).'
		},
		{
			id: 'onboarding',
			name: 'OnboardingScreen',
			status: 'ready',
			href: '/lab/onboarding',
			description: 'Card multi-paso de alta de negocio/workspace con progress y preview panel.'
		}
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
		<a class="lab-card" href={c.href}>
			<div class="lab-card__top">
				<span class="lab-card__name">{c.name}</span>
				<span class="lab-card__status" data-status={c.status}>{c.status}</span>
			</div>
			<p class="lab-card__desc">{c.description}</p>
		</a>
	{/each}
</section>

<section class="lab-preview">
	<div class="lab-preview__head">
		<h2>TaskWidget</h2>
		<a href="/lab/task-widget">Ver detalle →</a>
	</div>
	<div class="lab-preview__stage">
		<TaskWidget data={MOCK_TASK} />
	</div>
</section>

<section class="lab-preview">
	<div class="lab-preview__head">
		<h2>HoverExpand</h2>
		<a href="/lab/hover-expand">Ver detalle →</a>
	</div>
	<div class="lab-preview__stage lab-preview__stage--scroll">
		<HoverExpand images={DEMO_IMAGES} />
	</div>
</section>

<style>
	.lab-intro { margin-bottom: 2rem; }
	.lab-kicker {
		margin: 0 0 0.35rem; font-size: 0.72rem; font-weight: 600;
		letter-spacing: 0.12em; text-transform: uppercase; color: var(--navy, #004c8b);
	}
	.lab-title {
		margin: 0 0 0.5rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.6rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}
	.lab-lead {
		margin: 0; max-width: 42rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}
	.lab-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 0.85rem; margin-bottom: 2.5rem;
	}
	.lab-card {
		display: block; padding: 1rem 1.1rem; border-radius: var(--radius-card, 16px);
		border: 1.5px solid var(--line, #d9e2ec); background: var(--card, #fff);
		box-shadow: var(--shadow-1); text-decoration: none; color: inherit;
		transition: box-shadow 160ms ease, border-color 160ms ease;
	}
	.lab-card:hover {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 35%, var(--line));
		box-shadow: var(--shadow-2);
	}
	.lab-card__top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
	.lab-card__name {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif); font-weight: 600;
		font-size: 1rem; color: var(--head-ink, #012a50);
	}
	.lab-card__status {
		font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
		padding: 0.2rem 0.45rem; border-radius: 6px;
		background: var(--success-bg, #eaf5ee); color: var(--success, #1e7a46);
	}
	.lab-card__desc { margin: 0; font-size: 0.8125rem; line-height: 1.45; color: var(--slate, #5c6b7d); }
	.lab-preview {
		border-radius: var(--radius-card, 22px); border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff); padding: 1.25rem; box-shadow: var(--shadow-1); margin-bottom: 1.5rem;
	}
	.lab-preview__head {
		display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.25rem;
	}
	.lab-preview__head h2 {
		margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.1rem; font-weight: 600; color: var(--head-ink, #012a50);
	}
	.lab-preview__head a { font-size: 0.8125rem; font-weight: 500; color: var(--link, #004c8b); text-decoration: none; }
	.lab-preview__head a:hover { text-decoration: underline; }
	.lab-preview__stage {
		display: flex; justify-content: center; padding: 1.5rem 0.5rem 1rem;
		background: var(--surface-2, #f5f8fc); border-radius: 16px; border: 1px solid var(--line-soft, #e4eaf1);
	}
	.lab-preview__stage--scroll {
		overflow-x: auto; justify-content: flex-start; padding-block: 2rem;
	}
</style>
