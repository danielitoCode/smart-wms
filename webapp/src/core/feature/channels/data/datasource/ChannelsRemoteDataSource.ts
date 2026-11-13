import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { ChannelDto, ChannelListResponseDto } from '../dto/ChannelDto';

export class ChannelsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	list() { return this.api.get<ChannelListResponseDto>('/api/admin/channels'); }
	create(body: Record<string, unknown>) { return this.api.post<ChannelDto>('/api/admin/channels', body); }
	remove(channelId: string) { return this.api.delete<void>(`/api/admin/channels/${encodeURIComponent(channelId)}`); }
}
