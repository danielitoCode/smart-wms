import type {PickingBatchRepository} from '../../domain/repository/PickingBatchRepository';
import type {PickingBatch,ReleasePickingBatchResult} from '../../domain/entity/PickingBatch';
import type {PickingBatchRemoteDataSource} from '../datasource/PickingBatchRemoteDataSource';
import {PickingBatchMapper} from '../mapper/PickingBatchMapper';
export class PickingBatchRepositoryImpl implements PickingBatchRepository{
 constructor(private readonly source:PickingBatchRemoteDataSource){}
 async list(id:number):Promise<PickingBatch[]>{return (await this.source.list(id)).pick_batches.map(PickingBatchMapper.toDomain);}
 async release(id:number):Promise<ReleasePickingBatchResult>{return PickingBatchMapper.toReleaseResult(await this.source.release(id));}
}