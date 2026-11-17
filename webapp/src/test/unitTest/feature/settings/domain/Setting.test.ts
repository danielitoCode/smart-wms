import { describe, expect, it, vi } from 'vitest';
import {
	KNOWN_SETTING_KEYS,
	getSettingDefinition,
	isKnownSettingKey,
	validateSettingValue,
	validateSettings,
	withSettingDefaults,
	type SettingsMap
} from '#core/feature/settings/domain/entity/Setting';
import type { SettingsRepository } from '#core/feature/settings/domain/repository/SettingsRepository';
import {
	GetSettingUseCase,
	GetSettingsUseCase,
	UpdateSettingsUseCase
} from '#core/feature/settings/domain/usecase/SettingsUseCases';

describe('Settings domain definitions and validation', () => {
	it('defines defaults for every known key', () => {
		const defaults = withSettingDefaults({});
		expect(Object.keys(defaults)).toHaveLength(KNOWN_SETTING_KEYS.length);
		expect(defaults.count_show_expected).toBe('true');
		expect(defaults.require_packing_before_shipping).toBe('true');
		expect(defaults.require_count_approval_separation).toBe('false');
		expect(defaults.dashboard_bubble_origins).toBe('[]');
	});

	it('keeps unknown settings out of the editable catalog', () => {
		expect(isKnownSettingKey('count_show_expected')).toBe(true);
		expect(isKnownSettingKey('made_up_setting')).toBe(false);
		expect(getSettingDefinition('made_up_setting')).toBeUndefined();
		expect(validateSettingValue('made_up_setting', 'x')).toContain('desconocida');
	});

	it('validates booleans and receiving bin IDs', () => {
		expect(validateSettingValue('count_show_expected', 'true')).toBeNull();
		expect(validateSettingValue('count_show_expected', 'yes')).not.toBeNull();
		expect(validateSettingValue('default_receiving_bin', '')).toBeNull();
		expect(validateSettingValue('default_receiving_bin', '12')).toBeNull();
		expect(validateSettingValue('default_receiving_bin', '-1')).not.toBeNull();
	});

	it('accepts HTTP(S) URLs and safe relative logo paths only', () => {
		expect(validateSettingValue('picking_ticket_logo_url', '')).toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', 'https://cdn.example.com/logo.png')).toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', '/picking-tickets/logo.png')).toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', 'javascript:alert(1)')).not.toBeNull();
		expect(validateSettingValue('picking_ticket_logo_url', '//evil.example/logo.png')).not.toBeNull();
	});

	it('validates dashboard origin JSON shape and uniqueness', () => {
		expect(validateSettingValue('dashboard_bubble_origins', '[]')).toBeNull();
		expect(validateSettingValue('dashboard_bubble_origins', '[{"origin":"Shopify","label":"Web"}]')).toBeNull();
		expect(validateSettingValue('dashboard_bubble_origins', '{')).not.toBeNull();
		expect(validateSettingValue('dashboard_bubble_origins', '[{"origin":"Shopify"},{"origin":"Shopify"}]')).toContain('duplicado');
	});
});

describe('Settings use cases', () => {
	const repository: SettingsRepository = {
		get: vi.fn(async (key) => ({ key, value: 'true' })),
		list: vi.fn(async () => ({ count_show_expected: 'false' })),
		update: vi.fn(async (_settings: SettingsMap) => undefined)
	};

	it('exposes GetSettings and GetSetting without swallowing repository errors', async () => {
		expect(await new GetSettingsUseCase(repository).execute()).toEqual({ count_show_expected: 'false' });
		expect(await new GetSettingUseCase(repository).execute('count_show_expected')).toEqual({
			key: 'count_show_expected',
			value: 'true'
		});
		await expect(new GetSettingUseCase(repository).execute('unknown')).rejects.toThrow('desconocida');
	});

	it('validates before update and sends only the supplied partial patch', async () => {
		const update = new UpdateSettingsUseCase(repository);
		await expect(update.execute({ count_show_expected: 'sometimes' })).rejects.toThrow('booleano');
		expect(repository.update).not.toHaveBeenCalled();
		await update.execute({ count_show_expected: 'false' });
		expect(repository.update).toHaveBeenCalledWith({ count_show_expected: 'false' });
	});

	it('rejects empty patches', async () => {
		await expect(new UpdateSettingsUseCase(repository).execute({})).rejects.toThrow('No hay cambios');
	});
});
