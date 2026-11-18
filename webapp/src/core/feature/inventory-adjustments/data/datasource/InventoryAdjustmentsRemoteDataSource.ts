import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { AdjustmentListDto } from '../dto/InventoryAdjustmentDto';

export type AdjustmentQueryDto = {
	warehouseId?: number | null;
	status?: string | null;
	adjustmentId?: number;
	page?: number;
	perPage?: number;
};

export class InventoryAdjustmentsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	private toQuery(query: AdjustmentQueryDto = {}): string {
		const params = new URLSearchParams({
			page: String(query.page ?? 1),
			per_page: String(query.perPage ?? 200)
		});
		if (query.warehouseId != null) params.set('warehouse_id', String(query.warehouseId));
		if (query.status) params.set('status', query.status);
		if (query.adjustmentId != null) params.set('adjustment_id', String(query.adjustmentId));
		return params.toString();
	}

	async list(query: AdjustmentQueryDto = {}) {
		const response = await this.api.get<AdjustmentListDto>(
			`/api/admin/adjustments/list?${this.toQuery(query)}`
		);
		return response.adjustments ?? [];
	}

	async pending(query: Omit<AdjustmentQueryDto, 'status'> = {}) {
		const response = await this.api.get<AdjustmentListDto>(
			`/api/admin/adjustments/pending?${this.toQuery(query)}`
		);
		return response.adjustments ?? [];
	}

	async createDirect(body: unknown) {
		return this.api.post<unknown>('/api/admin/adjustments/direct', body);
	}

	async review(body: unknown) {
		return this.api.post<unknown>('/api/admin/adjustments/review', body);
	}
}
