/**
 * Runtime API configuration.
 * Backend remains the existing SentryWMS / SmartWMS Flask API — do not change contracts here.
 *
 * Dev (Vite): leave VITE_API_BASE_URL empty so requests go to same origin `/api/...`
 * and vite.config.ts proxies them to http://127.0.0.1:5000 (no CORS).
 * Prod / direct API: set VITE_API_BASE_URL=https://api.example.com and allow the
 * frontend origin in the API CORS_ORIGINS env.
 */
export type ApiConfig = {
	/** Base URL of the WMS API, without trailing slash. Empty = same origin. */
	baseUrl: string;
	/** Default request timeout in milliseconds */
	timeoutMs: number;
};

function resolveBaseUrl(): string {
	const raw =
		typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL != null
			? String(import.meta.env.VITE_API_BASE_URL).trim()
			: '';
	return raw.replace(/\/$/, '');
}

export const apiConfig: ApiConfig = {
	baseUrl: resolveBaseUrl(),
	timeoutMs: 30_000
};
