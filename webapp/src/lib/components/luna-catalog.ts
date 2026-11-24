/** Sample catalog for the Luna block. Replace links and products with your routes. */
export type LunaCategory = {
	label: string;
	href: string;
	description: string;
	icon: 'games' | 'software' | 'subscriptions' | 'gifts' | 'assets' | 'topups';
};
export type LunaLink = { label: string; href: string };
export type LunaProduct = LunaLink & { region: string; keywords?: string[] };

export const LUNA_LINKS = {
	home: '/',
	store: '/store',
	categories: '/categories',
	signIn: '/sign-in',
	join: '/join'
} as const;

export const LUNA_NAV: LunaLink[] = [
	{ label: 'Deals', href: '/deals' },
	{ label: 'Support', href: '/support' },
	{ label: 'FAQ', href: '/faq' }
];

export const LUNA_CATEGORIES: LunaCategory[] = [
	{
		label: 'Game Keys',
		href: '/c/game-keys',
		description: 'Steam, Epic, Xbox and PlayStation codes.',
		icon: 'games'
	},
	{
		label: 'Software Licenses',
		href: '/c/software',
		description: 'Design tools, security and utilities.',
		icon: 'software'
	},
	{
		label: 'Subscriptions',
		href: '/c/subscriptions',
		description: 'Streaming, music and cloud storage.',
		icon: 'subscriptions'
	},
	{
		label: 'Gift Cards',
		href: '/c/gift-cards',
		description: 'Store credit for your favourite platforms.',
		icon: 'gifts'
	},
	{
		label: 'Digital Assets',
		href: '/c/assets',
		description: 'Templates, fonts, 3D models and presets.',
		icon: 'assets'
	},
	{
		label: 'Top Ups',
		href: '/c/top-ups',
		description: 'In game currency and wallet credit.',
		icon: 'topups'
	}
];

export const LUNA_PRODUCTS: LunaProduct[] = [
	{
		label: '1-Year VPN Plan',
		href: '/p/1-year-vpn-plan',
		region: 'Global',
		keywords: ['privacy', 'security']
	},
	{
		label: 'Design Suite License',
		href: '/p/design-suite-license',
		region: 'Global',
		keywords: ['software', 'creative']
	},
	{
		label: 'Cloud Storage 2TB',
		href: '/p/cloud-storage-2tb',
		region: 'US',
		keywords: ['backup', 'subscription']
	},
	{
		label: 'Game Key Bundle',
		href: '/p/game-key-bundle',
		region: 'EU',
		keywords: ['steam', 'pc']
	}
];
