import { apiClient } from '../../../infrastructure/api/ApiClient';
import { InventoryAdjustmentsRemoteDataSource } from '../data/datasource/InventoryAdjustmentsRemoteDataSource';
import { InventoryAdjustmentsRepositoryImpl } from '../data/repository/InventoryAdjustmentsRepositoryImpl';
import {
	ApproveAdjustmentUseCase,
	CreateDirectAdjustmentUseCase,
	GetAdjustmentDetailUseCase,
	ListAdjustmentsUseCase,
	PendingAdjustmentsUseCase,
	RejectAdjustmentUseCase,
	ReviewAdjustmentsUseCase
} from '../domain/usecase/InventoryAdjustmentUseCases';

export function createInventoryAdjustmentsDependencies() {
	const repository = new InventoryAdjustmentsRepositoryImpl(
		new InventoryAdjustmentsRemoteDataSource(apiClient)
	);
	const review = new ReviewAdjustmentsUseCase(repository);
	return {
		detail: new GetAdjustmentDetailUseCase(repository),
		list: new ListAdjustmentsUseCase(repository),
		pending: new PendingAdjustmentsUseCase(repository),
		createDirect: new CreateDirectAdjustmentUseCase(repository),
		review,
		approve: new ApproveAdjustmentUseCase(review),
		reject: new RejectAdjustmentUseCase(review)
	};
}
