/** Transfer Order aggregate; inventory moves only after an approval is accepted. */
export type TransferOrderStatus='OPEN'|'PARTIALLY_PICKED'|'AWAITING_APPROVAL'|'APPROVED'|'CLOSED'|'CANCELLED';
export type TransferOrderLineStatus='PENDING'|'PARTIALLY_PICKED'|'PICKED'|'APPROVED'|'SHORT_CLOSED';
export type TransferOrderApprovalStatus='PENDING'|'APPROVED'|'REJECTED';
export type TransferOrderLine={toLineId:number;transferOrderId:number;itemId:number;lineNumber:number;requestedQuantity:number;committedQuantity:number;pickedQuantity:number;approvedQuantity:number;status:TransferOrderLineStatus;sku?:string|null;itemName?:string|null};
export type TransferOrder={transferOrderId:number;transferOrderNumber:string;sourceWarehouseId:number;destinationWarehouseId:number;status:TransferOrderStatus;createdBy:string;externalId:string;createdAt:string|null;updatedAt:string|null;notes:string|null;lines:TransferOrderLine[];approvals:TransferOrderApproval[]};
export type TransferOrderApproval={approvalId:number;transferOrderId:number;submittedBy:string;submittedAt:string|null;approvedBy:string|null;approvedAt:string|null;rejectedAt:string|null;rejectionReason:string|null;status:TransferOrderApprovalStatus;externalId:string};
export type CreateTransferOrder={sourceWarehouseCode:string;destinationWarehouseCode:string;notes?:string|null;records:Array<{sku:string;quantity:number}>};
export type TransferOrderImportResult={toId:number;toNumber:string;sourceWarehouseId:number;destinationWarehouseId:number;lineCount:number;shortages:Array<{sku:string;requestedQuantity:number;committedQuantity:number;shortfall:number}>};
