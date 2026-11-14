export type ApiErrorCode =
	| 'validation_error'
	| 'bad_request'
	| 'unauthorized'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	| 'unprocessable'
	| 'server_error'
	| 'timeout'
	| 'cancelled'
	| 'network'
	| 'api_error';

/**
 * Normalized HTTP / transport failure.
 * UI and use cases should branch on `status` and `code`, not on raw fetch errors.
 */
export class ApiError extends Error {
	readonly status: number;
	readonly code: ApiErrorCode;
	readonly details: unknown;

	constructor(status: number, message: string, code: ApiErrorCode = 'api_error', details: unknown = null) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}

	get isNetwork(): boolean {
		return this.status === 0;
	}

	get isAuth(): boolean {
		return this.status === 401 || this.status === 403;
	}

	get isClient(): boolean {
		return this.status >= 400 && this.status < 500;
	}

	get isServer(): boolean {
		return this.status >= 500;
	}

	static codeForStatus(status: number): ApiErrorCode {
		switch (status) {
			case 400:
				return 'bad_request';
			case 401:
				return 'unauthorized';
			case 403:
				return 'forbidden';
			case 404:
				return 'not_found';
			case 409:
				return 'conflict';
			case 422:
				return 'unprocessable';
			default:
				if (status >= 500) return 'server_error';
				if (status >= 400) return 'api_error';
				return 'api_error';
		}
	}

	static fromResponse(status: number, body: unknown): ApiError {
		const fallbackCode = ApiError.codeForStatus(status);

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
				const code: ApiErrorCode =
					typeof record.code === 'string' && record.code
						? (record.code as ApiErrorCode)
						: fallbackCode;
				return new ApiError(status, message, code, body);
			}
		}

		if (typeof body === 'string' && body.trim()) {
			return new ApiError(status, body.trim(), fallbackCode);
		}

		return new ApiError(status, defaultMessageForStatus(status), fallbackCode);
	}
}

function defaultMessageForStatus(status: number): string {
	switch (status) {
		case 400:
			return 'Solicitud inválida';
		case 401:
			return 'Sesión expirada o no válida';
		case 403:
			return 'No tienes permiso para esta operación';
		case 404:
			return 'Recurso no encontrado';
		case 409:
			return 'Conflicto con el estado actual del recurso';
		case 422:
			return 'Datos no procesables';
		default:
			if (status >= 500) return 'Error interno del servidor';
			return `Request failed with status ${status}`;
	}
}

/**
 * Consistent user-facing message extraction for UI states.
 */
export function toUserMessage(err: unknown, fallback: string): string {
	if (err instanceof ApiError) {
		if (err.isNetwork) {
			if (err.code === 'timeout') return 'Tiempo de espera agotado. Reintenta.';
			if (err.code === 'cancelled') return fallback;
			return 'Error de red. Comprueba la conexión y reintenta.';
		}
		switch (err.status) {
			case 401:
				return err.message || 'Sesión expirada o no válida';
			case 403:
				return err.message || 'No tienes permiso para esta operación';
			case 404:
				return err.message || 'Recurso no encontrado';
			case 409:
				return err.message || 'Conflicto con el estado actual';
			case 422:
				return err.message || 'Datos no válidos';
			case 400:
				return err.message || 'Solicitud inválida';
			default:
				if (err.status >= 500) return 'Error del servidor. Inténtalo más tarde.';
				return err.message || fallback;
		}
	}
	if (err instanceof Error && err.message) {
		return err.message;
	}
	return fallback;
}
