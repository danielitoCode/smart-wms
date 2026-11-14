import type { PageKey, PermissionCapability } from './PermissionCatalog';

/**
 * Automatic matrix: Svelte route ↔ page key ↔ typical Flask gate.
 * Endpoint list is representative (not every verb); Flask remains source of truth.
 */
export type PermissionMatrixRow = {
	sveltePath: string;
	pageKey: PageKey;
	capability: PermissionCapability;
	flaskGate: PageKey;
	/** Example Flask route prefixes under /api */
	endpoints: string[];
	notes?: string;
};

export const PERMISSION_MATRIX: readonly PermissionMatrixRow[] = [
	{ sveltePath: '/inventory', pageKey: 'inventory', capability: 'open_page', flaskGate: 'inventory', endpoints: ['GET /api/admin/inventory'] },
	{ sveltePath: '/cycle-count', pageKey: 'cycle-counts', capability: 'open_page', flaskGate: 'cycle-counts', endpoints: ['GET /api/admin/cycle-counts'] },
	{
		sveltePath: '/management/count-approvals',
		pageKey: 'count-approvals',
		capability: 'open_page',
		flaskGate: 'count-approvals',
		endpoints: [],
		notes: 'Sidebar grant is count-approvals; pending adjustment APIs use adjustments'
	},
	{
		sveltePath: '/management/count-approvals#approve',
		pageKey: 'adjustments',
		capability: 'approve_or_modify',
		flaskGate: 'adjustments',
		endpoints: ['GET /api/admin/adjustments/pending', 'POST /api/admin/adjustments/decide']
	},
	{ sveltePath: '/management/adjustments', pageKey: 'adjustments', capability: 'open_page', flaskGate: 'adjustments', endpoints: ['GET /api/admin/adjustments/pending', 'POST /api/admin/adjustments'] },
	{ sveltePath: '/receiving', pageKey: 'receiving', capability: 'open_page', flaskGate: 'receiving', endpoints: ['GET|POST /api/receiving/*'] },
	{ sveltePath: '/putaway', pageKey: 'putaway', capability: 'open_page', flaskGate: 'putaway', endpoints: ['GET|POST /api/putaway/*'], notes: 'putaway may not appear on every Flask admin decorator set' },
	{ sveltePath: '/management/purchase-orders', pageKey: 'purchase-orders', capability: 'open_page', flaskGate: 'purchase-orders', endpoints: ['/api/admin/purchase-orders*'] },
	{ sveltePath: '/management/sales-orders', pageKey: 'sales-orders', capability: 'open_page', flaskGate: 'sales-orders', endpoints: ['/api/admin/sales-orders*'] },
	{
		sveltePath: '/management/sales-orders#full-edit',
		pageKey: 'sales-orders',
		capability: 'approve_or_modify',
		flaskGate: 'sales-orders',
		endpoints: ['PATCH /api/admin/sales-orders/*'],
		notes: 'Past-OPEN edits also need override so-full-edit for non-ADMIN'
	},
	{ sveltePath: '/management/backorders', pageKey: 'backorders', capability: 'open_page', flaskGate: 'backorders', endpoints: ['/api/admin/backorders*'] },
	{
		sveltePath: '/management/fraud',
		pageKey: 'fraud',
		capability: 'open_page',
		flaskGate: 'fraud',
		endpoints: ['GET /api/admin/... fraud queue', 'POST fraud actions'],
		notes: 'MUST NOT use sales-orders for page open — Flask gates fraud routes with fraud'
	},
	{ sveltePath: '/management/pos-activity', pageKey: 'pos-activity', capability: 'open_page', flaskGate: 'pos-activity', endpoints: ['/api/admin/pos*'] },
	{ sveltePath: '/management/refunds', pageKey: 'sales-orders', capability: 'open_page', flaskGate: 'sales-orders', endpoints: ['/api/admin/sales-orders* returns/refunds'] },
	{ sveltePath: '/management/returns', pageKey: 'sales-orders', capability: 'open_page', flaskGate: 'sales-orders', endpoints: ['/api/admin/sales-orders* RMA'] },
	{ sveltePath: '/management/customers', pageKey: 'sales-orders', capability: 'read_data', flaskGate: 'sales-orders', endpoints: ['projection from SO + /admin/search'] },
	{ sveltePath: '/management/vendors', pageKey: 'vendors', capability: 'open_page', flaskGate: 'vendors', endpoints: ['/api/admin/vendors*'] },
	{ sveltePath: '/items', pageKey: 'items', capability: 'open_page', flaskGate: 'items', endpoints: ['/api/admin/items*'] },
	{ sveltePath: '/warehouses', pageKey: 'warehouses', capability: 'open_page', flaskGate: 'warehouses', endpoints: ['/api/admin/warehouses*'] },
	{ sveltePath: '/data/zones', pageKey: 'zones', capability: 'open_page', flaskGate: 'zones', endpoints: ['/api/admin/zones*'] },
	{ sveltePath: '/data/bins', pageKey: 'bins', capability: 'open_page', flaskGate: 'bins', endpoints: ['/api/admin/bins*'] },
	{ sveltePath: '/management/preferred-bins', pageKey: 'preferred-bins', capability: 'open_page', flaskGate: 'preferred-bins', endpoints: ['/api/admin/preferred-bins*'] },
	{ sveltePath: '/management/transfer-orders', pageKey: 'transfer-orders', capability: 'open_page', flaskGate: 'transfer-orders', endpoints: ['/api/admin/transfer-orders*'] },
	{ sveltePath: '/management/inter-warehouse-transfers', pageKey: 'transfer-orders', capability: 'open_page', flaskGate: 'transfer-orders', endpoints: ['/api/admin/transfer-orders*'], notes: 'Nav historically mixed inter-warehouse-transfers page key; Flask gate is transfer-orders' },
	{ sveltePath: '/management/users', pageKey: 'users', capability: 'open_page', flaskGate: 'users', endpoints: ['/api/admin/users*'] },
	{ sveltePath: '/management/settings', pageKey: 'settings', capability: 'open_page', flaskGate: 'settings', endpoints: ['/api/admin/settings*'] },
	{ sveltePath: '/management/api-tokens', pageKey: 'api-tokens', capability: 'open_page', flaskGate: 'api-tokens', endpoints: ['/api/admin/api-tokens*'] },
	{ sveltePath: '/management/channels', pageKey: 'channels', capability: 'open_page', flaskGate: 'channels', endpoints: ['/api/admin/channels*'] },
	{ sveltePath: '/management/webhooks', pageKey: 'webhooks', capability: 'open_page', flaskGate: 'webhooks', endpoints: ['/api/admin/webhooks*'] },
	{ sveltePath: '/management/notifications', pageKey: 'notifications', capability: 'open_page', flaskGate: 'notifications', endpoints: ['/api/admin/notifications*'] },
	{ sveltePath: '/management/integrations', pageKey: 'integrations', capability: 'open_page', flaskGate: 'integrations', endpoints: ['/api/admin/integrations*'] },
	{ sveltePath: '/management/consumer-groups', pageKey: 'consumer-groups', capability: 'open_page', flaskGate: 'consumer-groups', endpoints: ['/api/admin/consumer-groups*'] },
	{ sveltePath: '/management/inbound-activity', pageKey: 'inbound', capability: 'open_page', flaskGate: 'inbound', endpoints: ['/api/admin/inbound*'] },
	{ sveltePath: '/management/imports', pageKey: 'imports', capability: 'open_page', flaskGate: 'imports', endpoints: ['/api/admin/imports*'] },
	{ sveltePath: '/management/audit-log', pageKey: 'audit-log', capability: 'open_page', flaskGate: 'audit-log', endpoints: ['/api/admin/audit*'] }
] as const;

export function matrixRowsForPath(pathname: string): PermissionMatrixRow[] {
	return PERMISSION_MATRIX.filter(
		(row) => pathname === row.sveltePath || pathname.startsWith(row.sveltePath + '/') || row.sveltePath.startsWith(pathname + '#')
	);
}
