import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../../domain/entity/AdminOperation.ts';
import type { AdminOperationsRepository } from '../../domain/repository/AdminOperationsRepository';
import type { AdminOperationsRemoteDataSource } from '../datasource/AdminOperationsRemoteDataSource';
import { AdminOperationMapper } from '../mapper/AdminOperationMapper';

export class AdminOperationsRepositoryImpl implements AdminOperationsRepository {
  constructor(private readonly remote: AdminOperationsRemoteDataSource) {}

  async list(feature: AdminOperationKey, query?: AdminOperationQuery): Promise<AdminOperationResult> {
    const response = await this.remote.list(feature, query);
    return {
      rows: AdminOperationMapper.rows(feature, response.rows),
      summary: response.summary ? { today: response.summary.today } : null,
      pagination: response.pagination
        ? {
            page: response.pagination.page,
            perPage: response.pagination.per_page,
            total: response.pagination.total,
            pages: response.pagination.pages
          }
        : null
    };
  }
}
