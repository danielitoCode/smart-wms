/**
 * Fraud queue projection over SalesOrder rows with status='FRAUD_REVIEW'.
 * The backend stores no FraudReview aggregate, risk score, signal list or
 * reviewer assignment. The supported actions edit SO.memo or move status
 * from FRAUD_REVIEW to OPEN, both recorded in audit_log.
 */
export type FraudReview = {
	salesOrderId: number;
	salesOrderNumber: string;
	status: 'FRAUD_REVIEW';
	orderType: string;
	orderSource: string | null;
	orderOrigin: string | null;
	warehouseId: number;
	customerName: string | null;
	customerPhone: string | null;
	memo: string | null;
	createdAt: string | null;
};

export type UpdateFraudMemo = {
	salesOrderId: number;
	memo: string;
};

/** The backend accepts this action only while status is FRAUD_REVIEW. */
export type PushFraudOrderToQueue = {
	salesOrderId: number;
};
