import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	ManagedUserDto, ManagedUsersListDto, UserPermissionsDto, ManagedWarehouseDto,
	CreateManagedUserRequestDto, UpdateManagedUserRequestDto,
	UpdateUserPermissionsRequestDto,
} from '../dto/ManagedUserDto';

export class ManagedUsersRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async listWarehouses(): Promise<ManagedWarehouseDto[]> {
		const response = await this.api.get<{warehouses:ManagedWarehouseDto[]}>('/api/admin/warehouses');
		return response.warehouses ?? [];
	}

	async list(): Promise<ManagedUserDto[]> {
		const pageSize = 1000;
		const firstPage = await this.api.get<ManagedUsersListDto>(
			`/api/admin/users?page=1&per_page=${pageSize}`,
		);
		const users = [...(firstPage.users ?? [])];

		// The backend caps per_page at 1000; consume the remaining pages rather
		// than silently hiding users when an installation exceeds that limit.
		for (let page = 2; page <= firstPage.pages; page += 1) {
			const response = await this.api.get<ManagedUsersListDto>(
				`/api/admin/users?page=${page}&per_page=${pageSize}`,
			);
			users.push(...(response.users ?? []));
		}
		return users;
	}

	create(body: CreateManagedUserRequestDto): Promise<ManagedUserDto> {
		return this.api.post<ManagedUserDto>('/api/admin/users', body);
	}

	update(userId: number, body: UpdateManagedUserRequestDto): Promise<ManagedUserDto> {
		return this.api.put<ManagedUserDto>(`/api/admin/users/${userId}`, body);
	}

	async remove(userId: number): Promise<void> {
		await this.api.delete<unknown>(`/api/admin/users/${userId}`);
	}

	getPermissions(userId: number): Promise<UserPermissionsDto> {
		return this.api.get<UserPermissionsDto>(`/api/admin/users/${userId}/permissions`);
	}

	updatePermissions(
		userId: number,
		body: UpdateUserPermissionsRequestDto,
	): Promise<UserPermissionsDto> {
		return this.api.put<UserPermissionsDto>(
			`/api/admin/users/${userId}/permissions`,
			body,
		);
	}
}
