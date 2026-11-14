/**
 * Unique permission catalog mirrored from Flask `constants.ALL_PAGE_KEYS`
 * + keys observed on `@require_admin_or_page_permission`.
 *
 * Flask is authority. This catalog only drives UX gates (nav, buttons,
 * route shells). HTTP still fails with 403 when the cookie lacks the key.
 */

/** Page keys grantable in user_page_permissions (sidebar + admin UI). */
export const ALL_PAGE_KEYS = [
	'dashboard',
	'inventory',
	'cycle-counts',
	'count-approvals',
	'purchase-orders',
	'receiving',
	'putaway',
	'sales-orders',
	'backorders',
	'fraud',
	'picking-tickets',
	'picking-batches',
	'items',
	'vendors',
	'adjustments',
	'inter-warehouse-transfers',
	'transfer-orders',
	'warehouses',
	'bins',
	'zones',
	'preferred-bins',
	'users',
	'api-tokens',
	'inbound',
	'consumer-groups',
	'channels',
	'webhooks',
	'notifications',
	'audit-log',
	'imports',
	'integrations',
	'settings',
	// Used by Flask routes; keep even if absent from older ALL_PAGE_KEYS dumps
	'pos-activity'
] as const;

export type PageKey = (typeof ALL_PAGE_KEYS)[number] | (string & {});

/** Non-page grants (mig 062). Not shown as sidebar pages. */
export const ALL_OVERRIDE_KEYS = ['so-full-edit'] as const;
export type OverrideKey = (typeof ALL_OVERRIDE_KEYS)[number];

/**
 * Capability kind — same Flask page_key often covers all four levels.
 * Split here so UI can hide action buttons while still showing read-only
 * screens when a future backend splits them.
 */
export type PermissionCapability =
	| 'open_page'
	| 'read_data'
	| 'execute_action'
	| 'approve_or_modify';

export type PermissionGrant = {
	pageKey: PageKey;
	capability: PermissionCapability;
	/** Optional override required in addition to pageKey. */
	overrideKey?: OverrideKey;
};

/** True when key is a known catalog page (or ADMIN will bypass anyway). */
export function isKnownPageKey(key: string): boolean {
	return (ALL_PAGE_KEYS as readonly string[]).includes(key);
}

export function isKnownOverrideKey(key: string): boolean {
	return (ALL_OVERRIDE_KEYS as readonly string[]).includes(key);
}
