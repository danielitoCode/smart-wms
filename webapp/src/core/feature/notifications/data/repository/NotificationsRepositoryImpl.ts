import type { NotificationsRepository } from '../../domain/repository/NotificationsRepository';
import type { NotificationWebhook, NotificationWebhookCreateInput } from '../../domain/entity/NotificationWebhook';
import { NotificationsRemoteDataSource } from '../datasource/NotificationsRemoteDataSource';
import { NotificationWebhookMapper } from '../mapper/NotificationWebhookMapper';

export class NotificationsRepositoryImpl implements NotificationsRepository {
	constructor(private readonly remote: NotificationsRemoteDataSource) {}
	async list() {
		const response = await this.remote.list();
		const raw = response.webhooks ?? response.notification_webhooks ?? [];
		return raw.map(NotificationWebhookMapper.toDomain);
	}
	async create(input: NotificationWebhookCreateInput) {
		const dto = await this.remote.create({ name: input.name, url: input.url });
		return NotificationWebhookMapper.toDomain(dto);
	}
	async remove(webhookId: string) { await this.remote.remove(webhookId); }
	async testSend(webhookId: string) { await this.remote.testSend(webhookId); }
}
