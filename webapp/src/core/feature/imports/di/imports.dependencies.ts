import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ImportsRemoteDataSource } from '../data/datasource/ImportsRemoteDataSource';
import { ImportsRepositoryImpl } from '../data/repository/ImportsRepositoryImpl';
import { ImportCsvUseCase } from '../domain/usecase/ImportsUseCases';

export function createImportsDependencies() {
	const repository = new ImportsRepositoryImpl(new ImportsRemoteDataSource(apiClient));
	return { importCsv: new ImportCsvUseCase(repository) };
}
