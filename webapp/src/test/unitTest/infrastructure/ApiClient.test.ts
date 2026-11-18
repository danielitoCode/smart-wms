import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../core/infrastructure/api/ApiClient';
import { buildApiPath } from '../../../core/infrastructure/api/buildApiPath';
import { subscribeApiDiagnostics } from '../../../core/infrastructure/api/ApiDiagnostics';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('buildApiPath', () => {
	it('serializes query and skips empty values', () => {
		expect(buildApiPath('/api/items', { q: 'ab', page: 2, empty: '', none: null })).toBe(
			'/api/items?q=ab&page=2'
		);
	});

	it('appends arrays as repeated keys', () => {
		expect(buildApiPath('/api/x', { id: [1, 2] })).toBe('/api/x?id=1&id=2');
	});
});

describe('ApiClient browser cookie contract', () => {
	it('sends credentials and the double-submit CSRF header on mutating requests', async () => {
		vi.stubGlobal('document', { cookie: 'sentry_csrf=csrf%2Dtoken' });
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
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

	it('strips caller Authorization header if provided', async () => {
		vi.stubGlobal('document', { cookie: '' });
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '{}'
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');
		await client.get('/api/auth/me', { headers: { Authorization: 'Bearer stolen' } });
		const [, options] = fetchMock.mock.calls[0];
		expect(options.headers.Authorization).toBeUndefined();
	});

	it('does not add a CSRF header to read-only requests', async () => {
		vi.stubGlobal('document', { cookie: 'sentry_csrf=csrf-token' });
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '{"user_id":1}'
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');

		await client.get('/api/auth/me');

		const [, options] = fetchMock.mock.calls[0];
		expect(options.credentials).toBe('include');
		expect(options.headers['X-CSRF-Token']).toBeUndefined();
	});

	it('serializes query via options.query', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => '[]'
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('https://wms.test');
		await client.get('/api/admin/items', { query: { q: 'sku', page: 1 } });
		expect(fetchMock.mock.calls[0][0]).toBe('https://wms.test/api/admin/items?q=sku&page=1');
	});

	it('maps HTTP error statuses to ApiError codes', async () => {
		const cases: Array<[number, string]> = [
			[400, 'bad_request'],
			[401, 'unauthorized'],
			[403, 'forbidden'],
			[404, 'not_found'],
			[409, 'conflict'],
			[422, 'unprocessable'],
			[500, 'server_error']
		];
		for (const [status, code] of cases) {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: false,
					status,
					text: async () => JSON.stringify({ error: `e${status}` })
				})
			);
			const client = new ApiClient('http://localhost:5000');
			await expect(client.get('/api/x')).rejects.toMatchObject({ status, code });
		}
	});

	it('emits diagnostics without cookies or secrets', async () => {
		const events: unknown[] = [];
		const unsub = subscribeApiDiagnostics((e) => events.push(e));
		vi.stubGlobal('document', { cookie: 'sentry_csrf=secret' });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => '{}'
			})
		);
		const client = new ApiClient('http://localhost:5000');
		await client.get('/api/auth/me');
		unsub();
		expect(events).toHaveLength(1);
		const payload = JSON.stringify(events[0]);
		expect(payload).not.toMatch(/secret|csrf|cookie|authorization/i);
		expect(events[0]).toMatchObject({ path: '/api/auth/me', ok: true, status: 200 });
	});

	it('keeps the configured timeout active when a caller signal is supplied', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError')),
					{ once: true }
				);
			})
		);
		const client = new ApiClient('http://localhost:5000');
		const caller = new AbortController();
		const request = client.get('/api/slow', { signal: caller.signal });
		const rejection = expect(request).rejects.toMatchObject({ code: 'timeout', status: 0 });

		await vi.advanceTimersByTimeAsync(30_000);
		await rejection;
	});

	it('distinguishes caller cancellation from a timeout', async () => {
		vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError')),
					{ once: true }
				);
			})
		);
		const client = new ApiClient('http://localhost:5000');
		const caller = new AbortController();
		const request = client.get('/api/slow', { signal: caller.signal });

		caller.abort();

		await expect(request).rejects.toMatchObject({ code: 'cancelled', status: 0 });
	});

	it('cancels immediately when the caller signal is already aborted', async () => {
		const fetchMock = vi.fn(
			(_input: RequestInfo | URL, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					if (init?.signal?.aborted) {
						reject(new DOMException('Aborted', 'AbortError'));
						return;
					}
					init?.signal?.addEventListener(
						'abort',
						() => reject(new DOMException('Aborted', 'AbortError')),
						{ once: true }
					);
				})
		);
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');
		const caller = new AbortController();
		caller.abort();

		await expect(client.get('/api/slow', { signal: caller.signal })).rejects.toMatchObject({
			code: 'cancelled',
			status: 0
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('supports concurrent requests with independent controllers', async () => {
		let resolveA!: (v: { ok: boolean; status: number; text: () => Promise<string> }) => void;
		let resolveB!: (v: { ok: boolean; status: number; text: () => Promise<string> }) => void;
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise((r) => {
						resolveA = r;
					})
			)
			.mockImplementationOnce(
				() =>
					new Promise((r) => {
						resolveB = r;
					})
			);
		vi.stubGlobal('fetch', fetchMock);
		const client = new ApiClient('http://localhost:5000');
		const pA = client.get('/api/a');
		const pB = client.get('/api/b');
		resolveB({ ok: true, status: 200, text: async () => '{"b":1}' });
		await expect(pB).resolves.toEqual({ b: 1 });
		resolveA({ ok: true, status: 200, text: async () => '{"a":1}' });
		await expect(pA).resolves.toEqual({ a: 1 });
	});
});
