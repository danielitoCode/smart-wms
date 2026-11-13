export type BackorderItemDto={
    sku:string
    item_name:string
    qty:number
    open_po:{
        po_number:string
        expected_date:string|null
        quantity_remaining:number
    }|null
}

export type BackorderDto={
    so_id:number
    so_number:string
    parent_so_number:string|null;
    warehouse_id:number
    status:string
    customer_name:string|null
    items:BackorderItemDto[];
    days_waiting:number
    backorder_opened_at:string|null
    fulfillable_since:string|null
}

export type BackorderListDto={
    tab:string
    backorders:BackorderDto[]
}