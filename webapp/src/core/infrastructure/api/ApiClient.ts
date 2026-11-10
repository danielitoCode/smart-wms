import { apiConfig } from '../config/ApiConfig';
import { authSession } from '../auth/AuthSession';
import { ApiError } from '../errors/ApiError';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
	method?: HttpMethod;
	body?: unknown;
	headers?: Record<string, string>;
	/** Skip Authorization header (e.g. login) */
	anonymous?: boolean;
	signal?: AbortSignal;
};

/**
 * Shared HTTP client for all features.
 * Respects existing SentryWMS endpoints, auth (Bearer JWT) and error shapes.
 */
export class ApiClient {
	constructor(private readonly baseUrl: string = apiConfig.baseUrl) {}

	async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
		const method = options.method ?? 'GET';
		const headers: Record<string, string> = {
			Accept: 'application/json',
			...options.headers
		};

		if (options.body !== undefined) {
			headers['Content-Type'] = 'application/json';
		}

		if (!options.anonymous) {
			const token = authSession.getToken();
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
		const signal = options.signal ?? controller.signal;

		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers,
				body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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

			if (!response.ok) {
				throw ApiError.fromResponse(response.status, body);
			}

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

	get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
		return this.request<T>(path, { ...options, method: 'GET' });
	}

	post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
		return this.request<T>(path, { ...options, method: 'POST', body });
	}

	put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
		return this.request<T>(path, { ...options, method: 'PUT', body });
	}

	delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
		return this.request<T>(path, { ...options, method: 'DELETE' });
	}
}

/** Singleton used by feature datasources unless a custom instance is injected. */
export const apiClient = new ApiClient();
