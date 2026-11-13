export type NotificationWebhookDto = {
	webhook_id: string;
	name: string;
	url?: string | null;
	active?: boolean | null;
	created_at?: string | null;
};

export type NotificationWebhookListResponseDto = {
	webhooks?: NotificationWebhookDto[];
	notification_webhooks?: NotificationWebhookDto[];
};
