import type {PurchaseOrdersRepository} from '../repository/PurchaseOrdersRepository';import type {CreatePurchaseOrder,UpdatePurchaseOrder} from '../entity/PurchaseOrder';
export class ListPurchaseOrdersUseCase{constructor(private r:PurchaseOrdersRepository){}execute(q?:{warehouseId?:number|null;search?:string;status?:string}){return this.r.list(q);}}
export class GetPurchaseOrderUseCase{constructor(private r:PurchaseOrdersRepository){}execute(id:number){return this.r.detail(id);}}
export class CreatePurchaseOrderUseCase{constructor(private r:PurchaseOrdersRepository){}execute(v:CreatePurchaseOrder){if(!v.poNumber.trim()||v.warehouseId<=0||!v.lines.length)throw new Error('La orden requiere número, almacén y al menos una línea');return this.r.create(v);}}
export class UpdatePurchaseOrderUseCase{constructor(private r:PurchaseOrdersRepository){}execute(id:number,v:UpdatePurchaseOrder){return this.r.update(id,v);}}
export class ClosePurchaseOrderUseCase{constructor(private r:PurchaseOrdersRepository){}execute(id:number){return this.r.close(id);}}
export class ReopenPurchaseOrderUseCase{constructor(private r:PurchaseOrdersRepository){}execute(id:number){return this.r.reopen(id);}}