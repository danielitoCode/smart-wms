import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { WebhookDto, WebhookListResponseDto } from '../dto/WebhookDto';

export class WebhooksRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	list() { return this.api.get<WebhookListResponseDto>('/api/admin/webhooks'); }
	create(body: Record<string, unknown>) { return this.api.post<WebhookDto>('/api/admin/webhooks', body); }
	remove(subscriptionId: string, purge = false) {
		const q = purge ? '?purge=true' : '';
		return this.api.delete<void>(`/api/admin/webhooks/${encodeURIComponent(subscriptionId)}${q}`);
	}
	rotateSecret(subscriptionId: string) {
		return this.api.post<WebhookDto>(`/api/admin/webhooks/${encodeURIComponent(subscriptionId)}/rotate-secret`, {});
	}
}
