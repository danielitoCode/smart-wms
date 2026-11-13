import type { WebhookSubscription, WebhookCreateInput } from '../entity/WebhookSubscription';

export interface WebhooksRepository {
	list(): Promise<WebhookSubscription[]>;
	create(input: WebhookCreateInput): Promise<WebhookSubscription>;
	remove(subscriptionId: string, purge?: boolean): Promise<void>;
	rotateSecret(subscriptionId: string): Promise<{ secret: string | null }>;
}
