/**
 * User administration domain.
 *
 * Authentication identity remains owned by the auth feature. These types
 * describe the administrative view and configurable authorization grants.
 * allowedFunctions and warehouse assignments preserve the current auth
 * contract without requiring a new role/permission persistence model.
 */

export type ManagedUserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | (string & {});

export type ManagedUser = {
	userId: number;
	username: string;
	fullName: string;
	role: string;
	warehouseId: number | null;
	warehouseIds: number[];
	allowedFunctions: string[];
	isActive: boolean;
	requirePacking: boolean;
	status?: ManagedUserStatus;
	email?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	lastLoginAt?: string | null;
};

export type Permission = {
	permissionId: string;
	code: string;
	name: string;
	description?: string | null;
	module?: string | null;
	isActive: boolean;
};

export type Role = {
	roleId: string;
	code: string;
	name: string;
	description?: string | null;
	isSystem: boolean;
	isActive: boolean;
	permissionCodes: string[];
};

export type UserPermissionGrant = {
	userId: number;
	permissionCode: string;
	granted: boolean;
	grantedBy?: number | null;
	grantedAt?: string | null;
};

export type UserWarehouseAssignment = {
	userId: number;
	warehouseId: number;
	isPrimary: boolean;
	assignedBy?: number | null;
	assignedAt?: string | null;
};

export type CreateManagedUser = {
	username: string;
	fullName: string;
	role: string;
	warehouseId?: number | null;
	warehouseIds?: number[];
	allowedFunctions?: string[];
	requirePacking?: boolean;
	email?: string | null;
};

export type UpdateManagedUser = Partial<Omit<CreateManagedUser, 'username'>> & {
	userId: number;
	isActive?: boolean;
};

export type UpdateUserPermissions = {
	userId: number;
	allowedFunctions: string[];
};

export type AssignUserWarehouses = {
	userId: number;
	warehouseIds: number[];
	primaryWarehouseId?: number | null;
};
