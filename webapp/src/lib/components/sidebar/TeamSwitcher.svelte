<script lang="ts">
	import type { Team } from './data';
	import SidebarIcons from './SidebarIcons.svelte';

	interface Props {
		teams: Team[];
		collapsed?: boolean;
	}

	let { teams, collapsed = false }: Props = $props();
	let open = $state(false);
	let active = $state(0);
	const current = $derived(teams[active] ?? teams[0]);

	function select(i: number) {
		active = i;
		open = false;
	}
</script>

<div class="ts" data-collapsed={collapsed || undefined}>
	<button type="button" class="ts-trigger" aria-expanded={open} aria-haspopup="listbox" onclick={() => (open = !open)}>
		<span class="ts-logo" aria-hidden="true">{current?.logo ?? 'WH'}</span>
		{#if !collapsed}
			<span class="ts-meta">
				<span class="ts-name">{current?.name}</span>
				<span class="ts-plan">{current?.plan}</span>
			</span>
			<span class="ts-chev"><SidebarIcons name="chevrons" size={14} /></span>
		{/if}
	</button>

	{#if open && !collapsed}
		<ul class="ts-menu" role="listbox">
			{#each teams as team, i}
				<li role="option" aria-selected={i === active}>
					<button type="button" class="ts-opt" data-on={i === active || undefined} onclick={() => select(i)}>
						<span class="ts-logo ts-logo--sm">{team.logo}</span>
						<span class="ts-opt__text">
							<span class="ts-name">{team.name}</span>
							<span class="ts-plan">{team.plan}</span>
						</span>
					</button>
				</li>
			{/each}
			<li>
				<button type="button" class="ts-opt ts-opt--muted" onclick={() => (open = false)}>
					<span class="ts-logo ts-logo--sm ts-logo--ghost"><SidebarIcons name="plus" size={12} /></span>
					<span class="ts-name">Añadir almacén</span>
				</button>
			</li>
		</ul>
	{/if}
</div>

<style>
	.ts { position: relative; padding: 0.35rem; }
	.ts-trigger {
		display: flex; align-items: center; gap: 0.55rem; width: 100%;
		padding: 0.45rem 0.5rem; border: 1px solid transparent; border-radius: 10px;
		background: transparent; color: inherit; cursor: pointer; text-align: left; font: inherit;
		transition: background 0.18s ease, border-color 0.18s ease;
	}
	.ts-trigger:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		border-color: color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
	}
	.ts-logo {
		display: inline-flex; align-items: center; justify-content: center;
		width: 2rem; height: 2rem; border-radius: 8px;
		background: linear-gradient(145deg, var(--navy, #004c8b), #012a50);
		color: #fff; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700; font-size: 0.68rem; letter-spacing: 0.04em; flex-shrink: 0;
	}
	.ts-logo--sm { width: 1.65rem; height: 1.65rem; font-size: 0.6rem; }
	.ts-logo--ghost {
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 90%, transparent);
		color: var(--slate, #5c6b7d);
		border: 1px dashed color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.ts-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.15; }
	.ts-name {
		font-weight: 650; font-size: 0.8125rem; color: var(--head-ink, #012a50);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.ts-plan { font-size: 0.65rem; color: var(--slate, #5c6b7d); }
	.ts-chev { color: var(--slate, #5c6b7d); opacity: 0.7; flex-shrink: 0; }
	.ts-menu {
		position: absolute; left: 0.35rem; right: 0.35rem; top: calc(100% + 4px); z-index: 30;
		margin: 0; padding: 0.35rem; list-style: none; border-radius: 12px;
		background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
		animation: ts-in 0.22s cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes ts-in {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.ts-opt {
		display: flex; align-items: center; gap: 0.5rem; width: 100%;
		padding: 0.45rem 0.5rem; border: 0; border-radius: 8px; background: transparent;
		cursor: pointer; font: inherit; text-align: left; color: inherit;
	}
	.ts-opt:hover { background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent); }
	.ts-opt[data-on] { background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent); }
	.ts-opt__text { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
	.ts-opt--muted .ts-name { color: var(--slate, #5c6b7d); font-weight: 550; }
	.ts[data-collapsed] .ts-trigger { justify-content: center; padding: 0.4rem; }
	@media (prefers-reduced-motion: reduce) { .ts-menu { animation: none; } }
</style>
