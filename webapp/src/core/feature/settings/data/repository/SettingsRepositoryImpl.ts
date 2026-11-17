import type { SettingsRepository } from '../../domain/repository/SettingsRepository';
import type { Setting, SettingsMap } from '../../domain/entity/Setting';
import { SettingsRemoteDataSource } from '../datasource/SettingsRemoteDataSource';
import { SettingMapper } from '../mapper/SettingMapper';

export class SettingsRepositoryImpl implements SettingsRepository {
	constructor(private readonly remote: SettingsRemoteDataSource) {}

	async get(key: string): Promise<Setting> {
		return SettingMapper.toDomain(await this.remote.get(key));
	}

	async list(): Promise<SettingsMap> {
		const response = await this.remote.list();
		const result: SettingsMap = {};
		for (const dto of response.settings ?? []) {
			const setting = SettingMapper.toDomain(dto);
			result[setting.key] = setting.value;
		}
		return result;
	}

	async update(settings: SettingsMap): Promise<void> {
		await this.remote.update({ settings });
	}
}
