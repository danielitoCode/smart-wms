import { apiClient } from '../../../infrastructure/api/ApiClient';
import { VendorRemoteDataSource } from '../data/datasource/VendorRemoteDataSource';
import { VendorRepositoryImpl } from '../data/repository/VendorRepositoryImpl';
import { GetAllVendorsUseCase } from '../domain/usecase/GetAllVendorsUseCase';
import { GetVendorByIdUseCase } from '../domain/usecase/GetVendorByIdUseCase';
import { SaveNewVendorUseCase } from '../domain/usecase/SaveNewVendorUseCase';
import { ModifyVendorUseCase } from '../domain/usecase/ModifyVendorUseCase';
import { DeleteVendorUseCase } from '../domain/usecase/DeleteVendorUseCase';

export function createVendorDependencies() {
	const repository = new VendorRepositoryImpl(new VendorRemoteDataSource(apiClient));
	return {
		list: new GetAllVendorsUseCase(repository),
		get: new GetVendorByIdUseCase(repository),
		create: new SaveNewVendorUseCase(repository),
		update: new ModifyVendorUseCase(repository),
		remove: new DeleteVendorUseCase(repository)
	};
}
