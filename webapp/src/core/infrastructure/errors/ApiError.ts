/**
 * Normalized HTTP / API error used across features.
 * Maps both standard `{ error: string }` and validation_error payloads from SentryWMS.
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

	static fromResponse(status: number, body: unknown): ApiError {
		if (body && typeof body === 'object') {
			const record = body as Record<string, unknown>;
			if (record.error === 'validation_error' && Array.isArray(record.details)) {
				const first = record.details[0] as { msg?: string } | undefined;
				return new ApiError(
					status,
					first?.msg ?? 'Validation error',
					'validation_error',
					record.details
				);
			}
			if (typeof record.error === 'string') {
				return new ApiError(status, record.error, 'api_error', body);
			}
		}
		return new ApiError(status, `Request failed with status ${status}`);
	}
}
