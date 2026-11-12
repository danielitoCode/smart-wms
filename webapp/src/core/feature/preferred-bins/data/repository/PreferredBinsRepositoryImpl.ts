import type {PreferredBin,PreferredBinCandidate} from '../../domain/entity/PreferredBin';
import type {PreferredBinsRepository} from '../../domain/repository/PreferredBinsRepository';
import type {PreferredBinsRemoteDataSource} from '../datasource/PreferredBinsRemoteDataSource';
import {PreferredBinMapper as M} from '../mapper/PreferredBinMapper';
export class PreferredBinsRepositoryImpl implements PreferredBinsRepository{constructor(private readonly remote:PreferredBinsRemoteDataSource){}
 async list(q?:{search?:string;itemId?:number}):Promise<PreferredBin[]>{return (await this.remote.list(q)).map(M.toDomain);}
 create(v:PreferredBinCandidate){return this.remote.create(M.toCreateDto(v));}
 update(id:number,priority:number){return this.remote.update(id,M.toUpdateDto({priority}));}
 remove(id:number){return this.remote.remove(id);}
}