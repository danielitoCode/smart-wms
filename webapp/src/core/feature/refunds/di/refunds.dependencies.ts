import { apiClient } from '../../../infrastructure/api/ApiClient';
import { RefundsRemoteDataSource } from '../data/datasource/RefundsRemoteDataSource';
import { RefundsRepositoryImpl } from '../data/repository/RefundsRepositoryImpl';
import { CreateRefundUseCase, GetRefundUseCase, ListRefundsUseCase } from '../domain/usecase/RefundUseCases';

export function createRefundsDependencies() {
  const r = new RefundsRepositoryImpl(new RefundsRemoteDataSource(apiClient));
  return {
    list: new ListRefundsUseCase(r),
    detail: new GetRefundUseCase(r),
    create: new CreateRefundUseCase()
  };
}
