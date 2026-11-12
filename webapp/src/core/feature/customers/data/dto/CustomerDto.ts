/**
 * Wire types for the customers aggregate (snake_case as returned by the API).
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
	created_at: string | null;
	updated_at: string | null;
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
