import {apiClient} from '../../../infrastructure/api/ApiClient'
import {CycleCountApprovalsRemoteDataSource} from '../data/datasource/CycleCountApprovalsRemoteDataSource';
import {CycleCountApprovalRepositoryImpl} from '../data/repository/CycleCountApprovalRepositoryImpl'
import {ListCycleCountApprovalsUseCase,ReviewCycleCountApprovalUseCase} from '../domain/usecase/CycleCountApprovalUseCases'

export function createCycleCountApprovalsDependencies(){
    const r=new CycleCountApprovalRepositoryImpl(new CycleCountApprovalsRemoteDataSource(apiClient))
    return {
        list:new ListCycleCountApprovalsUseCase(r),
        review:new ReviewCycleCountApprovalUseCase(r)
    }
}