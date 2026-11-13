import type { NotificationWebhook, NotificationWebhookCreateInput } from '../entity/NotificationWebhook';

export interface NotificationsRepository {
	list(): Promise<NotificationWebhook[]>;
	create(input: NotificationWebhookCreateInput): Promise<NotificationWebhook>;
	remove(webhookId: string): Promise<void>;
	testSend(webhookId: string): Promise<void>;
}
