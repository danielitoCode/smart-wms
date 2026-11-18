import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ConsumerGroupsRemoteDataSource } from '../data/datasource/ConsumerGroupsRemoteDataSource';
import { ConsumerGroupsRepositoryImpl } from '../data/repository/ConsumerGroupsRepositoryImpl';
import {
	ListConsumerGroupsUseCase,
	ListConnectorRegistryUseCase,
	CreateConsumerGroupUseCase,
	DeleteConsumerGroupUseCase
} from '../domain/usecase/ConsumerGroupsUseCases';

export function createConsumerGroupsDependencies() {
	const repository = new ConsumerGroupsRepositoryImpl(new ConsumerGroupsRemoteDataSource(apiClient));
	return {
		listGroups: new ListConsumerGroupsUseCase(repository),
		listRegistry: new ListConnectorRegistryUseCase(repository),
		createGroup: new CreateConsumerGroupUseCase(repository),
		removeGroup: new DeleteConsumerGroupUseCase(repository)
	};
}
