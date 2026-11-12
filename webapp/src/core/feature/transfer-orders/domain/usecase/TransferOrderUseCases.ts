import type {TransferOrdersRepository} from '../repository/TransferOrdersRepository';import type {CreateTransferOrder} from '../entity/TransferOrder';
export class ListTransferOrdersUseCase{constructor(private r:TransferOrdersRepository){}execute(q?:{status?:string}){return this.r.list(q);}}
export class GetTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number){return this.r.detail(id);}}
export class CreateTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(v:CreateTransferOrder){if(!v.sourceWarehouseCode.trim()||!v.destinationWarehouseCode.trim()||v.sourceWarehouseCode===v.destinationWarehouseCode||!v.records.length)throw new Error('Origen, destino y al menos una línea son obligatorios');return this.r.create(v);}}
export class StartTransferOrderPickingUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number){return this.r.startPicking(id);}}
export class SubmitTransferOrderPicksUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number){return this.r.submitPicks(id);}}
export class ApproveTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number,a:number){return this.r.approve(id,a);}}
export class RejectTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number,a:number,reason:string){return this.r.reject(id,a,reason);}}
export class CancelTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number){return this.r.cancel(id);}}
export class DeleteTransferOrderUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number){return this.r.remove(id);}}
export class ShortCloseTransferOrderLineUseCase{constructor(private r:TransferOrdersRepository){}execute(id:number,lineId:number){return this.r.shortClose(id,lineId);}}