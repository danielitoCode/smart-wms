export type ManagedUserPermissionGroup = {
	label: string;
	isOverride?: boolean;
	pages: [string, string][];
};

/** Mirrors api/constants.py ALL_PAGE_KEYS + ALL_OVERRIDE_KEYS. */
export const MANAGED_USER_PERMISSION_GROUPS: ManagedUserPermissionGroup[] = [
	{ label: 'General', pages: [['dashboard', 'Dashboard']] },
	{ label: 'Floor', pages: [['inventory', 'Inventory'], ['cycle-counts', 'Cycle Counts'], ['count-approvals', 'Count Approvals']] },
	{ label: 'Inbound', pages: [['purchase-orders', 'Purchase Orders'], ['receiving', 'Receiving'], ['putaway', 'Put-away']] },
	{ label: 'Outbound', pages: [['sales-orders', 'Sales Orders'], ['backorders', 'Backorders'], ['fraud', 'Fraud'], ['picking-tickets', 'Picking Tickets'], ['picking-batches', 'Picking Batches']] },
	{ label: 'Warehouse', pages: [['items', 'Items'], ['vendors', 'Vendors'], ['adjustments', 'Inventory Adjustments'], ['inter-warehouse-transfers', 'Inventory Transfers'], ['transfer-orders', 'Transfer Orders'], ['warehouses', 'Warehouses'], ['bins', 'Bins'], ['zones', 'Zones'], ['preferred-bins', 'Preferred Bins']] },
	{ label: 'System', pages: [['users', 'Users'], ['api-tokens', 'API Tokens'], ['inbound', 'Inbound Activity'], ['consumer-groups', 'Consumer Groups'], ['channels', 'Channels'], ['webhooks', 'Webhooks'], ['notifications', 'Notifications'], ['audit-log', 'Audit Log'], ['imports', 'Imports'], ['integrations', 'Integrations'], ['settings', 'Settings']] },
	{ label: 'Overrides', isOverride: true, pages: [['so-full-edit', 'Full SO edit (past OPEN, incl. source_system + line CRUD)']] },
];

export const MANAGED_USER_PERMISSION_KEYS = MANAGED_USER_PERMISSION_GROUPS.flatMap(
	(group) => group.pages.map(([key]) => key),
);
