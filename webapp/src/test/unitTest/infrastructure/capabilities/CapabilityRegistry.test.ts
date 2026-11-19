import { describe, it, expect } from 'vitest';
import {
	getServerCapability,
	isServerCapabilitySupported,
	SERVER_CAPABILITIES
} from '../../../../core/infrastructure/capabilities/CapabilityRegistry';

describe('platform server capability registry', () => {
	it('records the auth and operational warehouse contracts with evidence', () => {
		expect(getServerCapability('auth.login').path).toBe('/api/auth/login');
		expect(getServerCapability('auth.me').responseDto).toContain('allowed_pages');
		expect(getServerCapability('auth.change-password').path).toBe('/api/auth/change-password');
		expect(getServerCapability('authorization.allowed-functions').status).toBe('PARTIAL');
		expect(getServerCapability('warehouse.active-list').path).toBe('/api/warehouses/list');
		for (const capability of Object.values(SERVER_CAPABILITIES)) {
			expect(capability.evidence.length).toBeGreaterThan(0);
		}
	});

	it('does not advertise expired-session refresh as fully supported', () => {
		const refresh = getServerCapability('auth.refresh');
		expect(refresh.status).toBe('PARTIAL');
		expect(refresh.notes).toContain('cannot recover an expired session');
		expect(isServerCapabilitySupported('auth.refresh')).toBe(false);
		expect(isServerCapabilitySupported('auth.me')).toBe(true);
		expect(getServerCapability('warehouse.request-scope').status).toBe('PARTIAL');
		expect(isServerCapabilitySupported('warehouse.request-scope')).toBe(false);
	});

	it('keeps page grants and warehouse scope as independent controls', () => {
		expect(getServerCapability('authorization.page-grants').warehouseScope).toContain('separately');
		expect(getServerCapability('warehouse.request-scope').permission).toContain('assigned');
	});
});
