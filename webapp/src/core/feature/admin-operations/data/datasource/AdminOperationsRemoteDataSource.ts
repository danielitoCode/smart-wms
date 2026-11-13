import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type { AdminOperationKey, AdminOperationQuery } from '../../domain/entity/AdminOperation.ts';
import type {
  AdjustmentDto,
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

type PaginationResponse = { total: number; page: number; per_page: number; pages: number };

function pagination(value: PaginationResponse) {
  return { page: value.page, per_page: value.per_page, total: value.total, pages: value.pages };
}

function pagedParams(query: AdminOperationQuery): URLSearchParams {
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

export class AdminOperationsRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(feature: AdminOperationKey, query: AdminOperationQuery = {}): Promise<AdminOperationRemoteResult> {
    const page = pagedParams(query);
    let rows: AdminOperationRemoteResult['rows'] = [];
    let summary: PosActivitySummaryDto | null = null;
    let pageInfo: AdminOperationRemoteResult['pagination'] = null;

    switch (feature) {
      case 'backorders': {
        const params = new URLSearchParams({ tab: query.tab ?? 'waiting' });
        appendWarehouse(params, query);
        const response = await this.api.get<{ backorders: BackorderDto[] }>(`/api/admin/backorders?${params.toString()}`);
        rows = response.backorders;
        break;
      }
      case 'count-approvals': {
        const response = await this.api.get<{ adjustments: AdjustmentDto[] }>('/api/admin/adjustments/pending');
        rows = response.adjustments;
        break;
      }
      case 'fraud': {
        page.set('status', 'FRAUD_REVIEW');
        appendSearch(page, query);
        appendWarehouse(page, query);
        const response = await this.api.get<{ sales_orders: SalesOrderDto[] } & PaginationResponse>(`/api/admin/sales-orders?${page.toString()}`);
        rows = response.sales_orders;
        pageInfo = pagination(response);
        break;
      }
      case 'inter-warehouse-transfers': {
        const response = await this.api.get<{ transfers: InterWarehouseTransferDto[] }>('/api/admin/inter-warehouse-transfers?limit=200');
        rows = response.transfers;
        break;
      }
      case 'adjustments': {
        appendWarehouse(page, query);
        const response = await this.api.get<{ adjustments: AdjustmentDto[] } & PaginationResponse>(`/api/admin/adjustments/list?${page.toString()}`);
        rows = response.adjustments;
        pageInfo = pagination(response);
        break;
      }
      case 'pos-activity': {
        page.set('order_type', 'all');
        if (query.date) page.set('date', query.date);
        if (query.status) page.set('status', query.status);
        const response = await this.api.get<{ sales_orders: PosActivityDto[] } & PaginationResponse>(`/api/admin/pos/sales-orders?${page.toString()}`);
        rows = response.sales_orders;
        pageInfo = pagination(response);
        const summaryPath = query.date
          ? `/api/admin/pos/summary?date=${encodeURIComponent(query.date)}`
          : '/api/admin/pos/summary';
        summary = await this.api.get<PosActivitySummaryDto>(summaryPath);
        break;
      }
      case 'preferred-bins': {
        const params = new URLSearchParams();
        appendSearch(params, query);
        const suffix = params.size ? `?${params.toString()}` : '';
        const response = await this.api.get<{ preferred_bins: PreferredBinDto[] }>(`/api/admin/preferred-bins${suffix}`);
        rows = response.preferred_bins;
        break;
      }
      case 'purchase-orders': {
        appendWarehouse(page, query);
        appendSearch(page, query);
        if (query.status) page.set('status', query.status);
        const response = await this.api.get<{ purchase_orders: PurchaseOrderDto[] } & PaginationResponse>(`/api/admin/purchase-orders?${page.toString()}`);
        rows = response.purchase_orders;
        pageInfo = pagination(response);
        break;
      }
      case 'refunds':
      case 'returns': {
        page.set('order_type', feature === 'refunds' ? 'refund' : 'return');
        appendSearch(page, query);
        const response = await this.api.get<{ sales_orders: SalesOrderDto[] } & PaginationResponse>(`/api/admin/sales-orders?${page.toString()}`);
        rows = response.sales_orders;
        pageInfo = pagination(response);
        break;
      }
      case 'transfer-orders': {
        if (query.status) page.set('status', query.status);
        const response = await this.api.get<{ transfer_orders: TransferOrderDto[] } & PaginationResponse>(`/api/admin/transfer-orders?${page.toString()}`);
        rows = response.transfer_orders;
        pageInfo = pagination(response);
        break;
      }
      case 'users': {
        const response = await this.api.get<{ users: UserDto[] } & PaginationResponse>(`/api/admin/users?${page.toString()}`);
        rows = response.users;
        pageInfo = pagination(response);
        break;
      }
      case 'vendors': {
        appendSearch(page, query);
        const response = await this.api.get<{ vendors: VendorDto[] } & PaginationResponse>(`/api/admin/vendors?${page.toString()}`);
        rows = response.vendors;
        pageInfo = pagination(response);
        break;
      }
    }

    return { rows, summary, pagination: pageInfo };
  }
}
