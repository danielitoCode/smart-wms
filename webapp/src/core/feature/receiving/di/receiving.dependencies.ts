import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ReceivingRemoteDataSource } from '../data/datasource/ReceivingRemoteDataSource';
import { ReceivingRepositoryImpl } from '../data/repository/ReceivingRepositoryImpl';
import { LookupPurchaseOrderUseCase } from '../domain/usecase/LookupPurchaseOrderUseCase';
import { ReceiveGoodsUseCase } from '../domain/usecase/ReceiveGoodsUseCase';
import { CancelReceiptsUseCase } from '../domain/usecase/CancelReceiptsUseCase';

export function createReceivingDependencies() {
	const datasource = new ReceivingRemoteDataSource(apiClient);
	const repository = new ReceivingRepositoryImpl(datasource);

	return {
		lookupPurchaseOrder: new LookupPurchaseOrderUseCase(repository),
		receiveGoods: new ReceiveGoodsUseCase(repository),
		cancelReceipts: new CancelReceiptsUseCase(repository)
	};
}

export type ReceivingDependencies = ReturnType<typeof createReceivingDependencies>;
