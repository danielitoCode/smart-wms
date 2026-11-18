import type {WebhooksRepository} from '../repository/WebhooksRepository';
import type {WebhookCreateInput,WebhookUpdateInput,ReplayBatchFilter,WebhookStats} from '../entity/Webhook';
const required=(v:string,label:string,max:number)=>{const s=v.trim();if(!s)throw new Error(`${label} es obligatorio`);if(s.length>max)throw new Error(`${label} supera ${max} caracteres`);return s;};
function validateFilter(f:WebhookCreateInput['subscriptionFilter']){
 for(const [k,v] of Object.entries(f)){if(!Array.isArray(v))throw new Error(`${k} debe ser una lista`);if(v.length===0)throw new Error(`${k} no admite listas vacías; omite el filtro`);}
 if(f.warehouseIds?.some(v=>!Number.isInteger(v)||v<1))throw new Error('warehouse_ids debe contener enteros positivos');
 if(f.eventTypes?.some(v=>typeof v!=='string'||!v.trim()))throw new Error('event_types contiene valores inválidos');
 if(f.aggregateExternalIdAllowlist?.some(v=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)))throw new Error('aggregate_external_id_allowlist debe contener UUID válidos');
 return f;
}
export class ListWebhooksUseCase{constructor(private r:WebhooksRepository){}execute(){return this.r.list();}}
export class ListWebhookConnectorsUseCase{constructor(private r:WebhooksRepository){}execute(){return this.r.listConnectors();}}
export class GetWebhookUseCase{constructor(private r:WebhooksRepository){}execute(id:string){return this.r.detail(required(id,'Subscription ID',64));}}
export class CreateWebhookUseCase{
 constructor(private r:WebhooksRepository){}
 execute(i:WebhookCreateInput){const url=required(i.deliveryUrl,'URL destino',2048);if(!/^https?:\/\//i.test(url))throw new Error('La URL debe usar HTTP o HTTPS');
  if(!Number.isInteger(i.rateLimitPerSecond)||i.rateLimitPerSecond<1||i.rateLimitPerSecond>100)throw new Error('rate_limit_per_second debe estar entre 1 y 100');
  if(!Number.isInteger(i.pendingCeiling)||i.pendingCeiling<1||!Number.isInteger(i.dlqCeiling)||i.dlqCeiling<1)throw new Error('Los límites deben ser enteros positivos');
  return this.r.create({...i,connectorId:required(i.connectorId,'Conector',64),displayName:required(i.displayName,'Nombre',128),deliveryUrl:url,subscriptionFilter:validateFilter(i.subscriptionFilter)});
 }
}
export class UpdateWebhookUseCase{
 constructor(private r:WebhooksRepository){}
 execute(i:WebhookUpdateInput){if(i.displayName!==undefined)required(i.displayName,'Nombre',128);if(i.deliveryUrl!==undefined){const u=required(i.deliveryUrl,'URL destino',2048);if(!/^https?:\/\//i.test(u))throw new Error('La URL debe usar HTTP o HTTPS');}
  if(i.status!==undefined&&!['active','paused'].includes(i.status))throw new Error('Estado inválido');
  if(i.rateLimitPerSecond!==undefined&&(!Number.isInteger(i.rateLimitPerSecond)||i.rateLimitPerSecond<1||i.rateLimitPerSecond>100))throw new Error('rate_limit_per_second debe estar entre 1 y 100');
  if(i.pendingCeiling!==undefined&&(!Number.isInteger(i.pendingCeiling)||i.pendingCeiling<1))throw new Error('pending_ceiling debe ser positivo');
  if(i.dlqCeiling!==undefined&&(!Number.isInteger(i.dlqCeiling)||i.dlqCeiling<1))throw new Error('dlq_ceiling debe ser positivo');
  if(i.subscriptionFilter)validateFilter(i.subscriptionFilter);return this.r.update(i);
 }
}
export class DeleteWebhookUseCase{constructor(private r:WebhooksRepository){}execute(id:string,purge=false){return this.r.remove(required(id,'Subscription ID',64),purge);}}
export class RotateWebhookSecretUseCase{constructor(private r:WebhooksRepository){}execute(id:string){return this.r.rotateSecret(required(id,'Subscription ID',64));}}
export class GetWebhookDLQUseCase{constructor(private r:WebhooksRepository){}execute(id:string,limit=50,offset=0){if(!Number.isInteger(limit)||limit<1||limit>500||!Number.isInteger(offset)||offset<0)throw new Error('Paginación DLQ inválida');return this.r.getDlq(id,limit,offset);}}
export class GetWebhookStatsUseCase{constructor(private r:WebhooksRepository){}execute(id:string,w:WebhookStats['window']='24h'){return this.r.getStats(id,w);}}
export class GetWebhookErrorsUseCase{constructor(private r:WebhooksRepository){}execute(f:Parameters<WebhooksRepository['getErrors']>[0]){return this.r.getErrors(f);}}
export class ReplayWebhookEventUseCase{constructor(private r:WebhooksRepository){}execute(id:string,d:number){if(!Number.isInteger(d)||d<1)throw new Error('Delivery ID inválido');return this.r.replayEvent(id,d);}}
export class ReplayWebhookBatchUseCase{constructor(private r:WebhooksRepository){}execute(id:string,f:ReplayBatchFilter,a=false){
 if(!['dlq','failed','succeeded'].includes(f.status))throw new Error('Estado de replay inválido');
 if(f.warehouseId!==undefined&&(!Number.isInteger(f.warehouseId)||f.warehouseId<1))throw new Error('Warehouse ID inválido');
 if(f.completedAtFrom&&f.completedAtTo&&Date.parse(f.completedAtFrom)>Date.parse(f.completedAtTo))throw new Error('El rango de fechas es inválido');
 return this.r.replayBatch(id,f,a);
}}
