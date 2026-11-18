<script lang="ts">
	/**
	 * Lab detail — TaskWidget
	 * Estados: colapsado / expandido + datos de ejemplo.
	 */
	import TaskWidget from '../../../lib/components/TaskWidget.svelte';
	import type { Subtask, TaskData } from '../../../lib/components/taskWidget.types';

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

	const EMPTY_PROGRESS: TaskData = {
		...MOCK_TASK,
		title: 'Receiving wave',
		progress: 0,
		completedCount: 0,
		totalCount: 3,
		priority: 'Normal',
		status: 'Pending',
		subtasks: [
			{ id: 'a', title: 'Scan ASN', completed: false },
			{ id: 'b', title: 'Validate lines', completed: false },
			{ id: 'c', title: 'Post to inventory', completed: false }
		],
		assignees: [{ name: 'Chloe', avatar: 'https://i.pravatar.cc/150?u=chloe' }]
	};

	const DONE_TASK: TaskData = {
		...MOCK_TASK,
		title: 'Cycle count A-12',
		progress: 100,
		completedCount: 4,
		totalCount: 4,
		priority: 'Low',
		status: 'Done',
		subtasks: MOCK_TASK.subtasks.map((s: Subtask) => ({ ...s, completed: true })),
		assignees: [
			{ name: 'Anna', avatar: 'https://i.pravatar.cc/150?u=anna' },
			{ name: 'Ramesh', avatar: 'https://i.pravatar.cc/150?u=ramesh' }
		]
	};
</script>

<svelte:head>
	<title>TaskWidget · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">TaskWidget</h1>
	<p class="detail-lead">
		Tarjeta expandible de tarea / progreso. Migrado desde React (motion + icon packs) a Svelte 5
		con tokens Abellis. Click o Enter/Space para expandir/colapsar.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Default (colapsado)</h2>
	<div class="detail-stage">
		<TaskWidget data={MOCK_TASK} />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Inicialmente abierto</h2>
	<div class="detail-stage">
		<TaskWidget data={MOCK_TASK} initiallyOpen />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Variantes de datos</h2>
	<div class="detail-row">
		<div class="detail-stage detail-stage--compact">
			<p class="detail-caption">0% · Pending</p>
			<TaskWidget data={EMPTY_PROGRESS} />
		</div>
		<div class="detail-stage detail-stage--compact">
			<p class="detail-caption">100% · Done</p>
			<TaskWidget data={DONE_TASK} />
		</div>
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 2rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 40rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-block {
		margin-bottom: 2rem;
	}

	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.detail-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem 1rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	.detail-stage--compact {
		flex: 1;
		min-width: 0;
	}

	.detail-caption {
		margin: 0;
		align-self: flex-start;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted, #7e8b9b);
	}

	.detail-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 720px) {
		.detail-row {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
