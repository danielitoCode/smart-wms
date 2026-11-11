import {apiClient} from '../../../infrastructure/api/ApiClient';
import {AdminOperationsRemoteDataSource} from '../data/datasource/AdminOperationsRemoteDataSource';
import {AdminOperationsRepositoryImpl} from '../data/repository/AdminOperationsRepositoryImpl';
import {ListAdminOperationUseCase} from '../domain/usecase/ListAdminOperationUseCase';
export function createAdminOperationsDependencies(){const ds=new AdminOperationsRemoteDataSource(apiClient);return {list:new ListAdminOperationUseCase(new AdminOperationsRepositoryImpl(ds))};}
