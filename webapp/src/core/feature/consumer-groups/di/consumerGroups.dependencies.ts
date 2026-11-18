import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ConsumerGroupsRemoteDataSource } from '../data/datasource/ConsumerGroupsRemoteDataSource';
import { ConsumerGroupsRepositoryImpl } from '../data/repository/ConsumerGroupsRepositoryImpl';
import {
  ListConsumerGroupsUseCase, ListConnectorRegistryUseCase, CreateConnectorUseCase,
  UpdateConnectorUseCase, DeleteConnectorUseCase, CreateConsumerGroupUseCase,
  UpdateConsumerGroupUseCase, DeleteConsumerGroupUseCase
} from '../domain/usecase/ConsumerGroupsUseCases';

export function createConsumerGroupsDependencies() {
  const repository = new ConsumerGroupsRepositoryImpl(new ConsumerGroupsRemoteDataSource(apiClient));
  return {
    listGroups: new ListConsumerGroupsUseCase(repository),
    listRegistry: new ListConnectorRegistryUseCase(repository),
    createConnector: new CreateConnectorUseCase(repository),
    updateConnector: new UpdateConnectorUseCase(repository),
    removeConnector: new DeleteConnectorUseCase(repository),
    createGroup: new CreateConsumerGroupUseCase(repository),
    updateGroup: new UpdateConsumerGroupUseCase(repository),
    removeGroup: new DeleteConsumerGroupUseCase(repository)
  };
}
