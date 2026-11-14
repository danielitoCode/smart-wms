import { describe, it, expect } from 'vitest';
import {
	canAccessPages,
	canPerform,
	hasOverride,
	requiredPageKeysForPath,
	resolveHomePath
} from '../../../../../../core/feature/auth/domain/policy/AccessPolicy';
import { ALL_PAGE_KEYS, isKnownPageKey } from '../../../../../../core/feature/auth/domain/policy/PermissionCatalog';
import { PERMISSION_MATRIX } from '../../../../../../core/feature/auth/domain/policy/PermissionMatrix';

describe('AccessPolicy F0.2', () => {
	it('ADMIN bypasses every page key', () => {
		expect(canAccessPages('ADMIN', [], ['fraud', 'users', 'settings'])).toBe(true);
		expect(
			canPerform('ADMIN', [], [], { pageKey: 'fraud', capability: 'open_page' })
		).toBe(true);
	});

	it('USER without permission cannot open protected pages', () => {
		expect(canAccessPages('USER', ['inventory'], ['fraud'])).toBe(false);
		expect(canAccessPages('USER', [], ['inventory'])).toBe(false);
	});

	it('USER with read page key can open page', () => {
		expect(canAccessPages('USER', ['sales-orders'], ['sales-orders'])).toBe(true);
	});

	it('USER with sales-orders but without so-full-edit fails full-edit grant', () => {
		expect(
			canPerform('USER', ['sales-orders'], [], {
				pageKey: 'sales-orders',
				capability: 'approve_or_modify',
				overrideKey: 'so-full-edit'
			})
		).toBe(false);
		expect(
			canPerform('USER', ['sales-orders'], ['so-full-edit'], {
				pageKey: 'sales-orders',
				capability: 'approve_or_modify',
				overrideKey: 'so-full-edit'
			})
		).toBe(true);
	});

	it('revoked permission: allowedPages without key fails', () => {
		const before = ['inventory', 'fraud'];
		const afterRevoke = ['inventory'];
		expect(canAccessPages('USER', before, ['fraud'])).toBe(true);
		expect(canAccessPages('USER', afterRevoke, ['fraud'])).toBe(false);
	});

	it('direct URL fraud requires fraud key not sales-orders', () => {
		expect(requiredPageKeysForPath('/management/fraud')).toEqual(['fraud']);
		expect(canAccessPages('USER', ['sales-orders'], requiredPageKeysForPath('/management/fraud'))).toBe(
			false
		);
		expect(canAccessPages('USER', ['fraud'], requiredPageKeysForPath('/management/fraud'))).toBe(true);
	});

	it('count-approvals page open uses count-approvals key', () => {
		expect(requiredPageKeysForPath('/management/count-approvals')).toEqual(['count-approvals']);
	});

	it('hasOverride respects ADMIN and list', () => {
		expect(hasOverride('ADMIN', [], 'so-full-edit')).toBe(true);
		expect(hasOverride('USER', [], 'so-full-edit')).toBe(false);
		expect(hasOverride('USER', ['so-full-edit'], 'so-full-edit')).toBe(true);
	});

	it('resolveHomePath respects mustChangePassword and grants', () => {
		expect(resolveHomePath({ role: 'USER', allowedPages: ['receiving'], mustChangePassword: true })).toBe(
			'/change-password'
		);
		expect(resolveHomePath({ role: 'USER', allowedPages: ['receiving'] })).toBe('/receiving');
	});

	it('catalog contains fraud and count-approvals', () => {
		expect(isKnownPageKey('fraud')).toBe(true);
		expect(isKnownPageKey('count-approvals')).toBe(true);
		expect(ALL_PAGE_KEYS.includes('fraud')).toBe(true);
	});

	it('permission matrix marks fraud gate as fraud', () => {
		const fraud = PERMISSION_MATRIX.find((r) => r.sveltePath === '/management/fraud');
		expect(fraud?.flaskGate).toBe('fraud');
		expect(fraud?.pageKey).toBe('fraud');
	});
});
