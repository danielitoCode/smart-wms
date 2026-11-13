import type { SettingsRepository } from '../../domain/repository/SettingsRepository';
import type { Setting, SettingsMap } from '../../domain/entity/Setting';
import { SettingsRemoteDataSource } from '../datasource/SettingsRemoteDataSource';
import { SettingMapper } from '../mapper/SettingMapper';

export class SettingsRepositoryImpl implements SettingsRepository {
	constructor(private readonly remote: SettingsRemoteDataSource) {}

	async get(key: string): Promise<Setting> {
		return SettingMapper.toDomain(await this.remote.get(key));
	}

	async listKnown(keys: readonly string[]): Promise<SettingsMap> {
		const result: SettingsMap = {};
		await Promise.all(
			keys.map(async (key) => {
				try {
					const setting = await this.get(key);
					result[key] = setting.value;
				} catch {
					result[key] = '';
				}
			})
		);
		return result;
	}

	async update(settings: SettingsMap): Promise<void> {
		await this.remote.update({ settings });
	}
}
