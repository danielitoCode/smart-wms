export type OriginalSaleHeaderDto = {
  so_id: number;
  so_number: string;
  order_type: 'sale';
  status: string;
  warehouse_id: number;
  customer_name: string | null;
};

export type OriginalSaleLineDto = {
  so_line_id: number;
  line_number: number;
  item_id: number;
  sku: string;
  item_name: string;
  quantity_shipped: number;
};

export type OriginalSaleDetailDto = {
  sales_order: OriginalSaleHeaderDto;
  lines: OriginalSaleLineDto[];
};

export type RelatedSalesOrderDto = {
  so_id: number;
  order_type: string | null;
  is_voided: boolean;
};

export type RelatedSalesOrdersDto = {
  so_id: number;
  related_count: number;
  records: RelatedSalesOrderDto[];
};

export type ReturnChildLineDto = {
  original_so_line_id: number | null;
  quantity_ordered: number;
};

export type ReturnChildDetailDto = {
  sales_order: { so_id: number; order_type: 'return' };
  lines: ReturnChildLineDto[];
};

export type CreateRmaResponseDto = { so_id: number; so_number: string; message?: string };
