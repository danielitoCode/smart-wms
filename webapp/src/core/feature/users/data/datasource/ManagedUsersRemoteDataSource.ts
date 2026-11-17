import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	ManagedUserDto, ManagedUsersListDto, UserPermissionsDto,
	CreateManagedUserRequestDto, UpdateManagedUserRequestDto,
	UpdateUserPermissionsRequestDto,
} from '../dto/ManagedUserDto';

export class ManagedUsersRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(): Promise<ManagedUserDto[]> {
		const response = await this.api.get<ManagedUsersListDto>(
			'/api/admin/users?page=1&per_page=1000',
		);
		return response.users ?? [];
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
