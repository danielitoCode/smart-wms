<script lang="ts">
	import type { SidebarUser } from './data';
	import SidebarIcons from './SidebarIcons.svelte';

	interface Props {
		user: SidebarUser;
		collapsed?: boolean;
	}

	let { user, collapsed = false }: Props = $props();
	let open = $state(false);
</script>

<div class="nu" data-collapsed={collapsed || undefined}>
	<button type="button" class="nu-trigger" aria-expanded={open} title={collapsed ? user.name : undefined} onclick={() => (open = !open)}>
		<img class="nu-avatar" src={user.avatar} alt="" width="32" height="32" />
		{#if !collapsed}
			<span class="nu-meta">
				<span class="nu-name">{user.name}</span>
				<span class="nu-email">{user.email}</span>
			</span>
			<span class="nu-chev"><SidebarIcons name="chevrons" size={14} /></span>
		{/if}
	</button>

	{#if open}
		<div class="nu-menu" role="menu">
			<button type="button" class="nu-item" role="menuitem" onclick={() => (open = false)}>
				<SidebarIcons name="user" size={14} /><span>Perfil</span>
			</button>
			<button type="button" class="nu-item" role="menuitem" onclick={() => (open = false)}>
				<SidebarIcons name="bell" size={14} /><span>Notificaciones</span>
			</button>
			<button type="button" class="nu-item" role="menuitem" onclick={() => (open = false)}>
				<SidebarIcons name="settings" size={14} /><span>Preferencias</span>
			</button>
			<hr class="nu-sep" />
			<button type="button" class="nu-item nu-item--danger" role="menuitem" onclick={() => (open = false)}>
				<SidebarIcons name="log-out" size={14} /><span>Cerrar sesión</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.nu { position: relative; padding: 0.35rem; }
	.nu-trigger {
		display: flex; align-items: center; gap: 0.55rem; width: 100%;
		padding: 0.4rem 0.45rem; border: 1px solid transparent; border-radius: 10px;
		background: transparent; cursor: pointer; font: inherit; text-align: left; color: inherit;
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.nu-trigger:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent);
		border-color: color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
	}
	.nu-avatar {
		width: 2rem; height: 2rem; border-radius: 999px; object-fit: cover; flex-shrink: 0;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.nu-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.15; }
	.nu-name {
		font-weight: 650; font-size: 0.8125rem; color: var(--head-ink, #012a50);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.nu-email {
		font-size: 0.65rem; color: var(--slate, #5c6b7d);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.nu-chev { color: var(--slate, #5c6b7d); opacity: 0.65; flex-shrink: 0; }
	.nu-menu {
		position: absolute; left: 0.35rem; right: 0.35rem; bottom: calc(100% + 6px); z-index: 30;
		padding: 0.35rem; border-radius: 12px; background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.12);
		animation: nu-in 0.22s cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}
	@keyframes nu-in {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.nu-item {
		display: flex; align-items: center; gap: 0.5rem; width: 100%;
		padding: 0.45rem 0.55rem; border: 0; border-radius: 8px; background: transparent;
		font: inherit; font-size: 0.8125rem; font-weight: 550; color: var(--ink, #132234);
		cursor: pointer; text-align: left;
	}
	.nu-item:hover { background: color-mix(in srgb, var(--navy, #004c8b) 7%, transparent); }
	.nu-item--danger { color: #b91c1c; }
	.nu-sep {
		border: 0; border-top: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		margin: 0.25rem 0.2rem;
	}
	.nu[data-collapsed] .nu-trigger { justify-content: center; padding: 0.35rem; }
	@media (prefers-reduced-motion: reduce) { .nu-menu { animation: none; } }
</style>
