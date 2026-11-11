import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../core/infrastructure/api/ApiClient';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('ApiClient browser cookie contract', () => {
	it('sends credentials and the double-submit CSRF header on mutating requests', async () => {
		vi.stubGlobal('document', { cookie: 'sentry_csrf=csrf%2Dtoken' });
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => '{"message":"ok"}'
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');

		await client.post('/api/auth/logout', {});

		const [, options] = fetchMock.mock.calls[0];
		expect(options.credentials).toBe('include');
		expect(options.headers['X-CSRF-Token']).toBe('csrf-token');
		expect(options.headers.Authorization).toBeUndefined();
	});

	it('does not add a CSRF header to read-only requests', async () => {
		vi.stubGlobal('document', { cookie: 'sentry_csrf=csrf-token' });
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => '{"user_id":1}'
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');

		await client.get('/api/auth/me');

		const [, options] = fetchMock.mock.calls[0];
		expect(options.credentials).toBe('include');
		expect(options.headers['X-CSRF-Token']).toBeUndefined();
	});
});
