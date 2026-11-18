import { apiClient } from '../../../infrastructure/api/ApiClient';
import { WarehouseRemoteDataSource } from '../data/datasource/WarehouseRemoteDataSource';
import { BinLookupRemoteDataSource } from '../data/datasource/BinLookupRemoteDataSource';
import { WarehouseRepositoryImpl } from '../data/repository/WarehouseRepositoryImpl';
import { BinLookupRepositoryImpl } from '../data/repository/BinLookupRepositoryImpl';
import { ListWarehousesUseCase } from '../domain/usecase/ListWarehousesUseCase';
import { ListAdminWarehousesUseCase } from '../domain/usecase/ListAdminWarehousesUseCase';
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
import { SearchBinsUseCase } from '../domain/usecase/SearchBinsUseCase';
import { LookupBinByBarcodeUseCase } from '../domain/usecase/LookupBinByBarcodeUseCase';

export function createWarehousesDependencies() {
	const datasource = new WarehouseRemoteDataSource(apiClient);
	const repository = new WarehouseRepositoryImpl(datasource);
	const binLookupRepository = new BinLookupRepositoryImpl(new BinLookupRemoteDataSource(apiClient));
	return {
		listWarehouses: new ListWarehousesUseCase(repository),
		listAdminWarehouses: new ListAdminWarehousesUseCase(repository),
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
		getBinDetail: new GetBinDetailUseCase(repository),
		searchOperationalBins: new SearchBinsUseCase(binLookupRepository),
		lookupOperationalBin: new LookupBinByBarcodeUseCase(binLookupRepository)
	};
}

export type WarehousesDependencies = ReturnType<typeof createWarehousesDependencies>;
