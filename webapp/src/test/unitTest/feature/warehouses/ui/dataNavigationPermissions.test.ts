import { describe, expect, it } from 'vitest';
import { canAccessDataSection, getDataLandingPath } from '../../../../../core/feature/warehouses/ui/state/dataNavigationPermissions';

describe('data navigation grants', () => {
	it('allows the bins section with the bins grant alone', () => {
		expect(canAccessDataSection('bins', ['bins'], false)).toBe(true);
		expect(canAccessDataSection('bins', [], true)).toBe(true);
	});

	it('does not require bins grant to expose zones, or zones grant to expose bins', () => {
		expect(canAccessDataSection('zones', ['bins'], false)).toBe(false);
		expect(canAccessDataSection('bins', ['zones'], false)).toBe(false);
	});

	it('routes a user with only bins grant directly to bins', () => {
		expect(getDataLandingPath('USER', ['bins'])).toBe('/data/bins');
	});

	it('keeps admin and other independent data grants', () => {
		expect(getDataLandingPath('ADMIN', [])).toBe('/data/warehouses');
		expect(getDataLandingPath('USER', ['zones'])).toBe('/data/zones');
		expect(getDataLandingPath('USER', ['preferred-bins'])).toBe('/data/preferred-bins');
		expect(getDataLandingPath('USER', [])).toBeNull();
	});
});
