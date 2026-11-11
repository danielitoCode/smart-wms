import { apiConfig } from '../config/ApiConfig';
import { ApiError } from '../errors/ApiError';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
	method?: HttpMethod;
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
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
 * Shared browser HTTP client. Authentication is carried by the backend's
 * HttpOnly cookie; mutating requests use its readable double-submit CSRF cookie.
 */
export class ApiClient {
	constructor(private readonly baseUrl: string = apiConfig.baseUrl) {}

	async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
		const method = options.method ?? 'GET';
		const headers: Record<string, string> = {
			Accept: 'application/json',
			...options.headers
		};

		if (options.body !== undefined) headers['Content-Type'] = 'application/json';
		if (method !== 'GET') {
			const csrfToken = readCsrfCookie();
			if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
		const signal = options.signal ?? controller.signal;

		try {
			const response = await fetch(this.baseUrl + path, {
				method,
				headers,
				body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
				credentials: 'include',
				signal
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

			if (!response.ok) throw ApiError.fromResponse(response.status, body);
			return body as T;
		} catch (err) {
			if (err instanceof ApiError) throw err;
			if (err instanceof DOMException && err.name === 'AbortError') {
				throw new ApiError(0, 'Request timed out', 'timeout');
			}
			throw new ApiError(0, err instanceof Error ? err.message : 'Network error', 'network');
		} finally {
			clearTimeout(timeout);
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

	delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
		return this.request<T>(path, { ...options, method: 'DELETE' });
	}
}

export const apiClient = new ApiClient();
