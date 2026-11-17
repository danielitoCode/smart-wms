import type { ManagedUsersRepository } from '../repository/ManagedUsersRepository';
import type {
	CreateManagedUser,
	UpdateManagedUser,
	UpdateUserPagePermissions,
} from '../entity/UserManagement';

export class ListManagedUsersUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateManagedUserUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute(input: CreateManagedUser) { return this.repository.create(input); }
}

export class UpdateManagedUserUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute(input: UpdateManagedUser) { return this.repository.update(input); }
}

export class DeleteManagedUserUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute(userId: number) { return this.repository.remove(userId); }
}

export class GetUserPagePermissionsUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute(userId: number) { return this.repository.getPermissions(userId); }
}

export class UpdateUserPagePermissionsUseCase {
	constructor(private readonly repository: ManagedUsersRepository) {}
	execute(input: UpdateUserPagePermissions) { return this.repository.updatePermissions(input); }
}
