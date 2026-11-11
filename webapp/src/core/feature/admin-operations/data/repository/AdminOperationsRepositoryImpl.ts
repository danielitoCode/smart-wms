import type {AdminOperationKey,AdminOperationQuery,AdminOperationResult} from '../../domain/AdminOperation';
import type {AdminOperationsRemoteDataSource} from '../datasource/AdminOperationsRemoteDataSource';
export class AdminOperationsRepositoryImpl{constructor(private readonly remote:AdminOperationsRemoteDataSource){}list(f:AdminOperationKey,q?:AdminOperationQuery):Promise<AdminOperationResult>{return this.remote.list(f,q);}}
