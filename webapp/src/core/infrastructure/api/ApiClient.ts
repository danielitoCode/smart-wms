import { apiConfig } from '../config/ApiConfig';
import { ApiError } from '../errors/ApiError';
import { buildApiPath, type QueryParams } from './buildApiPath';
import { emitApiDiagnostic, nextRequestId } from './ApiDiagnostics';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
	method?: HttpMethod;
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	/** Optional query params — serialized with buildApiPath */
	query?: QueryParams;
};

function readCsrfCookie(): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(/(?:^|;\s*)sentry_csrf=([^;]+)/);
	if (!match) return null;
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

/**
 * Shared browser HTTP client (F0.4).
 * - Cookies: credentials include (HttpOnly session)
 * - CSRF: double-submit header on mutating methods
 * - Errors: normalized ApiError with status codes 400/401/403/404/409/422/5xx
 * - Timeout + caller AbortSignal combined
 * - Concurrent requests supported; each has its own controller
 * - Diagnostics never log cookies / Authorization / CSRF / bodies
 */
export class ApiClient {
	constructor(private readonly baseUrl: string = apiConfig.baseUrl) {}

	async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
		const method = options.method ?? 'GET';
		const resolvedPath = buildApiPath(path, options.query);
		const requestId = nextRequestId();
		const started = typeof performance !== 'undefined' ? performance.now() : Date.now();

		const headers: Record<string, string> = {
			Accept: 'application/json',
			...options.headers
		};

		// Never allow callers to inject Authorization or Cookie via headers.
		delete headers['Authorization'];
		delete headers['authorization'];
		delete headers['Cookie'];
		delete headers['cookie'];

		if (options.body !== undefined) headers['Content-Type'] = 'application/json';
		// Mutating methods only (GET has no CSRF). HEAD not in HttpMethod union.
		if (method !== 'GET') {
			const csrfToken = readCsrfCookie();
			if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
		}

		const controller = new AbortController();
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, apiConfig.timeoutMs);
		const externalSignal = options.signal;
		const abortFromCaller = () => controller.abort(externalSignal?.reason);

		if (externalSignal?.aborted) {
			abortFromCaller();
		} else {
			externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
		}

		try {
			const response = await fetch(this.baseUrl + resolvedPath, {
				method,
				headers,
				body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
				credentials: 'include',
				signal: controller.signal
			});

			const text = await response.text();
			let body: unknown = null;
			if (text) {
				try {
					body = JSON.parse(text);
				} catch {
					body = text;
				}
			}

			const durationMs = Math.round(
				(typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
			);

			if (!response.ok) {
				const err = ApiError.fromResponse(response.status, body);
				emitApiDiagnostic({
					requestId,
					method,
					path: resolvedPath,
					status: response.status,
					durationMs,
					ok: false,
					code: err.code
				});
				throw err;
			}

			emitApiDiagnostic({
				requestId,
				method,
				path: resolvedPath,
				status: response.status,
				durationMs,
				ok: true
			});
			return body as T;
		} catch (err) {
			const durationMs = Math.round(
				(typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
			);
			if (err instanceof ApiError) {
				throw err;
			}
			if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
				const apiErr = timedOut
					? new ApiError(0, 'Request timed out', 'timeout')
					: new ApiError(0, 'Request cancelled', 'cancelled');
				emitApiDiagnostic({
					requestId,
					method,
					path: resolvedPath,
					durationMs,
					ok: false,
					code: apiErr.code,
					aborted: true
				});
				throw apiErr;
			}
			const networkErr = new ApiError(
				0,
				err instanceof Error ? err.message : 'Network error',
				'network'
			);
			emitApiDiagnostic({
				requestId,
				method,
				path: resolvedPath,
				durationMs,
				ok: false,
				code: 'network'
			});
			throw networkErr;
		} finally {
			clearTimeout(timeout);
			externalSignal?.removeEventListener('abort', abortFromCaller);
		}
	}

	get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'GET' });
	}

	post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'POST', body });
	}

	put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'PUT', body });
	}

	patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'PATCH', body });
	}

	delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'DELETE' });
	}
}

/** Singleton used by all feature DI graphs. Screens must never call fetch. */
export const apiClient = new ApiClient();
