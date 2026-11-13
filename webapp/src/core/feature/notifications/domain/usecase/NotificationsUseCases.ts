import type { NotificationsRepository } from '../repository/NotificationsRepository';
import type { NotificationWebhookCreateInput } from '../entity/NotificationWebhook';

export class ListNotificationWebhooksUseCase {
	constructor(private readonly repository: NotificationsRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateNotificationWebhookUseCase {
	constructor(private readonly repository: NotificationsRepository) {}
	execute(input: NotificationWebhookCreateInput) {
		if (!input.name.trim() || !input.url.trim()) throw new Error('Nombre y URL son obligatorios');
		return this.repository.create({ name: input.name.trim(), url: input.url.trim() });
	}
}

export class DeleteNotificationWebhookUseCase {
	constructor(private readonly repository: NotificationsRepository) {}
	execute(webhookId: string) {
		if (!webhookId.trim()) throw new Error('Webhook inválido');
		return this.repository.remove(webhookId);
	}
}

export class TestNotificationWebhookUseCase {
	constructor(private readonly repository: NotificationsRepository) {}
	execute(webhookId: string) {
		if (!webhookId.trim()) throw new Error('Webhook inválido');
		return this.repository.testSend(webhookId);
	}
}
