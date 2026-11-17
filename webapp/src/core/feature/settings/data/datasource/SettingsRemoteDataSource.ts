import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type {
	SettingDto,
	SettingsListDto,
	UpdateSettingsRequestDto,
	UpdateSettingsResponseDto
} from '../dto/SettingDto';

export class SettingsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	list() {
		return this.api.get<SettingsListDto>('/api/admin/settings');
	}

	get(key: string) {
		return this.api.get<SettingDto>(`/api/admin/settings/${encodeURIComponent(key)}`);
	}

	update(body: UpdateSettingsRequestDto) {
		return this.api.put<UpdateSettingsResponseDto>('/api/admin/settings', body);
	}
}
