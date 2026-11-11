import { apiClient } from '../../../infrastructure/api/ApiClient';
import { WarehouseRemoteDataSource } from '../data/datasource/WarehouseRemoteDataSource';
import { WarehouseRepositoryImpl } from '../data/repository/WarehouseRepositoryImpl';
import { ListWarehousesUseCase } from '../domain/usecase/ListWarehousesUseCase';
import { ListBinsUseCase } from '../domain/usecase/ListBinsUseCase';
import { ListZonesUseCase } from '../domain/usecase/ListZonesUseCase';
import { GetWarehouseUseCase } from '../domain/usecase/GetWarehouseUseCase';
import { CreateWarehouseUseCase } from '../domain/usecase/CreateWarehouseUseCase';
import { UpdateWarehouseUseCase } from '../domain/usecase/UpdateWarehouseUseCase';
import { DeleteWarehouseUseCase } from '../domain/usecase/DeleteWarehouseUseCase';
import { CreateZoneUseCase } from '../domain/usecase/CreateZoneUseCase';
import { UpdateZoneUseCase } from '../domain/usecase/UpdateZoneUseCase';
import { DeleteZoneUseCase } from '../domain/usecase/DeleteZoneUseCase';
import { CreateBinUseCase } from '../domain/usecase/CreateBinUseCase';
import { UpdateBinUseCase } from '../domain/usecase/UpdateBinUseCase';
import { DeleteBinUseCase } from '../domain/usecase/DeleteBinUseCase';
import { GetBinDetailUseCase } from '../domain/usecase/GetBinDetailUseCase';

export function createWarehousesDependencies() {
	const datasource = new WarehouseRemoteDataSource(apiClient);
	const repository = new WarehouseRepositoryImpl(datasource);
	return {
		listWarehouses: new ListWarehousesUseCase(repository),
		listBins: new ListBinsUseCase(repository),
		listZones: new ListZonesUseCase(repository),
		getWarehouse: new GetWarehouseUseCase(repository),
		createWarehouse: new CreateWarehouseUseCase(repository),
		updateWarehouse: new UpdateWarehouseUseCase(repository),
		deleteWarehouse: new DeleteWarehouseUseCase(repository),
		createZone: new CreateZoneUseCase(repository),
		updateZone: new UpdateZoneUseCase(repository),
		deleteZone: new DeleteZoneUseCase(repository),
		createBin: new CreateBinUseCase(repository),
		updateBin: new UpdateBinUseCase(repository),
		deleteBin: new DeleteBinUseCase(repository),
		getBinDetail: new GetBinDetailUseCase(repository)
	};
}

export type WarehousesDependencies = ReturnType<typeof createWarehousesDependencies>;
