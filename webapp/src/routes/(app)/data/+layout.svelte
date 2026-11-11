<script lang="ts">
	import { page } from '$app/state';
	import AppIcon from '../../../lib/components/AppIcon.svelte';
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { authSession } from '../../../core/infrastructure/auth/AuthSession';
	let { children } = $props();
	const user = authSession.getUser();
	const admin = user?.role === 'ADMIN';
	const pages = user?.allowedPages ?? [];
	const tabs = [
		{ href: '/data/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', keys: ['warehouses'] },
		{ href: '/data/zones', label: i18n.t('Zonas'), icon: 'map-pin', keys: ['zones'] },
		{ href: '/data/bins', label: i18n.t('Ubicaciones'), icon: 'boxes', keys: ['bins', 'zones'] },
		{ href: '/data/preferred-bins', label: i18n.t('Ubicaciones preferidas'), icon: 'package-check', keys: ['preferred-bins'] }
	] as const;
	const visibleTabs = tabs.filter(tab => admin || tab.keys.every(key => pages.includes(key)));
	function isActive(href: string) { return page.url.pathname === href || page.url.pathname.startsWith(href + '/'); }
</script>

<section class="data-page">
	<nav aria-label="Datos maestros">{#each visibleTabs as tab}<a href={tab.href} class:active={isActive(tab.href)} aria-current={isActive(tab.href) ? 'page' : undefined}><AppIcon name={tab.icon} size={17} /><span>{tab.label}</span></a>{/each}</nav>
	{@render children()}
</section>

<style>
	.data-page { max-width:76rem; margin:0 auto; padding:1.25rem 1rem 2rem; }
	nav { display:flex; flex-wrap:wrap; gap:.35rem; padding:0 0 .8rem; border-bottom:1px solid var(--line); }
	nav a { min-height:40px; display:inline-flex; align-items:center; gap:.5rem; padding:.45rem .75rem; border-radius:8px; color:var(--slate); text-decoration:none; font-size:.85rem; font-weight:600; }
	nav a:hover { background:var(--surface-subtle,#f7fafc); color:var(--ink); }
	nav a.active { background:var(--navy); color:white; }
</style>
