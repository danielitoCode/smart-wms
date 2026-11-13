import type { NotificationWebhook } from '../../domain/entity/NotificationWebhook';
import type { NotificationWebhookDto } from '../dto/NotificationWebhookDto';

export const NotificationWebhookMapper = {
	toDomain(dto: NotificationWebhookDto): NotificationWebhook {
		return {
			webhookId: dto.webhook_id,
			name: dto.name,
			url: dto.url ?? '',
			active: dto.active !== false,
			createdAt: dto.created_at ?? null
		};
	}
};
