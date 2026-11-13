export type AdminOperationKey='backorders'|'count-approvals'|'fraud'|'inter-warehouse-transfers'|'adjustments'|'pos-activity'|'preferred-bins'|'purchase-orders'|'refunds'|'returns'|'transfer-orders'|'users'|'vendors';

export type AdminOperationQuery= {
    warehouseId?:number|null
    search?:string
    tab?:string
    date?:string
    status?:string
}

export type AdminOperationResult = {
    rows:Record<string,unknown>[]
    summary:Record<string,unknown>|null
    total:number|null
}
