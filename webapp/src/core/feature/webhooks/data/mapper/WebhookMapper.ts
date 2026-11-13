import type { WebhookSubscription } from '../../domain/entity/WebhookSubscription';
import type { WebhookDto } from '../dto/WebhookDto';

export const WebhookMapper = {
	toDomain(dto: WebhookDto): WebhookSubscription {
		return {
			subscriptionId: dto.subscription_id,
			name: dto.name,
			url: dto.url ?? '',
			status: dto.status ?? 'unknown',
			eventTypes: dto.event_types ?? [],
			createdAt: dto.created_at ?? null,
			updatedAt: dto.updated_at ?? null
		};
	}
};
