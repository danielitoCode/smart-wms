import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PickingRemoteDataSource } from '../data/datasource/PickingRemoteDataSource';
import { PickingRepositoryImpl } from '../data/repository/PickingRepositoryImpl';
import { GetActiveBatchUseCase } from '../domain/usecase/GetActiveBatchUseCase';
import { GetNextPickTaskUseCase } from '../domain/usecase/GetNextPickTaskUseCase';
import { ConfirmPickUseCase } from '../domain/usecase/ConfirmPickUseCase';
import { ShortPickUseCase } from '../domain/usecase/ShortPickUseCase';
import { WaveValidateUseCase } from '../domain/usecase/WaveValidateUseCase';
import { WaveCreateUseCase } from '../domain/usecase/WaveCreateUseCase';
import { CreateBatchUseCase } from '../domain/usecase/CreateBatchUseCase';

export function createPickingDependencies() {
	const datasource = new PickingRemoteDataSource(apiClient);
	const repository = new PickingRepositoryImpl(datasource);

	return {
		getActiveBatch: new GetActiveBatchUseCase(repository),
		getNextTask: new GetNextPickTaskUseCase(repository),
		confirmPick: new ConfirmPickUseCase(repository),
		shortPick: new ShortPickUseCase(repository),
		waveValidate: new WaveValidateUseCase(repository),
		waveCreate: new WaveCreateUseCase(repository),
		createBatch: new CreateBatchUseCase(repository),
		completeBatch: (batchId: number) => repository.completeBatch(batchId),
		cancelBatch: (batchId: number) => repository.cancelBatch(batchId)
	};
}

export type PickingDependencies = ReturnType<typeof createPickingDependencies>;
