import type { WebhooksRepository } from '../../domain/repository/WebhooksRepository';
import type { WebhookCreateInput, WebhookSubscription } from '../../domain/entity/WebhookSubscription';
import { WebhooksRemoteDataSource } from '../datasource/WebhooksRemoteDataSource';
import { WebhookMapper } from '../mapper/WebhookMapper';

export class WebhooksRepositoryImpl implements WebhooksRepository {
	constructor(private readonly remote: WebhooksRemoteDataSource) {}
	async list() {
		const response = await this.remote.list();
		const raw = response.webhooks ?? response.subscriptions ?? [];
		return raw.map(WebhookMapper.toDomain);
	}
	async create(input: WebhookCreateInput) {
		const dto = await this.remote.create({
			name: input.name,
			url: input.url,
			event_types: input.eventTypes
		});
		return WebhookMapper.toDomain(dto);
	}
	async remove(subscriptionId: string, purge = false) {
		await this.remote.remove(subscriptionId, purge);
	}
	async rotateSecret(subscriptionId: string) {
		const dto = await this.remote.rotateSecret(subscriptionId);
		return { secret: dto.secret ?? null };
	}
}
