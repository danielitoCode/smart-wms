import { apiClient } from '../../../infrastructure/api/ApiClient';
import { IntegrationsRemoteDataSource } from '../data/datasource/IntegrationsRemoteDataSource';
import { IntegrationsRepositoryImpl } from '../data/repository/IntegrationsRepositoryImpl';
import { ListConnectorsUseCase, GetConfigSchemaUseCase, GetCredentialsUseCase, SaveCredentialsUseCase, TestConnectionUseCase, GetSyncStatusUseCase, ResetSyncUseCase, ExecuteSyncUseCase, DeleteCredentialsUseCase, TestConnectorUseCase } from '../domain/usecase/IntegrationsUseCases';
export function createIntegrationsDependencies() {
  const repository = new IntegrationsRepositoryImpl(new IntegrationsRemoteDataSource(apiClient));
  return {
    list: new ListConnectorsUseCase(repository),
    schema: new GetConfigSchemaUseCase(repository),
    credentials: new GetCredentialsUseCase(repository),
    save: new SaveCredentialsUseCase(repository),
    testConnection: new TestConnectionUseCase(repository),
    syncStatus: new GetSyncStatusUseCase(repository),
    resetSync: new ResetSyncUseCase(repository),
    executeSync: new ExecuteSyncUseCase(repository),
    deleteCredentials: new DeleteCredentialsUseCase(repository),
    test: new TestConnectorUseCase(repository)
  };
}
