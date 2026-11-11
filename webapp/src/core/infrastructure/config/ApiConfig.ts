/**
 * Runtime API configuration.
 * Defaults to same-origin /api requests; Vite proxies /api in development.
 * Set VITE_API_BASE_URL only when the deployment intentionally uses a
 * separate API origin configured for credentialed CORS.
 */
export type ApiConfig = {
	baseUrl: string;
	timeoutMs: number;
};

const DEFAULT_BASE =
	typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
		? String(import.meta.env.VITE_API_BASE_URL)
		: '';

export const apiConfig: ApiConfig = {
	baseUrl: DEFAULT_BASE.replace(/\/$/, ''),
	timeoutMs: 30_000
};
