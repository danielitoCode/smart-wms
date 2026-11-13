export type Setting = {
	key: string;
	value: string;
};

export type SettingsMap = Record<string, string>;

/** Known operational setting keys used by the admin Settings screen. */
export const KNOWN_SETTING_KEYS = [
	'count_show_expected',
	'require_packing_before_shipping',
	'allow_over_receiving',
	'default_receiving_bin',
	'require_count_approval_separation',
	'picking_ticket_company_name',
	'picking_ticket_company_address',
	'picking_ticket_logo_url',
	'picking_ticket_returns_text',
	'pos_activity_enabled',
	'fraud_review_billing_shipping',
	'dashboard_bubble_origins'
] as const;

export type KnownSettingKey = (typeof KNOWN_SETTING_KEYS)[number];
