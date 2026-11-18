export type WebhookStatus = 'active' | 'paused' | 'revoked';
export type WebhookConnector = { connectorId:string; displayName:string };
export type WebhookSubscriptionFilter = { eventTypes?:string[]; warehouseIds?:number[]; aggregateExternalIdAllowlist?:string[] };
export type WebhookStatsRollup = { attempts24h:number; succeeded24h:number; failed24h:number; dlq24h:number; successRate24h:number|null; pendingCount:number };
export type WebhookSubscription = {
 subscriptionId:string; connectorId:string; displayName:string; deliveryUrl:string; subscriptionFilter:WebhookSubscriptionFilter;
 status:WebhookStatus; pauseReason:string|null; rateLimitPerSecond:number; pendingCeiling:number; dlqCeiling:number;
 lastDeliveredEventId:number|null; createdAt:string|null; updatedAt:string|null; stats:WebhookStatsRollup;
};
export type WebhookCreateInput = { connectorId:string; displayName:string; deliveryUrl:string; subscriptionFilter:WebhookSubscriptionFilter; rateLimitPerSecond:number; pendingCeiling:number; dlqCeiling:number; acknowledgeUrlReuse?:boolean };
export type WebhookUpdateInput = Partial<Omit<WebhookCreateInput,'connectorId'|'acknowledgeUrlReuse'>> & { subscriptionId:string; status?:'active'|'paused'; acknowledgeUrlReuse?:boolean };
export type WebhookSecret = { subscriptionId:string; secret:string; secretGeneration:number };
export type WebhookDelivery = { deliveryId:number; eventId:number|null; attemptNumber:number; status:string; httpStatus:number|null; errorKind:string|null; errorDetail:string|null; attemptedAt:string|null; completedAt:string|null; scheduledAt:string|null; secretGeneration:number; event?:{eventType:string|null;eventTimestamp:string|null;aggregateExternalId:string|null;warehouseId:number|null;sourceTxnId:string|null} };
export type WebhookStats = { subscriptionId:string; window:'1h'|'6h'|'24h'|'7d'; generatedAt:number; attemptsTotal:number; succeeded:number; failed:number; dlq:number; inFlight:number; pending:number; successRate:number|null; responseTimeMs:{p50:number|null;p95:number|null;p99:number|null}; topErrorKinds:Array<{kind:string;count:number}>; currentLag:number };
export type WebhookError = { deliveryId:number; subscriptionId:string; subscriptionDisplayName:string; connectorId:string; eventId:number|null; attemptNumber:number; status:string; httpStatus:number|null; errorKind:string; errorDetail:string|null; shortMessage:string; description:string; triageHint:string; completedAt:string|null; attemptedAt:string|null; scheduledAt:string|null };
export type ReplayBatchFilter = { status:'dlq'|'failed'|'succeeded'; eventType?:string; warehouseId?:number; completedAtFrom?:string; completedAtTo?:string };
export type ReplayBatchResult = { subscriptionId:string; impactCount:number; replayedCount:number; matchedWithEventData:number; matchedWithoutEventData:number; detail?:string };
