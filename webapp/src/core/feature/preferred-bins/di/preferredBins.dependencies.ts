import {apiClient} from '../../../infrastructure/api/ApiClient';
import {PreferredBinsRemoteDataSource} from '../data/datasource/PreferredBinsRemoteDataSource';
import {PreferredBinsRepositoryImpl} from '../data/repository/PreferredBinsRepositoryImpl';
import {ListPreferredBinsUseCase,CreatePreferredBinUseCase,UpdatePreferredBinUseCase,DeletePreferredBinUseCase} from '../domain/usecase/PreferredBinUseCases';
export function createPreferredBinsDependencies(){const r=new PreferredBinsRepositoryImpl(new PreferredBinsRemoteDataSource(apiClient));return {list:new ListPreferredBinsUseCase(r),create:new CreatePreferredBinUseCase(r),update:new UpdatePreferredBinUseCase(r),remove:new DeletePreferredBinUseCase(r)};}