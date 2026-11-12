import {apiClient} from '../../../infrastructure/api/ApiClient';
import {VendorRemoteDataSource} from '../data/datasource/VendorRemoteDataSource';
import {VendorRepositoryImpl} from '../data/repository/VendorRepositoryImpl';
import {GetAllVendorsUseCase} from '../domain/usecase/GetAllVendorsUseCase';
import {GetVendorByIdUseCase} from '../domain/usecase/GetVendorByIdUseCase';
import {SaveNewVendorUseCase} from '../domain/usecase/SaveNewVendorUseCase';
import {ModifyVendorUseCase} from '../domain/usecase/ModifyVendorUseCase';
import {DeleteVendorUseCase} from '../domain/usecase/DeleteVendorUseCase';
export function createVendorDependencies(){const repo=new VendorRepositoryImpl(new VendorRemoteDataSource(apiClient));return {list:new GetAllVendorsUseCase(repo),get:new GetVendorByIdUseCase(repo),create:new SaveNewVendorUseCase(repo),update:new ModifyVendorUseCase(repo),remove:new DeleteVendorUseCase(repo)};}