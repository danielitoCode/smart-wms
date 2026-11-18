export type WebhookDto = {
	subscription_id: string;
	name: string;
	url?: string | null;
	status?: string | null;
	event_types?: string[] | null;
	created_at?: string | null;
	updated_at?: string | null;
	secret?: string | null;
};

export type WebhookListResponseDto = { webhooks?: WebhookDto[]; subscriptions?: WebhookDto[] };
