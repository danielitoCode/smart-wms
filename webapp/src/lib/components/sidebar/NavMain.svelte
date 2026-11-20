<script lang="ts">
	import type { NavItem } from './data';
	import SidebarIcons from './SidebarIcons.svelte';

	interface Props {
		items: NavItem[];
		collapsed?: boolean;
		pathname?: string;
	}

	let { items, collapsed = false, pathname = '/' }: Props = $props();

	let openKeys = $state<Record<string, boolean>>({});

	function isOpen(title: string, item: NavItem) {
		if (openKeys[title] !== undefined) return openKeys[title];
		return Boolean(item.isActive || item.items?.some((s) => pathname.startsWith(s.url)));
	}

	function toggle(title: string, item: NavItem) {
		const next = !isOpen(title, item);
		openKeys = { ...openKeys, [title]: next };
	}
</script>

<nav class="nm" data-collapsed={collapsed || undefined} aria-label="Principal">
	{#each items as item}
		{@const open = isOpen(item.title, item)}
		<div class="nm-group">
			<button
				type="button"
				class="nm-parent"
				data-open={open || undefined}
				aria-expanded={open}
				title={collapsed ? item.title : undefined}
				onclick={() => toggle(item.title, item)}
			>
				<span class="nm-icon"><SidebarIcons name={item.icon} size={16} /></span>
				{#if !collapsed}
					<span class="nm-label">{item.title}</span>
					<span class="nm-chev" class:nm-chev--open={open}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</span>
				{/if}
			</button>

			{#if open && item.items && !collapsed}
				<ul class="nm-sub">
					{#each item.items as sub}
						<li>
							<a
								href={sub.url}
								class="nm-link"
								data-active={pathname.startsWith(sub.url) || undefined}
							>
								{sub.title}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</nav>

<style>
	.nm {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.25rem 0.4rem;
	}
	.nm-parent {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		padding: 0.45rem 0.55rem;
		border: 0;
		border-radius: 9px;
		background: transparent;
		color: var(--slate, #5c6b7d);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.nm-parent:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		color: var(--head-ink, #012a50);
	}
	.nm-parent[data-open] {
		color: var(--head-ink, #012a50);
	}
	.nm-icon {
		display: inline-flex;
		flex-shrink: 0;
		opacity: 0.9;
	}
	.nm-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.nm-chev {
		display: inline-flex;
		opacity: 0.55;
		transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.nm-chev--open {
		transform: rotate(90deg);
	}
	.nm-sub {
		margin: 0.1rem 0 0.35rem;
		padding: 0 0 0 1.85rem;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}
	.nm-link {
		display: block;
		padding: 0.35rem 0.55rem;
		border-radius: 7px;
		font-size: 0.78rem;
		font-weight: 550;
		color: var(--slate, #5c6b7d);
		text-decoration: none;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.nm-link:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 6%, transparent);
		color: var(--head-ink, #012a50);
	}
	.nm-link[data-active] {
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
		color: var(--navy, #004c8b);
		font-weight: 650;
	}
	.nm[data-collapsed] .nm-parent {
		justify-content: center;
		padding: 0.55rem;
	}
	.nm[data-collapsed] .nm-parent:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
	}
</style>
