import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PreferredBinsRemoteDataSource } from '../data/datasource/PreferredBinsRemoteDataSource';
import { PreferredBinsRepositoryImpl } from '../data/repository/PreferredBinsRepositoryImpl';
import {
	AddPreferredBinUseCase,
	ListPreferredBinCatalogUseCase,
	ListPreferredBinsUseCase,
	RemovePreferredBinUseCase,
	UpdatePreferredBinPriorityUseCase
} from '../domain/usecase/PreferredBinUseCases';

export function createPreferredBinsDependencies() {
	const repository = new PreferredBinsRepositoryImpl(new PreferredBinsRemoteDataSource(apiClient));
	return {
		list: new ListPreferredBinsUseCase(repository),
		catalog: new ListPreferredBinCatalogUseCase(repository),
		add: new AddPreferredBinUseCase(repository),
		updatePriority: new UpdatePreferredBinPriorityUseCase(repository),
		remove: new RemovePreferredBinUseCase(repository)
	};
}

export type PreferredBinsDependencies = ReturnType<typeof createPreferredBinsDependencies>;
