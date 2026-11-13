import { apiClient } from '../../../infrastructure/api/ApiClient';
import { IntegrationsRemoteDataSource } from '../data/datasource/IntegrationsRemoteDataSource';
import { IntegrationsRepositoryImpl } from '../data/repository/IntegrationsRepositoryImpl';
import { ListConnectorsUseCase, TestConnectorUseCase } from '../domain/usecase/IntegrationsUseCases';

export function createIntegrationsDependencies() {
	const repository = new IntegrationsRepositoryImpl(new IntegrationsRemoteDataSource(apiClient));
	return {
		list: new ListConnectorsUseCase(repository),
		test: new TestConnectorUseCase(repository)
	};
}
