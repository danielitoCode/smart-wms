import type { ApiClient } from '../../../infrastructure/api/ApiClient';
import { apiClient } from '../../../infrastructure/api/ApiClient';
import { AdminOperationsRemoteDataSource } from '../data/datasource/AdminOperationsRemoteDataSource';
import { AdminOperationsRepositoryImpl } from '../data/repository/AdminOperationsRepositoryImpl';
import { ListAdminOperationUseCase } from '../domain/usecase/ListAdminOperationUseCase';

export function createAdminOperationsDependencies(api: ApiClient = apiClient) {
  const remote = new AdminOperationsRemoteDataSource(api);
  const repository = new AdminOperationsRepositoryImpl(remote);

  return {
    list: new ListAdminOperationUseCase(repository)
  };
}
