import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#core/infrastructure/errors/ApiError';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { SettingsRemoteDataSource } from '#core/feature/settings/data/datasource/SettingsRemoteDataSource';
import { SettingsRepositoryImpl } from '#core/feature/settings/data/repository/SettingsRepositoryImpl';

describe('Settings Flask data contract', () => {
	it('maps persisted list rows, including unknown legacy keys, in one request', async () => {
		const get = vi.fn().mockResolvedValue({
			settings: [
				{ id: 1, key: 'count_show_expected', value: 'false', updated_at: '2026-11-17T12:00:00Z' },
				{ id: 2, key: 'unknown_from_server', value: 'legacy', updated_at: null }
			]
		});
		const repository = new SettingsRepositoryImpl(
			new SettingsRemoteDataSource({ get, put: vi.fn() } as unknown as ApiClient)
		);

		await expect(repository.list()).resolves.toEqual({
			count_show_expected: 'false',
			unknown_from_server: 'legacy'
		});
		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith('/api/admin/settings');
	});

	it('loads one setting from the detail endpoint and preserves a 404/403 response', async () => {
		const get = vi.fn().mockResolvedValue({ key: 'count_show_expected', value: 'true' });
		const repository = new SettingsRepositoryImpl(
			new SettingsRemoteDataSource({ get, put: vi.fn() } as unknown as ApiClient)
		);
		await expect(repository.get('count_show_expected')).resolves.toEqual({
			key: 'count_show_expected',
			value: 'true'
		});
		expect(get).toHaveBeenCalledWith('/api/admin/settings/count_show_expected');

		const forbidden = new ApiError(403, 'Permission denied', 'forbidden');
		const denied = new SettingsRepositoryImpl(
			new SettingsRemoteDataSource({ get: vi.fn().mockRejectedValue(forbidden), put: vi.fn() } as unknown as ApiClient)
		);
		await expect(denied.get('count_show_expected')).rejects.toBe(forbidden);
	});

	it('sends only the supplied patch and preserves API failures', async () => {
		const patch = { settings: { count_show_expected: 'false' } };
		const put = vi.fn().mockResolvedValue({ message: 'Settings updated' });
		const repository = new SettingsRepositoryImpl(
			new SettingsRemoteDataSource({ get: vi.fn(), put } as unknown as ApiClient)
		);
		await repository.update(patch.settings);
		expect(put).toHaveBeenCalledWith('/api/admin/settings', patch);

		const failure = new ApiError(403, 'Permission denied', 'forbidden');
		const failingRepository = new SettingsRepositoryImpl(
			new SettingsRemoteDataSource({ get: vi.fn(), put: vi.fn().mockRejectedValue(failure) } as unknown as ApiClient)
		);
		await expect(failingRepository.update(patch.settings)).rejects.toBe(failure);
	});
});
