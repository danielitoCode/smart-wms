import type {ReturnsRepository} from '../repository/ReturnsRepository';
export class ListReturnsUseCase{constructor(private r:ReturnsRepository){}execute(q?:{status?:string;search?:string}){return this.r.list(q);}}
export class GetReturnDetailUseCase{constructor(private r:ReturnsRepository){}execute(id:number){return this.r.detail(id);}}
export class SaveReturnMemoUseCase{constructor(private r:ReturnsRepository){}execute(id:number,memo:string){if(memo.length>4000)throw new Error('La nota supera los 4000 caracteres');return this.r.saveMemo(id,memo);}}
export class ReceiveReturnLineUseCase{constructor(private r:ReturnsRepository){}execute(id:number,v:{itemId:number;quantity:number;warehouseId:number;binId:number;notes?:string|null;idempotencyKey:string}){if(id<=0||v.itemId<=0||v.quantity<=0||v.warehouseId<=0||v.binId<=0)throw new Error('Datos de recepción no válidos');return this.r.receive(id,v);}}
export class VoidReturnUseCase{constructor(private r:ReturnsRepository){}execute(id:number){return this.r.void(id);}}
export class ListReturnWarehousesUseCase{constructor(private r:ReturnsRepository){}execute(){return this.r.warehouses();}}
export class SearchReturnBinsUseCase{constructor(private r:ReturnsRepository){}execute(id:number,q:string){if(q.trim().length<1)return Promise.resolve([]);return this.r.bins(id,q.trim());}}