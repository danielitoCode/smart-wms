export type AdminOperationDto=Record<string,unknown>;
export type AdminOperationListDto=Record<string,unknown>&{
    backorders?:AdminOperationDto[]
    adjustments?:AdminOperationDto[]
    sales_orders?:AdminOperationDto[]
    transfers?:AdminOperationDto[]
    preferred_bins?:AdminOperationDto[]
    purchase_orders?:AdminOperationDto[]
    transfer_orders?:AdminOperationDto[]
    users?:AdminOperationDto[]
    vendors?:AdminOperationDto[]
    total?:number
}
