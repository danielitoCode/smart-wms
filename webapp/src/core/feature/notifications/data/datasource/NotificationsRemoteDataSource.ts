import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { NotificationWebhookDto, NotificationWebhookListResponseDto } from '../dto/NotificationWebhookDto';

export class NotificationsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	list() { return this.api.get<NotificationWebhookListResponseDto>('/api/admin/notification-webhooks'); }
	create(body: Record<string, unknown>) { return this.api.post<NotificationWebhookDto>('/api/admin/notification-webhooks', body); }
	remove(webhookId: string) { return this.api.delete<void>(`/api/admin/notification-webhooks/${encodeURIComponent(webhookId)}`); }
	testSend(webhookId: string) { return this.api.post<void>(`/api/admin/notification-webhooks/${encodeURIComponent(webhookId)}/test-send`, {}); }
}
