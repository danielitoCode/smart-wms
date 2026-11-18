import {apiClient} from '#core/infrastructure/api/ApiClient.ts';
import {PickingBatchRemoteDataSource} from '../data/datasource/PickingBatchRemoteDataSource';
import {PickingBatchRepositoryImpl} from '../data/repository/PickingBatchRepositoryImpl';
import {GetPickingBatchDetailUseCase,ListPickingBatchesUseCase,ReleasePickingBatchUseCase} from '../domain/usecase/PickingBatchUseCases';
export function createPickingBatchesDependencies(){const repo=new PickingBatchRepositoryImpl(new PickingBatchRemoteDataSource(apiClient));return {list:new ListPickingBatchesUseCase(repo),detail:new GetPickingBatchDetailUseCase(repo),release:new ReleasePickingBatchUseCase(repo)};}