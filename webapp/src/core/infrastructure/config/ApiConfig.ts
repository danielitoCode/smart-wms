/**
 * Runtime API configuration.
 * Backend remains the existing SentryWMS / SmartWMS Flask API — do not change contracts here.
 */
export type ApiConfig = {
	/** Base URL of the WMS API, without trailing slash. Example: http://localhost:5000 */
	baseUrl: string;
	/** Default request timeout in milliseconds */
	timeoutMs: number;
};

const DEFAULT_BASE =
	typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
		? String(import.meta.env.VITE_API_BASE_URL)
		: 'http://localhost:5000';

export const apiConfig: ApiConfig = {
	baseUrl: DEFAULT_BASE.replace(/\/$/, ''),
	timeoutMs: 30_000
};
