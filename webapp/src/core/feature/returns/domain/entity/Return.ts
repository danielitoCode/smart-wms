/**
 * Return / RMA domain.
 *
 * A return represents the physical return lifecycle. Monetary refunds are
 * modeled independently in the refunds feature.
 */

export type ReturnStatus =
	| 'REQUESTED'
	| 'AUTHORIZED'
	| 'IN_TRANSIT'
	| 'RECEIVED'
	| 'INSPECTED'
	| 'CLOSED'
	| 'REJECTED'
	| 'CANCELLED'
	| (string & {});

export type ReturnReason =
	| 'DAMAGED'
	| 'DEFECTIVE'
	| 'WRONG_ITEM'
	| 'NOT_AS_DESCRIBED'
	| 'UNWANTED'
	| 'OTHER'
	| (string & {});

export type ReturnDisposition =
	| 'RESTOCK'
	| 'REPAIR'
	| 'SCRAP'
	| 'RETURN_TO_VENDOR'
	| 'HOLD'
	| (string & {});

export type ReturnedItemCondition =
	| 'NEW'
	| 'OPEN_BOX'
	| 'USED'
	| 'DAMAGED'
	| 'DEFECTIVE'
	| 'UNKNOWN'
	| (string & {});

export type ReturnLine = {
	returnLineId: number;
	returnId: number;
	salesOrderLineId: number;
	itemId: number;
	quantityRequested: number;
	quantityAuthorized: number;
	quantityReceived: number;
	quantityAccepted: number;
	quantityRejected: number;
	reason?: ReturnReason | null;
	condition?: ReturnedItemCondition | null;
	disposition?: ReturnDisposition | null;
	inspectionNotes?: string | null;
	sku?: string | null;
	itemName?: string | null;
};

export type Return = {
	returnId: number;
	returnNumber: string;
	status: ReturnStatus;
	salesOrderId: number;
	salesOrderNumber?: string | null;
	customerId?: string | null;
	customerName?: string | null;
	warehouseId: number;
	reason: ReturnReason;
	reasonNotes?: string | null;
	requestedBy?: number | null;
	authorizedBy?: number | null;
	receivedBy?: number | null;
	inspectedBy?: number | null;
	requestedAt?: string | null;
	authorizedAt?: string | null;
	receivedAt?: string | null;
	inspectedAt?: string | null;
	closedAt?: string | null;
	notes?: string | null;
	lines: ReturnLine[];
};

export type CreateReturnLine = {
	salesOrderLineId: number;
	itemId: number;
	quantityRequested: number;
	reason?: ReturnReason | null;
	reasonNotes?: string | null;
};

export type CreateReturn = {
	salesOrderId: number;
	warehouseId: number;
	reason: ReturnReason;
	reasonNotes?: string | null;
	lines: CreateReturnLine[];
	notes?: string | null;
};

export type AuthorizeReturnLine = {
	returnLineId: number;
	quantityAuthorized: number;
};

export type AuthorizeReturn = {
	returnId: number;
	lines: AuthorizeReturnLine[];
	notes?: string | null;
};

export type ReceiveReturnLine = {
	returnLineId: number;
	quantityReceived: number;
	condition?: ReturnedItemCondition | null;
};

export type ReceiveReturn = {
	returnId: number;
	lines: ReceiveReturnLine[];
	receivedAt?: string | null;
	notes?: string | null;
};

export type InspectReturnLine = {
	returnLineId: number;
	quantityAccepted: number;
	quantityRejected: number;
	disposition: ReturnDisposition;
	condition?: ReturnedItemCondition | null;
	inspectionNotes?: string | null;
};

export type InspectReturn = {
	returnId: number;
	lines: InspectReturnLine[];
	inspectedAt?: string | null;
	notes?: string | null;
};
