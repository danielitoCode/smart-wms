import type {CycleCountApproval} from '../../domain/entity/CycleCountApproval'
import type {CycleCountApprovalRepository} from '../../domain/repository/CycleCountApprovalRepository'
import type {CycleCountApprovalsRemoteDataSource} from '../datasource/CycleCountApprovalsRemoteDataSource'
import {CycleCountApprovalMapper} from '../mapper/CycleCountApprovalMapper';

export class CycleCountApprovalRepositoryImpl implements CycleCountApprovalRepository{
    constructor(private remote:CycleCountApprovalsRemoteDataSource){}

    async list():Promise<CycleCountApproval[]>{
        return CycleCountApprovalMapper.group(await this.remote.list())
    }

    review(_id:number,decisions:Array<{adjustmentId:number;action:'approve'|'reject'}>){
        return this.remote.review(decisions.map(x=>({
            adjustment_id:x.adjustmentId,action:x.action
        })))
    }
}