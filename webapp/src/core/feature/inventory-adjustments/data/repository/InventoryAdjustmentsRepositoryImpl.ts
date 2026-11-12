import type {InventoryAdjustment,CreateInventoryAdjustment,InventoryAdjustmentDecision} from '../../domain/entity/InventoryAdjustment';import type {InventoryAdjustmentsRepository} from '../../domain/repository/InventoryAdjustmentsRepository';import type {InventoryAdjustmentsRemoteDataSource} from '../datasource/InventoryAdjustmentsRemoteDataSource';import {InventoryAdjustmentMapper as M} from '../mapper/InventoryAdjustmentMapper';
export class InventoryAdjustmentsRepositoryImpl implements InventoryAdjustmentsRepository{constructor(private remote:InventoryAdjustmentsRemoteDataSource){}
 async list(q?:{warehouseId?:number|null;pending?:boolean}):Promise<InventoryAdjustment[]>{return (await this.remote.list(q)).map(M.toDomain);}
 async create(v:CreateInventoryAdjustment){await this.remote.create(M.createDto(v));}
 async review(v:InventoryAdjustmentDecision[]){await this.remote.review(M.reviewDto(v));}
}