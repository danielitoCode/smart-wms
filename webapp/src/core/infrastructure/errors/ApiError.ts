/**
 * Normalized HTTP / API error used across features.
 * Maps both standard `{ error: string }` / `{ message: string }` and
 * validation_error payloads from SentryWMS.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details: unknown;

	constructor(status: number, message: string, code = 'api_error', details: unknown = null) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}

	get isNetwork(): boolean {
		return this.code === 'network' || this.code === 'timeout' || this.status === 0;
	}

	get isUnauthorized(): boolean {
		return this.status === 401 || this.status === 403;
	}

	static fromResponse(status: number, body: unknown): ApiError {
		if (body && typeof body === 'object') {
			const record = body as Record<string, unknown>;

			if (record.error === 'validation_error' && Array.isArray(record.details)) {
				const first = record.details[0] as { msg?: string; message?: string } | undefined;
				return new ApiError(
					status,
					first?.msg ?? first?.message ?? 'Validation error',
					'validation_error',
					record.details
				);
			}

			const message =
				(typeof record.error === 'string' && record.error) ||
				(typeof record.message === 'string' && record.message) ||
				null;

			if (message) {
				const code =
					typeof record.code === 'string'
						? record.code
						: status === 401 || status === 403
							? 'unauthorized'
							: 'api_error';
				return new ApiError(status, message, code, body);
			}
		}

		if (typeof body === 'string' && body.trim()) {
			return new ApiError(status, body.trim());
		}

		return new ApiError(status, `Request failed with status ${status}`);
	}
}

/**
 * Consistent user-facing message extraction for UI states.
 */
export function toUserMessage(err: unknown, fallback: string): string {
	if (err instanceof ApiError) {
		if (err.isNetwork) {
			return err.code === 'timeout'
				? 'Tiempo de espera agotado. Reintenta.'
				: 'Error de red. Comprueba la conexión y reintenta.';
		}
		return err.message || fallback;
	}
	if (err instanceof Error && err.message) {
		return err.message;
	}
	return fallback;
}
