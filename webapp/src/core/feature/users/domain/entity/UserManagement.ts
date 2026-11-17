/**
 * Contracts for the Flask users table and user_page_permissions.
 * Backend roles are ADMIN/USER; page grants and allowedFunctions are separate.
 */
export type ManagedUserRole = 'ADMIN' | 'USER';

export type ManagedWarehouse = { warehouseId:number; warehouseCode:string; warehouseName:string; isActive?:boolean };

export type ManagedUser = {
	userId: number;
	username: string;
	fullName: string;
	role: ManagedUserRole;
	/** Legacy single-warehouse mirror; null is valid for unassigned users. */
	warehouseId: number | null;
	/** Authoritative multi-warehouse assignment. */
	warehouseIds: number[];
	allowedFunctions: string[];
	isActive: boolean;
	createdAt?: string | null;
	lastLogin?: string | null;
};

export type CreateManagedUser = {
	username: string;
	password: string;
	fullName: string;
	role: ManagedUserRole;
	warehouseId?: number | null;
	warehouseIds?: number[];
	allowedFunctions?: string[];
};

export type UpdateManagedUser = {
	userId: number;
	fullName?: string;
	role?: ManagedUserRole;
	warehouseId?: number | null;
	warehouseIds?: number[];
	allowedFunctions?: string[];
	isActive?: boolean;
	password?: string;
};

/** pageKeys includes ALL_PAGE_KEYS and ALL_OVERRIDE_KEYS. ADMIN has full access. */
export type UserPagePermissions = {
	userId: number;
	role: ManagedUserRole;
	pageKeys: string[];
	isFullAccess: boolean;
};

/** PUT replaces the complete page + override grant set, not a patch. */
export type UpdateUserPagePermissions = {
	userId: number;
	pageKeys: string[];
};
