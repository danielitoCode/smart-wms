import type { SalesOrderAddress } from '../../../sales-orders/domain/entity/SalesOrder';
import type { Return, ReturnLine, ReturnReceipt, ReturnStatus } from '../../domain/entity/Return';
import type { ReturnHeaderDto, ReturnLineDto, ReturnReceiptDto } from '../dto/ReturnDto';

function address(dto:ReturnHeaderDto,prefix:'billing'|'shipping'):SalesOrderAddress {
 const v=prefix==='billing'
 ? [dto.billing_address_name,dto.billing_address_line1,dto.billing_address_line2,dto.billing_address_city,dto.billing_address_state,dto.billing_address_postal_code,dto.billing_address_country,dto.billing_address_phone]
 : [dto.shipping_address_name,dto.shipping_address_line1,dto.shipping_address_line2,dto.shipping_address_city,dto.shipping_address_state,dto.shipping_address_postal_code,dto.shipping_address_country,dto.shipping_address_phone];
 const [name,line1,line2,city,state,postalCode,country,phone]=v;
 const n=(x:string|null|undefined)=>x||null;
 return {name:n(name),line1:n(line1),line2:n(line2),city:n(city),state:n(state),postalCode:n(postalCode),country:n(country),phone:n(phone)};
}
function status(value:string):ReturnStatus {
 if(value==='OPEN'||value==='PARTIALLY_RECEIVED'||value==='RECEIVED') return value;
 throw new Error(`Estado de RMA no reconocido: ${value}`);
}
function line(dto:ReturnLineDto):ReturnLine {
 return {soLineId:dto.so_line_id,lineId:dto.so_line_id,lineNumber:dto.line_number,itemId:dto.item_id,sku:dto.sku,itemName:dto.item_name,upc:null,quantityOrdered:dto.quantity_ordered,quantityAllocated:dto.quantity_allocated,quantityPicked:dto.quantity_picked,quantityPacked:dto.quantity_packed,quantityShipped:dto.quantity_shipped,quantityReceived:dto.quantity_received,status:dto.status,originalSalesOrderLineId:dto.original_so_line_id};
}
function receipt(dto:ReturnReceiptDto):ReturnReceipt {
 return {receiptId:dto.receipt_id,soLineId:dto.so_line_id,itemId:dto.item_id,sku:dto.sku,itemName:dto.item_name,quantityReceived:dto.quantity_received,binId:dto.bin_id,binCode:dto.bin_code,warehouseId:dto.warehouse_id,warehouseCode:dto.warehouse_code,receivedBy:dto.received_by,receivedAt:dto.received_at,notes:dto.notes};
}
export const ReturnMapper = {
 line, receipt,
 header(dto:ReturnHeaderDto,lines:ReturnLineDto[]=[],receipts:ReturnReceiptDto[]=[]):Return {
  if(dto.order_type!=='return') throw new Error('El registro recibido no es una devolución');
  return {salesOrderId:dto.so_id,salesOrderNumber:dto.so_number,soNumber:dto.so_number,id:dto.so_id,barcode:dto.so_barcode,status:status(dto.status),priority:dto.priority,warehouseId:dto.warehouse_id,customerId:null,customerName:dto.customer_name,customerEmail:dto.customer_email??null,customerPhone:dto.customer_phone,customerAddress:dto.customer_address??null,shipAddress:dto.ship_address??null,shipMethod:dto.ship_method??null,shipByDate:dto.ship_by_date,orderType:'return',orderOrigin:dto.order_origin??null,parentSalesOrderNumber:dto.parent_so_number??null,parentSalesOrderId:dto.parent_so_id,parentSoId:dto.parent_so_id,parentSoNumber:dto.parent_so_number??null,carrier:dto.carrier??null,trackingNumber:dto.tracking_number??null,memo:dto.memo??null,orderTotal:dto.order_total==null?null:Number(dto.order_total),customerShippingPaid:null,sourceSystem:dto.source_system??null,cancellationReason:null,createdAt:dto.created_at??null,pickedAt:null,shippedAt:null,shippedDateLocal:null,billingAddress:address(dto,'billing'),shippingAddress:address(dto,'shipping'),lines:lines.map(line),pickTasks:[],receipts:receipts.map(receipt),voidedAt:dto.voided_at??null,voidedBy:dto.voided_by??null};
 }
};
