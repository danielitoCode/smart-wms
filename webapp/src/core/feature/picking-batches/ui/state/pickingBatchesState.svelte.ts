import {createPickingBatchesDependencies} from '../../di/pickingBatches.dependencies';
import type {PickingBatch} from '../../domain/entity/PickingBatch';
import {toUserMessage} from '#core/infrastructure/errors/ApiError.ts';
const deps=createPickingBatchesDependencies();
export function createPickingBatchesState(){
 let rows=$state<PickingBatch[]>([]),detail=$state<PickingBatch|null>(null),loading=$state(false),detailLoading=$state(false),saving=$state(false),error=$state<string|null>(null),detailError=$state<string|null>(null),epoch=0,detailEpoch=0;
 async function load(warehouseId:number|null){const e=++epoch;if(warehouseId==null){rows=[];loading=false;error=null;return;}loading=true;error=null;try{const result=await deps.list.execute(warehouseId);if(e===epoch)rows=result;}catch(cause){if(e===epoch){rows=[];error=toUserMessage(cause,'No se pudieron cargar los lotes de picking');}}finally{if(e===epoch)loading=false;}}
 async function loadDetail(warehouseId:number|null,id:number){const e=++detailEpoch;detail=null;detailLoading=true;detailError=null;if(warehouseId==null){detailError='Selecciona un almacén para consultar el lote.';detailLoading=false;return;}try{const result=await deps.detail.execute(warehouseId,id);if(e===detailEpoch)detail=result;}catch(cause){if(e===detailEpoch)detailError=toUserMessage(cause,'No se pudo cargar el detalle del lote');}finally{if(e===detailEpoch)detailLoading=false;}}
 async function release(batch:PickingBatch){if(saving)return null;saving=true;error=null;try{return await deps.release.execute(batch);}catch(cause){error=toUserMessage(cause,'No se pudo liberar el lote');return null;}finally{saving=false;}}
 return {get rows(){return rows;},get detail(){return detail;},get loading(){return loading;},get detailLoading(){return detailLoading;},get saving(){return saving;},get error(){return error;},get detailError(){return detailError;},load,loadDetail,release};
}