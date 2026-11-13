import type { WebhooksRepository } from '../repository/WebhooksRepository';
import type { WebhookCreateInput } from '../entity/WebhookSubscription';

export class ListWebhooksUseCase {
	constructor(private readonly repository: WebhooksRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateWebhookUseCase {
	constructor(private readonly repository: WebhooksRepository) {}
	execute(input: WebhookCreateInput) {
		if (!input.name.trim()) throw new Error('El nombre es obligatorio');
		if (!input.url.trim()) throw new Error('La URL es obligatoria');
		return this.repository.create({
			name: input.name.trim(),
			url: input.url.trim(),
			eventTypes: input.eventTypes
		});
	}
}

export class DeleteWebhookUseCase {
	constructor(private readonly repository: WebhooksRepository) {}
	execute(subscriptionId: string, purge = false) {
		if (!subscriptionId.trim()) throw new Error('Suscripción inválida');
		return this.repository.remove(subscriptionId, purge);
	}
}

export class RotateWebhookSecretUseCase {
	constructor(private readonly repository: WebhooksRepository) {}
	execute(subscriptionId: string) {
		if (!subscriptionId.trim()) throw new Error('Suscripción inválida');
		return this.repository.rotateSecret(subscriptionId);
	}
}
