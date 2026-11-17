/** Exact JSON shape returned by GET/POST/PUT /api/admin/users. */
export type ManagedUserDto = {
	user_id: number;
	username: string;
	full_name: string;
	role: 'ADMIN' | 'USER';
	warehouse_id: number | null;
	warehouse_ids: number[] | null;
	allowed_functions: string[] | null;
	is_active: boolean;
	created_at?: string | null;
	last_login?: string | null;
};

/** GET/PUT /api/admin/users/:id/permissions response. */
export type UserPermissionsDto = {
	user_id: number;
	role: 'ADMIN' | 'USER';
	/** Includes page keys and override keys; ADMIN receives the full catalog. */
	page_keys: string[];
	is_full_access: boolean;
};

/** GET /api/admin/users returns a paginated envelope, not a bare array. */
export type ManagedUsersListDto = {
	users: ManagedUserDto[];
	total: number;
	page: number;
	per_page: number;
	pages: number;
};

export type CreateManagedUserRequestDto = {
	username: string;
	password: string;
	full_name: string;
	role: 'ADMIN' | 'USER';
	warehouse_id: number | null;
	warehouse_ids: number[];
	allowed_functions: string[];
};

export type UpdateManagedUserRequestDto = Partial<{
	full_name: string;
	role: 'ADMIN' | 'USER';
	warehouse_id: number | null;
	warehouse_ids: number[];
	allowed_functions: string[];
	is_active: boolean;
	password: string;
}>;

export type UpdateUserPermissionsRequestDto = { page_keys: string[] };
