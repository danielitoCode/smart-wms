export type WebhookSubscription = {
	subscriptionId: string;
	name: string;
	url: string;
	status: string;
	eventTypes: string[];
	createdAt: string | null;
	updatedAt: string | null;
};

export type WebhookCreateInput = {
	name: string;
	url: string;
	eventTypes: string[];
};
