import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../../domain/entity/AdminOperation.ts';
import type { AdminOperationsRepository } from '../../domain/repository/AdminOperationsRepository';
import type { AdminOperationsRemoteDataSource } from '../datasource/AdminOperationsRemoteDataSource';
import { AdminOperationMapper } from '../mapper/AdminOperationMapper';

function pagination(value: { page: number; per_page: number; total: number; pages: number } | null) {
  return value
    ? {
        page: value.page,
        perPage: value.per_page,
        total: value.total,
        pages: value.pages
      }
    : null;
}

export class AdminOperationsRepositoryImpl implements AdminOperationsRepository {
  constructor(private readonly remote: AdminOperationsRemoteDataSource) {}

  async list(feature: AdminOperationKey, query?: AdminOperationQuery): Promise<AdminOperationResult> {
    const response = await this.remote.list(feature, query);

    switch (response.feature) {
      case 'backorders':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.backorders(response.rows),
          summary: null,
          pagination: null
        };
      case 'count-approvals':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.countApprovals(response.rows),
          summary: null,
          pagination: null
        };
      case 'fraud':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.fraud(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'inter-warehouse-transfers':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.interWarehouseTransfers(response.rows),
          summary: null,
          pagination: null
        };
      case 'adjustments':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.adjustments(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'pos-activity':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.posActivity(response.rows),
          summary: AdminOperationMapper.posSummary(response.summary),
          pagination: pagination(response.pagination)
        };
      case 'preferred-bins':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.preferredBins(response.rows),
          summary: null,
          pagination: null
        };
      case 'purchase-orders':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.purchaseOrders(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'refunds':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.refunds(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'returns':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.returns(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'transfer-orders':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.transferOrders(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'users':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.users(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
      case 'vendors':
        return {
          feature: response.feature,
          rows: AdminOperationMapper.vendors(response.rows),
          summary: null,
          pagination: pagination(response.pagination)
        };
    }

    throw new Error('Unsupported administrative operation result');
  }
}
