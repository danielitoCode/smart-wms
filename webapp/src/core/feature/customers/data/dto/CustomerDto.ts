/**
 * Canonical customer master data.
 * Mirrors the customers aggregate introduced by inbound customer migration.
 * Sales orders may also retain customer snapshots for historical accuracy.
 */

export type CustomerDto = {
    canonical_id: string;
    external_id: string;
    customer_name: string | null;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
    shipping_address: string | null;
    tax_id: string | null;
    is_active: boolean | null;
    created_at: string;
    updated_at: string;
    latest_inbound_id: number;
};

export type CreateCustomerDto = {
    customer_name?: string | null;
    email?: string | null;
    phone?: string | null;
    billing_address?: string | null;
    shipping_address?: string | null;
    tax_id?: string | null;
    is_active?: boolean | null;
};

export type UpdateCustomerDto = Partial<CreateCustomerDto>;