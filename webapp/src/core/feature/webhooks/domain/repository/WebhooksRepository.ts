import type {WebhookConnector,WebhookSubscription,WebhookCreateInput,WebhookUpdateInput,WebhookSecret,WebhookDelivery,WebhookStats,WebhookError,ReplayBatchFilter,ReplayBatchResult} from '../entity/Webhook';
export interface WebhooksRepository {
 list():Promise<WebhookSubscription[]>; listConnectors():Promise<WebhookConnector[]>; detail(id:string):Promise<WebhookSubscription>;
 create(input:WebhookCreateInput):Promise<{webhook:WebhookSubscription;secret:WebhookSecret}>; update(input:WebhookUpdateInput):Promise<WebhookSubscription>;
 remove(id:string,purge?:boolean):Promise<{purged:boolean;status?:string;liveCount?:number}>; rotateSecret(id:string):Promise<WebhookSecret>;
 getDlq(id:string,limit:number,offset:number):Promise<{deliveries:WebhookDelivery[];total:number;limit:number;offset:number}>;
 getStats(id:string,window:WebhookStats['window']):Promise<WebhookStats>;
 getErrors(filters:{subscriptionId?:string;errorKind?:string;from?:string;to?:string;limit:number;offset:number}):Promise<{deliveries:WebhookError[];total:number;errorKinds:string[];limit:number;offset:number}>;
 replayEvent(id:string,deliveryId:number):Promise<{originalDeliveryId:number;replayedDeliveryId:number}>;
 replayBatch(id:string,filter:ReplayBatchFilter,acknowledgeLargeReplay?:boolean):Promise<ReplayBatchResult>;
}
