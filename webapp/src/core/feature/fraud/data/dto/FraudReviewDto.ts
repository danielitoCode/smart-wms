export type FraudReviewDto = {
    sales_order_id: number;
    sales_order_number: string;
    status: 'FRAUD_REVIEW';
    order_type: string;
    order_source: string | null;
    order_origin: string | null;
    warehouse_id: number;
    customer_name: string | null;
    customer_phone: string | null;
    memo: string | null;
    created_at: string | null;
};

export type UpdateFraudMemoDto = {
    salesOrder_id: number;
    memo: string;
};

/** The backend accepts this action only while status is FRAUD_REVIEW. */
export type PushFraudOrderToQueueDto = {
    sales_order_id: number;
};