export type InterWarehouseTransferDto={transfer_id:number;item_id:number;sku:string;item_name:string;from_bin_id:number;from_bin_code:string;from_warehouse_id:number;from_warehouse_name?:string;from_warehouse_code?:string;to_bin_id:number;to_bin_code:string;to_warehouse_id:number;to_warehouse_name?:string;to_warehouse_code?:string;quantity:number;transferred_by:string;transferred_at:string|null;status:'completed'};
export type InterWarehouseTransferListDto={transfers:InterWarehouseTransferDto[]};
/** Receipt returned by Flask after the atomic movement has committed. */
export type InterWarehouseTransferCreateResponseDto = {
 transfer_id:number; item_id:number; sku:string; from_bin_id:number; from_bin_code:string;
 from_warehouse_id:number; to_bin_id:number; to_bin_code:string; to_warehouse_id:number;
 quantity:number; reason:string; transferred_at:string|null;
};