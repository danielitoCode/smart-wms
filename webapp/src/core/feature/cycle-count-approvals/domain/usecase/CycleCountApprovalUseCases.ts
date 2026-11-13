import type {CycleCountApprovalRepository} from '../repository/CycleCountApprovalRepository'

export class ListCycleCountApprovalsUseCase{
    constructor(private r:CycleCountApprovalRepository){}

    execute(){
        return this.r.list()
    }
}

export class ReviewCycleCountApprovalUseCase{
    constructor(private r:CycleCountApprovalRepository){}

    execute(id:number,decisions:Array<{adjustmentId:number;action:'approve'|'reject'}>){
        if(!decisions.length) throw new Error('No hay decisiones que enviar')
        return this.r.review(id,decisions)
    }
}