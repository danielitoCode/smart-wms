import type { Return,ReturnBinOption,ReturnReceipt,ReturnWarehouseOption } from '../../domain/entity/Return';
import type { ReturnsRepository } from '../../domain/repository/ReturnsRepository';
import type { ReturnsRemoteDataSource } from '../datasource/ReturnsRemoteDataSource';
import { ReturnMapper } from '../mapper/ReturnMapper';
export class ReturnsRepositoryImpl implements ReturnsRepository {
 constructor(private remote:ReturnsRemoteDataSource){}
 async list(q?:{status?:string;search?:string}):Promise<Return[]>{return (await this.remote.list(q)).map(x=>ReturnMapper.header(x));}
 async detail(id:number):Promise<Return>{const [r,receipts]=await Promise.all([this.remote.detail(id),this.remote.receipts(id)]);return ReturnMapper.header(r.sales_order,r.lines,receipts);}
 saveMemo(id:number,memo:string){return this.remote.saveMemo(id,memo);}
 receive(id:number,v:{itemId:number;quantity:number;warehouseId:number;binId:number;notes?:string|null;idempotencyKey:string}){return this.remote.receive(id,{item_id:v.itemId,quantity:v.quantity,warehouse_id:v.warehouseId,bin_id:v.binId,notes:v.notes,idempotency_key:v.idempotencyKey});}
 void(id:number){return this.remote.void(id);}
 async warehouses():Promise<ReturnWarehouseOption[]>{return (await this.remote.warehouses()).map(x=>({warehouseId:x.warehouse_id,warehouseCode:x.warehouse_code,warehouseName:x.warehouse_name}));}
 async bins(id:number,q:string):Promise<ReturnBinOption[]>{return (await this.remote.bins(id,q)).map(x=>({binId:x.bin_id,binCode:x.bin_code,warehouseId:x.warehouse_id,zoneName:x.zone_name}));}
 async receipts(id:number):Promise<ReturnReceipt[]>{return (await this.remote.receipts(id)).map(ReturnMapper.receipt);}
}
