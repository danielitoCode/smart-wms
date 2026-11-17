import {apiClient} from '../../../infrastructure/api/ApiClient';
import {DashboardRemoteDataSource} from '../data/datasource/DashboardRemoteDataSource';
import {DashboardRepositoryImpl} from '../data/repository/DashboardRepositoryImpl';
import {GetProductivityUseCase,GetReceivedTodayUseCase,GetShippingHealthUseCase,GetPreferencesUseCase,UpdatePreferencesUseCase,GetLocalPickupUseCase,MarkLocalPickupUseCase} from '../domain/usecase/DashboardUseCases';
const repository=new DashboardRepositoryImpl(new DashboardRemoteDataSource(apiClient));
export const dashboardDependencies={productivity:new GetProductivityUseCase(repository),received:new GetReceivedTodayUseCase(repository),shipping:new GetShippingHealthUseCase(repository),preferences:new GetPreferencesUseCase(repository),updatePreferences:new UpdatePreferencesUseCase(repository),localPickup:new GetLocalPickupUseCase(repository),markPickup:new MarkLocalPickupUseCase(repository)};
