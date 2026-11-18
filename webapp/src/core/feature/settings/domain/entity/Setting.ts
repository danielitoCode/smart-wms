export type Setting = {
	key: string;
	value: string;
};

export type SettingsMap = Record<string, string>;

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
export type SettingValueType = 'boolean' | 'bin-id' | 'text' | 'url' | 'json';

export type SettingDefinition = {
	key: KnownSettingKey;
	type: SettingValueType;
	defaultValue: string;
	sensitive?: boolean;
};

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
	{ key: 'count_show_expected', type: 'boolean', defaultValue: 'true' },
	{ key: 'require_packing_before_shipping', type: 'boolean', defaultValue: 'true', sensitive: true },
	{ key: 'allow_over_receiving', type: 'boolean', defaultValue: 'true' },
	{ key: 'default_receiving_bin', type: 'bin-id', defaultValue: '' },
	{ key: 'require_count_approval_separation', type: 'boolean', defaultValue: 'false', sensitive: true },
	{ key: 'picking_ticket_company_name', type: 'text', defaultValue: '' },
	{ key: 'picking_ticket_company_address', type: 'text', defaultValue: '' },
	{ key: 'picking_ticket_logo_url', type: 'url', defaultValue: '' },
	{ key: 'picking_ticket_returns_text', type: 'text', defaultValue: '' },
	{ key: 'pos_activity_enabled', type: 'boolean', defaultValue: 'false', sensitive: true },
	{ key: 'fraud_review_billing_shipping', type: 'boolean', defaultValue: 'false', sensitive: true },
	{ key: 'dashboard_bubble_origins', type: 'json', defaultValue: '[]' }
] as const;

const definitionByKey = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

export function isKnownSettingKey(key: string): key is KnownSettingKey {
	return definitionByKey.has(key as KnownSettingKey);
}

export function getSettingDefinition(key: string): SettingDefinition | undefined {
	return isKnownSettingKey(key) ? definitionByKey.get(key) : undefined;
}

export function withSettingDefaults(settings: SettingsMap): SettingsMap {
	const result: SettingsMap = {};
	for (const definition of SETTING_DEFINITIONS) {
		result[definition.key] = settings[definition.key] ?? definition.defaultValue;
	}
	return result;
}

export function validateSettingValue(key: string, value: unknown): string | null {
	const definition = getSettingDefinition(key);
	if (!definition) return `Clave de configuración desconocida: ${key}`;
	if (typeof value !== 'string') return `El valor de ${key} debe ser texto`;

	switch (definition.type) {
		case 'boolean':
			return value === 'true' || value === 'false' ? null : `Valor booleano inválido para ${key}`;
		case 'bin-id':
			return value === '' || /^[1-9][0-9]*$/.test(value)
				? null
				: 'La ubicación de recepción debe ser un ID positivo o estar vacía';
		case 'url':
			if (value === '') return null;
			if (value.startsWith('/') && !value.startsWith('//')) return null;
			try {
				const url = new URL(value);
				return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'El logo debe usar HTTP o HTTPS';
			} catch {
				return 'La URL del logo no es válida';
			}
		case 'json':
			try {
				const parsed: unknown = JSON.parse(value);
				if (!Array.isArray(parsed)) return 'Los orígenes del dashboard deben ser una lista JSON';
				const seen = new Set<string>();
				for (const entry of parsed) {
					if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'Cada origen debe ser un objeto';
					const row = entry as Record<string, unknown>;
					if (typeof row.origin !== 'string' || !row.origin.trim()) return 'Cada origen necesita un nombre no vacío';
					if (row.label !== undefined && typeof row.label !== 'string') return 'La etiqueta del origen debe ser texto';
					const origin = row.origin.trim();
					if (seen.has(origin)) return `Origen duplicado: ${origin}`;
					seen.add(origin);
				}
				return null;
			} catch {
				return 'Los orígenes del dashboard contienen JSON inválido';
			}
		case 'text':
			return null;
	}
}

export function validateSettings(settings: SettingsMap): string[] {
	return Object.entries(settings)
		.map(([key, value]) => validateSettingValue(key, value))
		.filter((message): message is string => message !== null);
}
