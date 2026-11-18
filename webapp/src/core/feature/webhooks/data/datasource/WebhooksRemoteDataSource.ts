import type {ApiClient} from '#core/infrastructure/api/ApiClient';
import type {WebhookDto,WebhookListResponseDto,WebhookSecretDto,WebhookDeliveryDto,WebhookStatsDto,WebhookErrorDto,ReplayBatchResultDto,ConnectorRegistryResponseDto} from '../dto/WebhookDto';
export class WebhooksRemoteDataSource {
 constructor(private api:ApiClient){}
 list(){return this.api.get<WebhookListResponseDto>('/api/admin/webhooks');}
 listConnectors(){return this.api.get<ConnectorRegistryResponseDto>('/api/admin/connector-registry');}
 detail(id:string){return this.api.get<WebhookDto>(`/api/admin/webhooks/${encodeURIComponent(id)}`);}
 create(body:unknown){return this.api.post<WebhookSecretDto>('/api/admin/webhooks',body);}
 update(id:string,body:unknown){return this.api.patch<WebhookDto>(`/api/admin/webhooks/${encodeURIComponent(id)}`,body);}
 remove(id:string,purge=false){return this.api.delete<{subscription_id:string;purged:boolean;status?:string;tombstone_id?:number;live_count?:number}>(`/api/admin/webhooks/${encodeURIComponent(id)}${purge?'?purge=true':''}`);}
 rotateSecret(id:string){return this.api.post<WebhookSecretDto>(`/api/admin/webhooks/${encodeURIComponent(id)}/rotate-secret`,{});}
 dlq(id:string,limit:number,offset:number){return this.api.get<{subscription_id:string;deliveries:WebhookDeliveryDto[];total:number;limit:number;offset:number}>(`/api/admin/webhooks/${encodeURIComponent(id)}/dlq?limit=${limit}&offset=${offset}`);}
 stats(id:string,window:string){return this.api.get<WebhookStatsDto>(`/api/admin/webhooks/${encodeURIComponent(id)}/stats?window=${window}`);}
 errors(q:{subscriptionId?:string;errorKind?:string;from?:string;to?:string;limit:number;offset:number}){
  const p=new URLSearchParams({limit:String(q.limit),offset:String(q.offset)});
  if(q.subscriptionId)p.set('subscription_id',q.subscriptionId);if(q.errorKind)p.set('error_kind',q.errorKind);
  if(q.from)p.set('from',q.from);if(q.to)p.set('to',q.to);
  return this.api.get<{deliveries:WebhookErrorDto[];total:number;limit:number;offset:number;error_kinds:string[]}>(`/api/admin/webhook-errors?${p}`);
 }
 replayEvent(id:string,deliveryId:number){return this.api.post<{subscription_id:string;original_delivery_id:number;replayed_delivery_id:number}>(`/api/admin/webhooks/${encodeURIComponent(id)}/replay/${deliveryId}`,{});}
 replayBatch(id:string,filter:unknown,acknowledge:boolean){return this.api.post<ReplayBatchResultDto>(`/api/admin/webhooks/${encodeURIComponent(id)}/replay-batch`,{filter,acknowledge_large_replay:acknowledge});}
}
