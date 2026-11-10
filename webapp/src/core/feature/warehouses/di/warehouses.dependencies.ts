import { apiClient } from '../../../infrastructure/api/ApiClient';
import { WarehouseRemoteDataSource } from '../data/datasource/WarehouseRemoteDataSource';
import { WarehouseRepositoryImpl } from '../data/repository/WarehouseRepositoryImpl';
import { ListWarehousesUseCase } from '../domain/usecase/ListWarehousesUseCase';
import { ListBinsUseCase } from '../domain/usecase/ListBinsUseCase';
import { ListZonesUseCase } from '../domain/usecase/ListZonesUseCase';
import { GetWarehouseUseCase } from '../domain/usecase/GetWarehouseUseCase';

export function createWarehousesDependencies() {
	const datasource = new WarehouseRemoteDataSource(apiClient);
	const repository = new WarehouseRepositoryImpl(datasource);

	return {
		listWarehouses: new ListWarehousesUseCase(repository),
		listBins: new ListBinsUseCase(repository),
		listZones: new ListZonesUseCase(repository),
		getWarehouse: new GetWarehouseUseCase(repository)
	};
}

export type WarehousesDependencies = ReturnType<typeof createWarehousesDependencies>;
