import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type {
	SettingDetailDto,
	SettingsListDto,
	UpdateSettingsRequestDto,
	UpdateSettingsResponseDto
} from '../dto/SettingDto';

export class SettingsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	list(): Promise<SettingsListDto> {
		return this.api.get<SettingsListDto>('/api/admin/settings');
	}

	get(key: string): Promise<SettingDetailDto> {
		return this.api.get<SettingDetailDto>(`/api/admin/settings/${encodeURIComponent(key)}`);
	}

	update(body: UpdateSettingsRequestDto): Promise<UpdateSettingsResponseDto> {
		return this.api.put<UpdateSettingsResponseDto>('/api/admin/settings', body);
	}
}
