import type {PurchaseOrder,CreatePurchaseOrder,UpdatePurchaseOrder} from '../../domain/entity/PurchaseOrder';import type {PurchaseOrdersRepository} from '../../domain/repository/PurchaseOrdersRepository';import type {PurchaseOrdersRemoteDataSource} from '../datasource/PurchaseOrdersRemoteDataSource';import {PurchaseOrderMapper as M} from '../mapper/PurchaseOrderMapper';
export class PurchaseOrdersRepositoryImpl implements PurchaseOrdersRepository{constructor(private remote:PurchaseOrdersRemoteDataSource){}
 async list(q?:{warehouseId?:number|null;search?:string;status?:string}):Promise<PurchaseOrder[]>{return (await this.remote.list(q)).map(d=>M.header(d));}
 async detail(id:number):Promise<PurchaseOrder>{const r=await this.remote.detail(id);return M.header(r.purchase_order,r.lines);}
 async create(v:CreatePurchaseOrder):Promise<PurchaseOrder>{const r=await this.remote.create(M.create(v));return M.header(r.purchase_order,r.lines);}
 async update(id:number,v:UpdatePurchaseOrder){await this.remote.update(id,M.update(v));}
 async close(id:number){await this.remote.lifecycle(id,'close');}
 async reopen(id:number){await this.remote.lifecycle(id,'reopen');}
}