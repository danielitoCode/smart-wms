import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../../domain/entity/AdminOperation.ts';
import type { AdminOperationsRepository } from '../../domain/repository/AdminOperationsRepository';
import type { AdminOperationsRemoteDataSource } from '../datasource/AdminOperationsRemoteDataSource';

export class AdminOperationsRepositoryImpl implements AdminOperationsRepository {
  constructor(private readonly remote: AdminOperationsRemoteDataSource) {}

  list(
    feature: AdminOperationKey,
    query?: AdminOperationQuery
  ): Promise<AdminOperationResult> {
    return this.remote.list(feature, query);
  }
}
