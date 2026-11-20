<script lang="ts">
	import type { Project } from './data';
	import SidebarIcons from './SidebarIcons.svelte';

	interface Props {
		projects: Project[];
		collapsed?: boolean;
		pathname?: string;
	}

	let { projects, collapsed = false, pathname = '/' }: Props = $props();
</script>

<div class="np" data-collapsed={collapsed || undefined}>
	{#if !collapsed}
		<div class="np-head">
			<span class="np-title">En curso</span>
			<button type="button" class="np-add" title="Nuevo" aria-label="Añadir">
				<SidebarIcons name="plus" size={14} />
			</button>
		</div>
	{/if}
	<ul class="np-list">
		{#each projects as p}
			<li>
				<a
					href={p.url}
					class="np-link"
					title={collapsed ? p.name : undefined}
					data-active={pathname.startsWith(p.url) || undefined}
				>
					<span class="np-icon"><SidebarIcons name={p.icon} size={15} /></span>
					{#if !collapsed}
						<span class="np-label">{p.name}</span>
						<span class="np-more"><SidebarIcons name="more" size={14} /></span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.np {
		padding: 0.5rem 0.4rem 0.35rem;
		border-top: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
		margin-top: 0.35rem;
	}
	.np-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.15rem 0.45rem 0.4rem;
	}
	.np-title {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}
	.np-add {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.4rem;
		height: 1.4rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--slate, #5c6b7d);
		cursor: pointer;
	}
	.np-add:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, transparent);
		color: var(--navy, #004c8b);
	}
	.np-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.np-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		border-radius: 8px;
		text-decoration: none;
		color: var(--slate, #5c6b7d);
		font-size: 0.78rem;
		font-weight: 550;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.np-link:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		color: var(--head-ink, #012a50);
	}
	.np-link[data-active] {
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
		color: var(--navy, #004c8b);
	}
	.np-icon {
		display: inline-flex;
		flex-shrink: 0;
		opacity: 0.85;
	}
	.np-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.np-more {
		opacity: 0;
		color: var(--slate, #5c6b7d);
		transition: opacity 0.15s ease;
	}
	.np-link:hover .np-more {
		opacity: 0.7;
	}
	.np[data-collapsed] .np-link {
		justify-content: center;
		padding: 0.5rem;
	}
</style>
