import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../core/infrastructure/api/ApiClient';

afterEach(() => {
	vi.useRealTimers();
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

	it('keeps the configured timeout active when a caller signal is supplied', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
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
				init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
			})
		);
		const client = new ApiClient('http://localhost:5000');
		const caller = new AbortController();
		const request = client.get('/api/slow', { signal: caller.signal });

		caller.abort();

		await expect(request).rejects.toMatchObject({ code: 'cancelled', status: 0 });
	});

	it('cancels immediately when the caller signal is already aborted', async () => {
		const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				if (init?.signal?.aborted) {
					reject(new DOMException('Aborted', 'AbortError'));
					return;
				}
				init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
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
});
