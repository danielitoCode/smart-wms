import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type { AdminOperationKey, AdminOperationQuery } from '../../domain/entity/AdminOperation.ts';
import type {
  AdjustmentDto,
  AdminOperationRemotePagination,
  AdminOperationRemoteResult,
  BackorderDto,
  InterWarehouseTransferDto,
  PosActivityDto,
  PosActivitySummaryDto,
  PreferredBinDto,
  PurchaseOrderDto,
  SalesOrderDto,
  TransferOrderDto,
  UserDto,
  VendorDto
} from '../dto/AdminOperationDto';

type PaginatedResponse = AdminOperationRemotePagination;

function createPaginationParams(query: AdminOperationQuery): URLSearchParams {
  return new URLSearchParams({
    page: String(query.page ?? 1),
    per_page: String(query.perPage ?? 50)
  });
}

function appendSearch(params: URLSearchParams, query: AdminOperationQuery): void {
  const search = query.search?.trim();
  if (search) params.set('q', search);
}

function appendWarehouse(params: URLSearchParams, query: AdminOperationQuery): void {
  if (query.warehouseId != null) params.set('warehouse_id', String(query.warehouseId));
}

function toRemotePagination(response: PaginatedResponse): AdminOperationRemotePagination {
  return {
    page: response.page,
    per_page: response.per_page,
    total: response.total,
    pages: response.pages
  };
}

export class AdminOperationsRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(
    feature: AdminOperationKey,
    query: AdminOperationQuery = {}
  ): Promise<AdminOperationRemoteResult> {
    switch (feature) {
      case 'backorders': {
        const params = new URLSearchParams({ tab: query.tab ?? 'waiting' });
        appendWarehouse(params, query);
        const response = await this.api.get<{ backorders: BackorderDto[] }>(
          `/api/admin/backorders?${params.toString()}`
        );
        return { feature, rows: response.backorders, summary: null, pagination: null };
      }
      case 'count-approvals': {
        const response = await this.api.get<{ adjustments: AdjustmentDto[] }>(
          '/api/admin/adjustments/pending'
        );
        return { feature, rows: response.adjustments, summary: null, pagination: null };
      }
      case 'fraud': {
        const params = createPaginationParams(query);
        params.set('status', 'FRAUD_REVIEW');
        appendSearch(params, query);
        appendWarehouse(params, query);
        const response = await this.api.get<{ sales_orders: SalesOrderDto[] } & PaginatedResponse>(
          `/api/admin/sales-orders?${params.toString()}`
        );
        return {
          feature,
          rows: response.sales_orders,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'inter-warehouse-transfers': {
        const response = await this.api.get<{ transfers: InterWarehouseTransferDto[] }>(
          '/api/admin/inter-warehouse-transfers?limit=200'
        );
        return { feature, rows: response.transfers, summary: null, pagination: null };
      }
      case 'adjustments': {
        const params = createPaginationParams(query);
        appendWarehouse(params, query);
        const response = await this.api.get<{ adjustments: AdjustmentDto[] } & PaginatedResponse>(
          `/api/admin/adjustments/list?${params.toString()}`
        );
        return {
          feature,
          rows: response.adjustments,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'pos-activity': {
        const params = createPaginationParams(query);
        params.set('order_type', 'all');
        if (query.date) params.set('date', query.date);
        if (query.status) params.set('status', query.status);
        if (query.channel) params.set('channel', query.channel);
        if (query.terminalId?.trim()) params.set('terminal_id', query.terminalId.trim());
        if (query.cashierId?.trim()) params.set('cashier_id', query.cashierId.trim());
        const response = await this.api.get<{ sales_orders: PosActivityDto[] } & PaginatedResponse>(
          `/api/admin/pos/sales-orders?${params.toString()}`
        );
        const summaryPath = query.date
          ? `/api/admin/pos/summary?date=${encodeURIComponent(query.date)}`
          : '/api/admin/pos/summary';
        const summary = await this.api.get<PosActivitySummaryDto>(summaryPath);
        return {
          feature,
          rows: response.sales_orders,
          summary,
          pagination: toRemotePagination(response)
        };
      }
      case 'preferred-bins': {
        const params = new URLSearchParams();
        appendSearch(params, query);
        const suffix = params.size > 0 ? `?${params.toString()}` : '';
        const response = await this.api.get<{ preferred_bins: PreferredBinDto[] }>(
          `/api/admin/preferred-bins${suffix}`
        );
        return { feature, rows: response.preferred_bins, summary: null, pagination: null };
      }
      case 'purchase-orders': {
        const params = createPaginationParams(query);
        appendWarehouse(params, query);
        appendSearch(params, query);
        if (query.status) params.set('status', query.status);
        const response = await this.api.get<{ purchase_orders: PurchaseOrderDto[] } & PaginatedResponse>(
          `/api/admin/purchase-orders?${params.toString()}`
        );
        return {
          feature,
          rows: response.purchase_orders,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'refunds':
      case 'returns': {
        const params = createPaginationParams(query);
        params.set('order_type', feature === 'refunds' ? 'refund' : 'return');
        appendSearch(params, query);
        appendWarehouse(params, query);
        const response = await this.api.get<{ sales_orders: SalesOrderDto[] } & PaginatedResponse>(
          `/api/admin/sales-orders?${params.toString()}`
        );
        return {
          feature,
          rows: response.sales_orders,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'transfer-orders': {
        const params = createPaginationParams(query);
        if (query.status) params.set('status', query.status);
        if (query.sourceWarehouseId != null) params.set('source_warehouse_id', String(query.sourceWarehouseId));
        if (query.destinationWarehouseId != null) params.set('destination_warehouse_id', String(query.destinationWarehouseId));
        const response = await this.api.get<{ transfer_orders: TransferOrderDto[] } & PaginatedResponse>(
          `/api/admin/transfer-orders?${params.toString()}`
        );
        return {
          feature,
          rows: response.transfer_orders,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'users': {
        const params = createPaginationParams(query);
        const response = await this.api.get<{ users: UserDto[] } & PaginatedResponse>(
          `/api/admin/users?${params.toString()}`
        );
        return {
          feature,
          rows: response.users,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
      case 'vendors': {
        const params = createPaginationParams(query);
        appendSearch(params, query);
        if (query.active != null) params.set('active', String(query.active));
        const response = await this.api.get<{ vendors: VendorDto[] } & PaginatedResponse>(
          `/api/admin/vendors?${params.toString()}`
        );
        return {
          feature,
          rows: response.vendors,
          summary: null,
          pagination: toRemotePagination(response)
        };
      }
    }

    throw new Error('Unsupported administrative operation');
  }
}
