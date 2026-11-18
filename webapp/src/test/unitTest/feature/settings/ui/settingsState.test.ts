import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#core/infrastructure/errors/ApiError';

const deps = vi.hoisted(() => ({
	getSettings: { execute: vi.fn() },
	getSetting: { execute: vi.fn() },
	update: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/settings/di/settings.dependencies', () => ({
	createSettingsDependencies: () => deps
}));

import { createSettingsState } from '../../../../../core/feature/settings/ui/state/settingsState.svelte';

describe('Settings UI state persistence and validation', () => {
	let persisted: Record<string, string>;

	beforeEach(() => {
		vi.clearAllMocks();
		persisted = {
			count_show_expected: 'false',
			require_packing_before_shipping: 'true',
			pos_activity_enabled: 'false',
			legacy_setting_not_exposed: 'keep-me'
		};
		deps.getSettings.execute.mockImplementation(async () => ({ ...persisted }));
		deps.update.execute.mockImplementation(async (patch: Record<string, string>) => {
			persisted = { ...persisted, ...patch };
		});
	});

	it('reloads persisted values and keeps untouched settings when saving a partial change', async () => {
		const firstLoad = createSettingsState();
		await firstLoad.load();
		expect(firstLoad.draft.count_show_expected).toBe('false');
		expect(firstLoad.draft.require_packing_before_shipping).toBe('true');

		firstLoad.setDraft('pos_activity_enabled', 'true');
		expect(await firstLoad.save()).toBe(true);
		expect(deps.update.execute).toHaveBeenCalledWith({ pos_activity_enabled: 'true' });
		expect(persisted).toEqual({
			count_show_expected: 'false',
			require_packing_before_shipping: 'true',
			pos_activity_enabled: 'true',
			legacy_setting_not_exposed: 'keep-me'
		});

		const afterReload = createSettingsState();
		await afterReload.load();
		expect(afterReload.draft.pos_activity_enabled).toBe('true');
		expect(afterReload.draft.count_show_expected).toBe('false');
		expect(afterReload.draft.require_packing_before_shipping).toBe('true');
	});

	it('rejects attempts to edit unknown keys', async () => {
		const state = createSettingsState();
		await state.load();
		state.setDraft('legacy_setting_not_exposed', 'overwrite');
		expect(state.error).toContain('desconocida');
		expect(state.draft.legacy_setting_not_exposed).toBeUndefined();
	});

	it('blocks invalid values before calling the update use case', async () => {
		const state = createSettingsState();
		await state.load();
		state.setDraft('count_show_expected', 'sometimes');
		expect(await state.save()).toBe(false);
		expect(state.validationErrors.count_show_expected).toContain('booleano');
		expect(deps.update.execute).not.toHaveBeenCalled();
	});

	it('keeps 403 permission failures visible instead of reporting a successful save', async () => {
		const state = createSettingsState();
		await state.load();
		state.setDraft('pos_activity_enabled', 'true');
		deps.update.execute.mockRejectedValueOnce(new ApiError(403, 'Permission denied', 'forbidden'));
		expect(await state.save()).toBe(false);
		expect(state.error).toBe('Permission denied');
		expect(state.saved).toBe(false);
	});

	it('identifies sensitive changes for explicit UI confirmation', async () => {
		const state = createSettingsState();
		await state.load();
		state.setDraft('require_packing_before_shipping', 'false');
		expect(state.getSensitiveChanges()).toEqual(['require_packing_before_shipping']);
	});
});
