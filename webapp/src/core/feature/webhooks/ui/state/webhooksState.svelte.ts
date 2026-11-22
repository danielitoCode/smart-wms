import {createWebhooksDependencies} from '../../di/webhooks.dependencies';
import type {WebhookSubscription,WebhookCreateInput,WebhookUpdateInput,WebhookSecret,WebhookDelivery,WebhookStats,WebhookError,ReplayBatchFilter,ReplayBatchResult,WebhookConnector} from '../../domain/entity/Webhook';
import {toUserMessage,ApiError} from '../../../../infrastructure/errors/ApiError';
export function createWebhooksState(deps=createWebhooksDependencies()){
 let rows=$state<WebhookSubscription[]>([]),connectors=$state<WebhookConnector[]>([]),selected=$state<WebhookSubscription|null>(null);
 let dlq=$state<WebhookDelivery[]>([]),dlqTotal=$state(0),stats=$state<WebhookStats|null>(null);
 let errors=$state<WebhookError[]>([]),errorKinds=$state<string[]>([]),errorsTotal=$state(0);
 let loading=$state(false),saving=$state(false),error=$state<string|null>(null),secret=$state<WebhookSecret|null>(null);
 let urlReuse=$state<{tombstoneId:number;detail:string}|null>(null),lastReplay=$state<ReplayBatchResult|null>(null);
 let request=0;
 function captureUrlReuse(e:unknown){if(e instanceof ApiError&&e.status===409&&e.details&&typeof e.details==='object'){const b=e.details as Record<string,unknown>;if(b.error==='url_reuse_tombstone')urlReuse={tombstoneId:Number(b.tombstone_id)||0,detail:String(b.detail??'La URL pertenece a una suscripción eliminada.')}}}
 async function load(){const id=++request;loading=true;error=null;try{const [r,c]=await Promise.all([deps.list.execute(),deps.listConnectors.execute().catch(()=>[])]);if(id===request){rows=r;connectors=c;}}catch(e){if(id===request)error=toUserMessage(e,'No se pudieron cargar los webhooks');}finally{if(id===request)loading=false;}}
 async function run<T>(fn:()=>Promise<T>,fallback:string):Promise<T|null>{saving=true;error=null;try{return await fn();}catch(e){error=toUserMessage(e,fallback);captureUrlReuse(e);return null;}finally{saving=false;}}
 async function create(i:WebhookCreateInput){urlReuse=null;secret=null;saving=true;error=null;try{const r=await deps.create.execute(i);secret=r.secret;selected=r.webhook;await load();return true;}catch(e){error=toUserMessage(e,'No se pudo crear el webhook');captureUrlReuse(e);return false;}finally{saving=false;}}
 async function createAcknowledged(i:WebhookCreateInput){return create({...i,acknowledgeUrlReuse:true});}
 async function update(i:WebhookUpdateInput){urlReuse=null;const r=await run(()=>deps.update.execute(i),'No se pudo actualizar el webhook');if(!r)return false;selected=r;await load();return true;}
 async function updateAcknowledged(i:WebhookUpdateInput){return update({...i,acknowledgeUrlReuse:true});}
 async function setStatus(row:WebhookSubscription,status:'active'|'paused'){return update({subscriptionId:row.subscriptionId,status});}
 async function remove(id:string,purge=false){const r=await run(()=>deps.remove.execute(id,purge),'No se pudo eliminar el webhook');if(!r)return null;selected=null;await load();return r;}
 async function rotate(id:string){secret=null;const r=await run(()=>deps.rotateSecret.execute(id),'No se pudo rotar el secreto');if(!r)return false;secret=r;await load();return true;}
 async function detail(id:string){const r=await run(()=>deps.detail.execute(id),'No se pudo cargar el detalle');if(!r)return false;selected=r;return true;}
 async function loadDlq(id:string,limit=50,offset=0){const r=await run(()=>deps.getDlq.execute(id,limit,offset),'No se pudo cargar la DLQ');if(!r)return false;dlq=r.deliveries;dlqTotal=r.total;return true;}
 async function loadStats(id:string,w:WebhookStats['window']='24h'){const r=await run(()=>deps.getStats.execute(id,w),'No se pudieron cargar las estadísticas');if(!r)return false;stats=r;return true;}
 async function loadErrors(q:Parameters<typeof deps.getErrors.execute>[0]){const r=await run(()=>deps.getErrors.execute(q),'No se pudieron cargar los errores');if(!r)return false;errors=r.deliveries;errorKinds=r.errorKinds;errorsTotal=r.total;return true;}
 async function replayOne(id:string,d:number){const r=await run(()=>deps.replayEvent.execute(id,d),'No se pudo repetir la entrega');if(!r)return false;await loadDlq(id);await detail(id);await loadStats(id,stats?.window??'24h');await load();return true;}
 async function replayMany(id:string,f:ReplayBatchFilter,ack=false){const r=await run(()=>deps.replayBatch.execute(id,f,ack),'No se pudo ejecutar el replay por lotes');if(!r)return null;lastReplay=r;await loadDlq(id);await detail(id);await loadStats(id,stats?.window??'24h');await load();return r;}
 return {get rows(){return rows;},get connectors(){return connectors;},get selected(){return selected;},get dlq(){return dlq;},get dlqTotal(){return dlqTotal;},get stats(){return stats;},get errors(){return errors;},get errorKinds(){return errorKinds;},get errorsTotal(){return errorsTotal;},get loading(){return loading;},get saving(){return saving;},get error(){return error;},get secret(){return secret;},get urlReuse(){return urlReuse;},get lastReplay(){return lastReplay;},
 clearSecret(){secret=null;},clearError(){error=null;},clearReplay(){lastReplay=null;},clearSelected(){selected=null;},load,create,createAcknowledged,update,updateAcknowledged,setStatus,remove,rotate,detail,loadDlq,loadStats,loadErrors,replayOne,replayMany};
}
