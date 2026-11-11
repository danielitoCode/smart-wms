/**
 * User administration contracts backed by users and user_page_permissions.
 * The backend supports only ADMIN and USER. Page grants and allowedFunctions
 * are separate authorization mechanisms; there is no persisted generic RBAC
 * Role/Permission catalogue.
 */
export type ManagedUserRole = 'ADMIN' | 'USER';

export type ManagedUser = {
	userId: number;
	username: string;
	fullName: string;
	role: ManagedUserRole;
	warehouseId: number | null;
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

/** Keys are validated by the backend against ALL_PAGE_KEYS + ALL_OVERRIDE_KEYS. */
export type UserPagePermissions = {
	userId: number;
	role: ManagedUserRole;
	pageKeys: string[];
	isFullAccess: boolean;
};

export type UpdateUserPagePermissions = {
	userId: number;
	pageKeys: string[];
};
