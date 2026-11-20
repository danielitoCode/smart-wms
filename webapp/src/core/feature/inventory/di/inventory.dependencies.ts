import { apiClient } from '../../../infrastructure/api/ApiClient';
import { InventoryRemoteDataSource } from '../data/datasource/InventoryRemoteDataSource';
import { InventoryRepositoryImpl } from '../data/repository/InventoryRepositoryImpl';
import { GetInventoryOverviewUseCase } from '../domain/usecase/GetInventoryOverviewUseCase';
import { GetItemInventoryUseCase } from '../domain/usecase/GetItemInventoryUseCase';
import { LookupBarcodeUseCase } from '../domain/usecase/LookupBarcodeUseCase';
import { SearchInventoryUseCase } from '../domain/usecase/SearchInventoryUseCase';
import { CreateCycleCountUseCase } from '../domain/usecase/CreateCycleCountUseCase';
import { GetCycleCountUseCase } from '../domain/usecase/GetCycleCountUseCase';
import { SubmitCycleCountUseCase } from '../domain/usecase/SubmitCycleCountUseCase';

export function createInventoryDependencies() {
	const datasource = new InventoryRemoteDataSource(apiClient);
	const repository = new InventoryRepositoryImpl(datasource);

	return {
		getInventoryOverview: new GetInventoryOverviewUseCase(repository),
		getItemInventory: new GetItemInventoryUseCase(repository),
		searchInventory: new SearchInventoryUseCase(repository),
		lookupBarcode: new LookupBarcodeUseCase(repository),
		createCycleCount: new CreateCycleCountUseCase(repository),
		getCycleCount: new GetCycleCountUseCase(repository),
		submitCycleCount: new SubmitCycleCountUseCase(repository)
	};
}

export type InventoryDependencies = ReturnType<typeof createInventoryDependencies>;
