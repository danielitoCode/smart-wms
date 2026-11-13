import type {
  CreateRmaInput, CreateSalesOrder, PartialFulfillInput, ReceiveReturnInput,
  RevertSalesOrderInput, RelatedSalesOrder, SalesOrder, SalesOrderListQuery,
  SalesOrderPage, UpdateSalesOrder
} from '../entity/SalesOrder';

export interface SalesOrderRepository {
  list(query?: SalesOrderListQuery): Promise<SalesOrderPage>;
  getById(id: number): Promise<SalesOrder>;
  related(id: number): Promise<RelatedSalesOrder[]>;
  create(input: CreateSalesOrder): Promise<SalesOrder>;
  update(id: number, input: UpdateSalesOrder): Promise<void>;
  cancel(id: number): Promise<void>;
  revertStatus(id: number, input: RevertSalesOrderInput): Promise<void>;
  addLine(id: number, input: { itemId: number; quantityOrdered: number }): Promise<void>;
  updateLine(id: number, lineId: number, quantityOrdered: number): Promise<void>;
  deleteLine(id: number, lineId: number): Promise<void>;
  adminShip(id: number): Promise<void>;
  partialFulfill(id: number, input: PartialFulfillInput): Promise<void>;
  adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void>;
  createRma(id: number, input: CreateRmaInput): Promise<void>;
  receiveReturn(id: number, input: ReceiveReturnInput): Promise<void>;
  voidReturn(id: number): Promise<void>;
}
