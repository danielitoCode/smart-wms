import type { CreateSalesOrderInput, SalesOrder } from '../../domain/entity/SalesOrder';
import type {
	ListSalesOrdersParams,
	SalesOrderRepository
} from '../../domain/repository/SalesOrderRepository';
import type { SalesOrderRemoteDataSource } from '../datasource/SalesOrderRemoteDataSource';
import { SalesOrderMapper } from '../mapper/SalesOrderMapper';

export class SalesOrderRepositoryImpl implements SalesOrderRepository {
	constructor(private readonly datasource: SalesOrderRemoteDataSource) {}

	async list(params?: ListSalesOrdersParams): Promise<SalesOrder[]> {
		const rows = await this.datasource.list(params);
		return rows.map(SalesOrderMapper.toDomain);
	}

	async getById(id: number): Promise<SalesOrder> {
		const row = await this.datasource.getById(id);
		return SalesOrderMapper.toDomain(row);
	}

	async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
		const payload: Record<string, unknown> = {
			so_number: input.soNumber,
			warehouse_id: input.warehouseId,
			lines: input.lines.map((l) => ({
				item_id: l.itemId,
				quantity_ordered: l.quantityOrdered
			}))
		};
		if (input.customerName) payload.customer_name = input.customerName;
		if (input.customerEmail) payload.customer_email = input.customerEmail;
		if (input.customerPhone) payload.customer_phone = input.customerPhone;
		if (input.customerAddress) payload.customer_address = input.customerAddress;
		if (input.shipAddress) payload.ship_address = input.shipAddress;
		if (input.shipMethod) payload.ship_method = input.shipMethod;
		if (input.memo) payload.memo = input.memo;

		const row = await this.datasource.create(payload);
		return SalesOrderMapper.toDomain(row);
	}

	async cancel(id: number): Promise<SalesOrder> {
		const row = await this.datasource.cancel(id);
		return SalesOrderMapper.toDomain(row);
	}
}
