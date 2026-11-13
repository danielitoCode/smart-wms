import type {ApiClient} from '#core/infrastructure/api/ApiClient.ts'
import type {PendingCycleCountApprovalsDto} from '../dto/CycleCountApprovalDto'

export class CycleCountApprovalsRemoteDataSource{
    constructor(private api:ApiClient){}

    async list(){
        const r=await this.api.get<PendingCycleCountApprovalsDto>('/api/admin/adjustments/pending')
        return r.adjustments??[]
    }

    async review(decisions:Array<{adjustment_id:number;action:'approve'|'reject'}>){
        await this.api.post<unknown>('/api/admin/adjustments/review',{decisions})
    }
}