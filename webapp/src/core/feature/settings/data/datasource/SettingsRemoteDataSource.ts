import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { SettingDto, UpdateSettingsRequestDto } from '../dto/SettingDto';

export class SettingsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	get(key: string) {
		return this.api.get<SettingDto>(`/api/admin/settings/${encodeURIComponent(key)}`);
	}

	update(body: UpdateSettingsRequestDto) {
		return this.api.put<void>('/api/admin/settings', body);
	}
}
