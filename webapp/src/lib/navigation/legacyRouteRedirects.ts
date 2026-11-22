/** React-era URLs retained as permanent redirects to the SvelteKit canonical routes. */
export const LEGACY_ROUTE_REDIRECTS = {
  "/cycle-counts": "/cycle-count",
  "/count-approvals": "/management/count-approvals",
  "/purchase-orders": "/management/purchase-orders",
  "/pos-activity": "/management/pos-activity",
  "/fraud": "/management/fraud",
  "/backorders": "/management/backorders",
  "/returns": "/management/returns",
  "/returns/rma": "/management/returns",
  "/returns/refunds": "/management/refunds",
  "/rma": "/management/returns",
  "/vendors": "/management/vendors",
  "/users": "/management/users",
  "/api-tokens": "/management/api-tokens",
  "/inbound": "/management/inbound-activity",
  "/consumer-groups": "/management/consumer-groups",
  "/webhooks": "/management/webhooks",
  "/channels": "/management/channels",
  "/notifications": "/management/notifications",
  "/audit-log": "/management/audit-log",
  "/settings": "/management/settings",
  "/imports": "/management/imports",
  "/integrations": "/management/integrations",
  "/adjustments": "/management/adjustments",
  "/inter-warehouse-transfers": "/management/inter-warehouse-transfers",
  "/transfer-orders": "/management/transfer-orders",
  "/bins": "/data/bins",
  "/zones": "/data/zones",
  "/preferred-bins": "/data/preferred-bins",
  "/warehouses": "/data/warehouses"
} as const;

export type LegacyRoutePath = keyof typeof LEGACY_ROUTE_REDIRECTS;
