import type {
	ManagedUser,
	ManagedWarehouse,
	CreateManagedUser,
	UpdateManagedUser,
	UserPagePermissions,
	UpdateUserPagePermissions,
} from '../entity/UserManagement';

/** Port for the six user-administration operations exposed by Flask. */
export interface ManagedUsersRepository {
	list(): Promise<ManagedUser[]>;
	listWarehouses(): Promise<ManagedWarehouse[]>;
	create(input: CreateManagedUser): Promise<ManagedUser>;
	update(input: UpdateManagedUser): Promise<ManagedUser>;
	remove(userId: number): Promise<void>;
	getPermissions(userId: number): Promise<UserPagePermissions>;
	updatePermissions(input: UpdateUserPagePermissions): Promise<UserPagePermissions>;
}
