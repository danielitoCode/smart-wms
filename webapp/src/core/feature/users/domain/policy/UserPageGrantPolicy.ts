import type { UserPagePermissions } from '../entity/UserManagement';

/**
 * ADMIN permissions responses contain a synthetic full catalog for display.
 * Those keys are not persisted USER grants and must never be reused when
 * changing an ADMIN account to USER.
 */
export function editableUserPageGrantKeys(
	permissions: UserPagePermissions | null,
): string[] {
	if (!permissions || permissions.role !== 'USER' || permissions.isFullAccess) {
		return [];
	}
	return [...permissions.pageKeys];
}
