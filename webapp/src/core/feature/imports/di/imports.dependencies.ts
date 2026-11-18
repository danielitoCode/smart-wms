import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ImportsRemoteDataSource } from '../data/datasource/ImportsRemoteDataSource';
import { ImportsRepositoryImpl } from '../data/repository/ImportsRepositoryImpl';
import { ExecuteImportUseCase } from '../domain/usecase/ImportsUseCases';

export function createImportsDependencies() {
	const repository = new ImportsRepositoryImpl(new ImportsRemoteDataSource(apiClient));
	return { executeImport: new ExecuteImportUseCase(repository) };
}
