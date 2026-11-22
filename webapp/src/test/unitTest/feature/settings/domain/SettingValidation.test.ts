import { describe, expect, it } from 'vitest';
import { validateSettingValue, validateSettings, withSettingDefaults } from '../../../../../core/feature/settings/domain/entity/Setting';

describe('R8.3 global settings validation', () => {
	it('accepts only explicit boolean values', () => {
		expect(validateSettingValue('require_packing_before_shipping', 'true')).toBeNull();
		expect(validateSettingValue('require_packing_before_shipping', 'false')).toBeNull();
		expect(validateSettingValue('require_packing_before_shipping', 'yes')).not.toBeNull();
	});

	it('accepts an empty or positive integer receiving bin ID only', () => {
		expect(validateSettingValue('default_receiving_bin', '')).toBeNull();
		expect(validateSettingValue('default_receiving_bin', '25')).toBeNull();
		expect(validateSettingValue('default_receiving_bin', '0')).not.toBeNull();
		expect(validateSettingValue('default_receiving_bin', '2.5')).not.toBeNull();
	});

	it('accepts only HTTP(S) URLs or safe relative logo paths', () => {
		expect(validateSettingValue('picking_ticket_logo_url', '/assets/logo.svg')).toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', 'https://cdn.example.test/logo.svg')).toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', 'javascript:alert(1)')).not.toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', '//evil.example/logo.svg')).not.toBeNull();
	});

	it('validates dashboard origin JSON shape and duplicate origins', () => {
		expect(validateSettingValue('dashboard_bubble_origins', '[{"origin":"AMAZON","label":"Amazon"}]')).toBeNull();
		expect(validateSettingValue('dashboard_bubble_origins', '[{"origin":"AMAZON"},{"origin":"AMAZON"}]')).toContain('duplicado');
		expect(validateSettingValue('dashboard_bubble_origins', '{"origin":"AMAZON"}')).not.toBeNull();
		expect(validateSettingValue('dashboard_bubble_origins', '[{"origin":""}]')).not.toBeNull();
	});

	it('rejects unknown keys and non-string values', () => {
		expect(validateSettingValue('unknown_setting', 'x')).toContain('desconocida');
		expect(validateSettingValue('count_show_expected', true)).toContain('texto');
		expect(validateSettings({ unknown_setting: 'x' })).toHaveLength(1);
	});

	it('fills known defaults without mutating the server response', () => {
		const persisted = { count_show_expected: 'false' };
		const normalized = withSettingDefaults(persisted);
		expect(normalized.count_show_expected).toBe('false');
		expect(normalized.require_packing_before_shipping).toBe('true');
		expect(persisted).toEqual({ count_show_expected: 'false' });
	});
});
