/**
 * Datos demo del AppSidebar — estructura alineada a Smart WMS.
 * En producción se alimenta de i18n + AccessPolicy + warehouse context.
 */

export type NavIcon =
	| 'inbox'
	| 'map-pin'
	| 'clipboard-list'
	| 'package-check'
	| 'truck'
	| 'boxes'
	| 'scan'
	| 'package'
	| 'warehouse'
	| 'database'
	| 'user'
	| 'globe'
	| 'lock'
	| 'settings'
	| 'chart';

export type NavItem = {
	title: string;
	url: string;
	icon: NavIcon;
	pageKey?: string;
	isActive?: boolean;
	items?: { title: string; url: string }[];
};

export type Team = {
	name: string;
	plan: string;
	logo: string;
};

export type Project = {
	name: string;
	url: string;
	icon: NavIcon;
};

export type SidebarUser = {
	name: string;
	email: string;
	avatar: string;
};

export const sidebarData = {
	user: {
		name: 'Ana Operaciones',
		email: 'ana@abellis.io',
		avatar: 'https://i.pravatar.cc/150?u=ana-wms'
	} satisfies SidebarUser,

	teams: [
		{ name: 'Nave Madrid', plan: 'Multi-almacén', logo: 'MD' },
		{ name: 'Nave Valencia', plan: 'Multi-almacén', logo: 'VL' },
		{ name: 'Hub Norte', plan: 'Satellite', logo: 'HN' }
	] satisfies Team[],

	navMain: [
		{
			title: 'Operaciones',
			url: '#',
			icon: 'inbox',
			isActive: true,
			items: [
				{ title: 'Recepción', url: '/receiving' },
				{ title: 'Ubicación', url: '/putaway' },
				{ title: 'Preparación', url: '/picking' },
				{ title: 'Empaque', url: '/packing' },
				{ title: 'Despacho', url: '/shipping' }
			]
		},
		{
			title: 'Control',
			url: '#',
			icon: 'boxes',
			items: [
				{ title: 'Inventario', url: '/inventory' },
				{ title: 'Conteo cíclico', url: '/cycle-count' },
				{ title: 'Aprobaciones', url: '/management/count-approvals' }
			]
		},
		{
			title: 'Gestión',
			url: '#',
			icon: 'package',
			items: [
				{ title: 'Pedidos de venta', url: '/management/sales-orders' },
				{ title: 'Compras', url: '/management/purchase-orders' },
				{ title: 'Clientes', url: '/management/customers' },
				{ title: 'Proveedores', url: '/management/vendors' },
				{ title: 'Usuarios', url: '/management/users' }
			]
		},
		{
			title: 'Plataforma',
			url: '#',
			icon: 'settings',
			items: [
				{ title: 'Ajustes', url: '/management/settings' },
				{ title: 'Tokens API', url: '/management/api-tokens' },
				{ title: 'Webhooks', url: '/management/webhooks' },
				{ title: 'Canales', url: '/management/channels' }
			]
		}
	] satisfies NavItem[],

	projects: [
		{ name: 'Ola picking · Nave 2', url: '/picking', icon: 'clipboard-list' },
		{ name: 'Conteo zona A', url: '/cycle-count', icon: 'scan' },
		{ name: 'Inbound hoy', url: '/receiving', icon: 'inbox' }
	] satisfies Project[]
};
