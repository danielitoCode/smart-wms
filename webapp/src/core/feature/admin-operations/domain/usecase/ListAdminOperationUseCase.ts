import type {AdminOperationKey,AdminOperationQuery,AdminOperationResult} from '../AdminOperation';
import type {AdminOperationsRepositoryImpl} from '../../data/repository/AdminOperationsRepositoryImpl';
export class ListAdminOperationUseCase{constructor(private readonly repo:AdminOperationsRepositoryImpl){}execute(f:AdminOperationKey,q?:AdminOperationQuery):Promise<AdminOperationResult>{return this.repo.list(f,q);}}
