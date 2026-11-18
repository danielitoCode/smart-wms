import { apiClient } from '../../../infrastructure/api/ApiClient';
import { FraudReviewRemoteDataSource } from '../data/datasource/FraudReviewRemoteDataSource';
import { FraudReviewRepositoryImpl } from '../data/repository/FraudReviewRepositoryImpl';
import {
  GetFraudReviewDetailUseCase,
  ListFraudReviewsUseCase,
  PushFraudOrderToQueueUseCase,
  UpdateFraudMemoUseCase
} from '../domain/usecase/FraudReviewUseCases';

export function createFraudReviewDependencies() {
  const repository = new FraudReviewRepositoryImpl(new FraudReviewRemoteDataSource(apiClient));
  return {
    list: new ListFraudReviewsUseCase(repository),
    detail: new GetFraudReviewDetailUseCase(repository),
    updateMemo: new UpdateFraudMemoUseCase(repository),
    push: new PushFraudOrderToQueueUseCase(repository)
  };
}
