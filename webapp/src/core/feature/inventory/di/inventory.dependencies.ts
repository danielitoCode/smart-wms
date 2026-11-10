import { apiClient } from '../../../infrastructure/api/ApiClient';
import { InventoryRemoteDataSource } from '../data/datasource/InventoryRemoteDataSource';
import { InventoryRepositoryImpl } from '../data/repository/InventoryRepositoryImpl';
import { GetInventoryOverviewUseCase } from '../domain/usecase/GetInventoryOverviewUseCase';
import { CreateCycleCountUseCase } from '../domain/usecase/CreateCycleCountUseCase';
import { GetCycleCountUseCase } from '../domain/usecase/GetCycleCountUseCase';
import { SubmitCycleCountUseCase } from '../domain/usecase/SubmitCycleCountUseCase';

export function createInventoryDependencies() {
	const datasource = new InventoryRemoteDataSource(apiClient);
	const repository = new InventoryRepositoryImpl(datasource);

	return {
		getInventoryOverview: new GetInventoryOverviewUseCase(repository),
		createCycleCount: new CreateCycleCountUseCase(repository),
		getCycleCount: new GetCycleCountUseCase(repository),
		submitCycleCount: new SubmitCycleCountUseCase(repository)
	};
}

export type InventoryDependencies = ReturnType<typeof createInventoryDependencies>;
