<script lang="ts">
	/**
	 * TaskWidget — tarjeta expandible de tarea / progreso.
	 * Migrado desde React a Svelte 5. Tokens Abellis.
	 */
	export interface Subtask { id: string; title: string; completed: boolean; }
	export interface Assignee { name: string; avatar: string; color?: string; }
	export interface TaskData {
		title: string; progress: number; completedCount: number; totalCount: number;
		priority: string; status: string; subtasks: Subtask[]; assignees: Assignee[];
	}
	interface Props { data: TaskData; initiallyOpen?: boolean; class?: string; }
	let { data, initiallyOpen = false, class: className = '' }: Props = $props();
	let isOpen = $state(initiallyOpen);
	function toggle() { isOpen = !isOpen; }
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
	}
	const progressPct = $derived(Math.max(0, Math.min(100, data.progress)));
</script>

<article
	class="tw {className}"
	class:tw--open={isOpen}
	role="button"
	tabindex="0"
	aria-expanded={isOpen}
	onclick={toggle}
	onkeydown={onKeydown}
>
	<header class="tw__header">
		<div class="tw__title-group">
			<div class="tw__icon" aria-hidden="true">⚙</div>
			<h2 class="tw__title">{data.title}</h2>
		</div>
		{#if !isOpen}
			<div class="tw__progress-mini">
				<div class="tw__bar"><div class="tw__bar-fill" style="width: {progressPct}%"></div></div>
				<span class="tw__pct">{progressPct}%</span>
			</div>
		{:else}
			<span class="tw__more" aria-hidden="true">···</span>
		{/if}
	</header>

	{#if !isOpen}
		<div class="tw__meta-row">
			<div class="tw__meta-items">
				<span>{data.priority}</span>
				<span>{data.status}</span>
			</div>
			<div class="tw__avatars">
				{#each data.assignees as user (user.name)}
					<img class="tw__avatar" src={user.avatar} alt={user.name} title={user.name} />
				{/each}
			</div>
		</div>
	{/if}

	{#if isOpen}
		<div class="tw__body">
			<div class="tw__progress-pill">
				<span>{data.completedCount} of {data.totalCount}</span>
				<div class="tw__bar"><div class="tw__bar-fill" style="width: {progressPct}%"></div></div>
				<span class="tw__pct">{progressPct}%</span>
			</div>
			<ul class="tw__subtasks">
				{#each data.subtasks as task (task.id)}
					<li class:done={task.completed}>
						<span class="tw__check">{task.completed ? '✓' : ''}</span>
						{task.title}
					</li>
				{/each}
			</ul>
			<div class="tw__fields">
				<div class="tw__field">
					<span>Priority</span>
					<span class="tw__badge tw__badge--danger">{data.priority}</span>
				</div>
				<div class="tw__field">
					<span>Status</span>
					<span class="tw__badge tw__badge--warning">{data.status}</span>
				</div>
			</div>
			<div class="tw__assignees">
				{#each data.assignees as user (user.name)}
					<div class="tw__chip">
						<img class="tw__avatar" src={user.avatar} alt="" />
						<span>{user.name}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</article>

<style>
	.tw {
		width: 100%; max-width: 440px; cursor: pointer; user-select: none;
		border: 1.5px solid var(--line, #d9e2ec); border-radius: 16px;
		background: var(--card, #fff); box-shadow: var(--shadow-2, 0 6px 18px rgba(16,38,64,.09));
		padding: 12px; color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
		transition: padding 200ms ease, border-radius 200ms ease;
	}
	.tw--open { border-radius: 22px; padding: 22px; }
	.tw:focus-visible { outline: none; box-shadow: var(--focus, 0 0 0 3px rgba(233,165,11,.38)); }
	.tw__header { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
	.tw__title-group { display: flex; align-items: center; gap: .5rem; min-width: 0; }
	.tw__icon {
		width: 28px; height: 28px; border-radius: 10px; border: 1.5px solid var(--line, #d9e2ec);
		display: grid; place-items: center; color: var(--muted, #7e8b9b); font-size: 14px;
	}
	.tw--open .tw__icon { width: 44px; height: 44px; font-size: 20px; }
	.tw__title {
		margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 600; font-size: .8125rem; color: var(--head-ink, #012a50);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.tw--open .tw__title { font-size: clamp(1.15rem, 2.4vw, 1.65rem); white-space: normal; }
	.tw__progress-mini { display: flex; align-items: center; gap: .6rem; }
	.tw__bar {
		height: 8px; width: 72px; border-radius: 999px; background: var(--surface-3, #e7eef6); overflow: hidden;
	}
	.tw__bar-fill { height: 100%; border-radius: inherit; background: var(--success, #1e7a46); transition: width 280ms ease; }
	.tw__pct { font-size: .72rem; font-weight: 600; color: var(--muted, #7e8b9b); }
	.tw__meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; gap: .75rem; }
	.tw__meta-items { display: flex; gap: 1rem; font-size: .72rem; font-weight: 500; color: var(--slate, #5c6b7d); }
	.tw__avatars { display: flex; }
	.tw__avatar {
		width: 28px; height: 28px; border-radius: 50%; object-fit: cover;
		border: 2px solid var(--card, #fff); margin-left: -8px; background: var(--surface-3, #e7eef6);
	}
	.tw__avatars .tw__avatar:first-child { margin-left: 0; }
	.tw__body { margin-top: 1.35rem; }
	.tw__progress-pill {
		display: inline-flex; align-items: center; gap: .5rem; padding: 6px 10px;
		border-radius: 999px; border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc); margin-bottom: 1.25rem;
		font-size: .8125rem; font-weight: 600; color: var(--muted, #7e8b9b);
	}
	.tw__progress-pill .tw__bar { width: 88px; }
	.tw__subtasks { list-style: none; margin: 0 0 1.25rem 0; padding: 0; display: flex; flex-direction: column; gap: .75rem; }
	.tw__subtasks li { display: flex; align-items: center; gap: .5rem; font-size: .9375rem; color: var(--slate, #5c6b7d); }
	.tw__subtasks li.done { color: var(--muted, #7e8b9b); }
	.tw__check {
		width: 20px; height: 20px; border-radius: 50%; border: 1.7px solid var(--line, #d9e2ec);
		display: grid; place-items: center; font-size: 11px; flex-shrink: 0;
	}
	.tw__subtasks li.done .tw__check {
		border-color: var(--ink, #132234); background: var(--ink, #132234); color: var(--card, #fff);
	}
	.tw__fields { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1rem; }
	.tw__field { display: flex; align-items: center; gap: 1rem; font-size: .8125rem; font-weight: 500; }
	.tw__badge { padding: .28rem .65rem; border-radius: 10px; font-weight: 700; }
	.tw__badge--danger { background: var(--danger-bg, #fdf0ef); color: var(--danger, #b3322b); }
	.tw__badge--warning { background: var(--warning-bg, #fff6df); color: var(--warning, #9a6a00); }
	.tw__assignees { display: flex; flex-wrap: wrap; gap: .5rem; }
	.tw__chip {
		display: inline-flex; align-items: center; gap: .45rem; padding: 4px 14px 4px 5px;
		border-radius: 999px; border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc); font-size: .8125rem; font-weight: 600; color: var(--slate, #5c6b7d);
	}
	.tw__chip .tw__avatar { width: 26px; height: 26px; margin: 0; border: none; }
	.tw__more { font-size: 1.25rem; color: var(--muted, #7e8b9b); letter-spacing: 2px; }
	@media (min-width: 480px) {
		.tw__bar { width: 110px; }
		.tw__pct, .tw__meta-items { font-size: .8125rem; }
		.tw__avatar { width: 32px; height: 32px; }
	}
</style>
