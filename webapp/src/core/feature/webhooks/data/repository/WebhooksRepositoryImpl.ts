import type {WebhooksRepository} from '../../domain/repository/WebhooksRepository';
import type {WebhookCreateInput,WebhookUpdateInput,WebhookStats,ReplayBatchFilter,WebhookConnector} from '../../domain/entity/Webhook';
import {WebhooksRemoteDataSource} from '../datasource/WebhooksRemoteDataSource';
import {WebhookMapper} from '../mapper/WebhookMapper';
export class WebhooksRepositoryImpl implements WebhooksRepository {
 constructor(private remote:WebhooksRemoteDataSource){}
 async list(){return (await this.remote.list()).webhooks.map(WebhookMapper.toDomain);}
 async listConnectors():Promise<WebhookConnector[]>{return (await this.remote.listConnectors()).connectors.map(c=>({connectorId:c.connector_id,displayName:c.display_name}));}
 async detail(id:string){return WebhookMapper.toDomain(await this.remote.detail(id));}
 async create(i:WebhookCreateInput){
  const created=await this.remote.create({connector_id:i.connectorId,display_name:i.displayName,delivery_url:i.deliveryUrl,
   subscription_filter:this.filterDto(i.subscriptionFilter),rate_limit_per_second:i.rateLimitPerSecond,
   pending_ceiling:i.pendingCeiling,dlq_ceiling:i.dlqCeiling,acknowledge_url_reuse:i.acknowledgeUrlReuse??false});
  const webhook=WebhookMapper.toDomain(await this.remote.detail(created.subscription_id));
  return {webhook,secret:WebhookMapper.toSecret(created)};
 }
 async update(i:WebhookUpdateInput){
  const body:Record<string,unknown>={};
  if(i.displayName!==undefined)body.display_name=i.displayName;if(i.deliveryUrl!==undefined)body.delivery_url=i.deliveryUrl;
  if(i.subscriptionFilter!==undefined)body.subscription_filter=this.filterDto(i.subscriptionFilter);
  if(i.rateLimitPerSecond!==undefined)body.rate_limit_per_second=i.rateLimitPerSecond;
  if(i.pendingCeiling!==undefined)body.pending_ceiling=i.pendingCeiling;if(i.dlqCeiling!==undefined)body.dlq_ceiling=i.dlqCeiling;
  if(i.status!==undefined)body.status=i.status;if(i.acknowledgeUrlReuse!==undefined)body.acknowledge_url_reuse=i.acknowledgeUrlReuse;
  return WebhookMapper.toDomain(await this.remote.update(i.subscriptionId,body));
 }
 async remove(id:string,purge=false){const d=await this.remote.remove(id,purge);return {purged:d.purged,status:d.status,liveCount:d.live_count};}
 async rotateSecret(id:string){return WebhookMapper.toSecret(await this.remote.rotateSecret(id));}
 async getDlq(id:string,limit:number,offset:number){const d=await this.remote.dlq(id,limit,offset);return {...d,deliveries:d.deliveries.map(WebhookMapper.toDelivery)};}
 async getStats(id:string,w:WebhookStats['window']){return WebhookMapper.toStats(await this.remote.stats(id,w));}
 async getErrors(q:Parameters<WebhooksRepository['getErrors']>[0]){const d=await this.remote.errors(q);return {...d,errorKinds:d.error_kinds,deliveries:d.deliveries.map(WebhookMapper.toError)};}
 async replayEvent(id:string,did:number){const d=await this.remote.replayEvent(id,did);return {originalDeliveryId:d.original_delivery_id,replayedDeliveryId:d.replayed_delivery_id};}
 async replayBatch(id:string,f:ReplayBatchFilter,a=false){
  const d=await this.remote.replayBatch(id,{status:f.status,...(f.eventType?{event_type:f.eventType}:{}),...(f.warehouseId?{warehouse_id:f.warehouseId}:{}),...(f.completedAtFrom?{completed_at_from:f.completedAtFrom}:{}),...(f.completedAtTo?{completed_at_to:f.completedAtTo}:{})},a);
  return WebhookMapper.toReplay(d);
 }
 private filterDto(f:WebhookCreateInput['subscriptionFilter']){
  return {...(f.eventTypes?.length?{event_types:f.eventTypes}:{}),...(f.warehouseIds?.length?{warehouse_ids:f.warehouseIds}:{}),...(f.aggregateExternalIdAllowlist?.length?{aggregate_external_id_allowlist:f.aggregateExternalIdAllowlist}:{})};
 }
}
