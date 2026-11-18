export type NotificationWebhook = {
	webhookId: string;
	name: string;
	url: string;
	active: boolean;
	createdAt: string | null;
};

export type NotificationWebhookCreateInput = {
	name: string;
	url: string;
};
