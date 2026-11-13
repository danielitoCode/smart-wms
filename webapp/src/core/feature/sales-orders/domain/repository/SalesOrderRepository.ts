import type {
  CreateSalesOrderInput, PartialFulfillInput, ReceiveReturnInput,
  RevertSalesOrderInput, CreateRmaInput, RelatedSalesOrder,
  SalesOrder, SalesOrderPage, UpdateSalesOrder
} from '../entity/SalesOrder';

export type ListSalesOrdersParams = {
  status?: string;
  warehouseId?: number;
  page?: number;
  perPage?: number;
  q?: string;
  excludePostFulfillment?: boolean;
};

export interface SalesOrderRepository {
  list(params?: ListSalesOrdersParams): Promise<SalesOrder[]>;
  listPage(params?: ListSalesOrdersParams): Promise<SalesOrderPage>;
  getById(id: number): Promise<SalesOrder>;
  create(input: CreateSalesOrderInput): Promise<SalesOrder>;
  update(id: number, input: UpdateSalesOrder): Promise<void>;
  cancel(id: number): Promise<SalesOrder>;
  addLine(id: number, input: { itemId: number; quantityOrdered: number }): Promise<void>;
  updateLine(id: number, lineId: number, quantity: number): Promise<void>;
  deleteLine(id: number, lineId: number): Promise<void>;
  adminShip(id: number): Promise<void>;
  adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void>;
  partialFulfill(id: number, input: PartialFulfillInput): Promise<void>;
  revertStatus(id: number, input: RevertSalesOrderInput): Promise<void>;
  related(id: number): Promise<RelatedSalesOrder[]>;
  createRma(id: number, input: CreateRmaInput): Promise<void>;
  receiveReturn(id: number, input: ReceiveReturnInput): Promise<void>;
  voidReturn(id: number): Promise<void>;
}
