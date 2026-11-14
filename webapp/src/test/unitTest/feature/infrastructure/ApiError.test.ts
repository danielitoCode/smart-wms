import { describe, expect, it } from 'vitest';
import { ApiError, toUserMessage } from '../../../../core/infrastructure/errors/ApiError';

describe('ApiError.fromResponse', () => {
	it('maps validation_error details', () => {
		const err = ApiError.fromResponse(400, {
			error: 'validation_error',
			details: [{ msg: 'bin_id required' }]
		});
		expect(err.message).toBe('bin_id required');
		expect(err.code).toBe('validation_error');
	});

	it('maps message field', () => {
		const err = ApiError.fromResponse(400, { message: 'not PICKED' });
		expect(err.message).toBe('not PICKED');
		expect(err.code).toBe('bad_request');
	});

	it('maps status-specific codes', () => {
		expect(ApiError.fromResponse(401, {}).code).toBe('unauthorized');
		expect(ApiError.fromResponse(403, {}).code).toBe('forbidden');
		expect(ApiError.fromResponse(404, {}).code).toBe('not_found');
		expect(ApiError.fromResponse(409, {}).code).toBe('conflict');
		expect(ApiError.fromResponse(422, {}).code).toBe('unprocessable');
		expect(ApiError.fromResponse(500, {}).code).toBe('server_error');
	});
});

describe('toUserMessage', () => {
	it('translates network and timeout', () => {
		expect(toUserMessage(new ApiError(0, 'x', 'network'), 'f')).toMatch(/red/i);
		expect(toUserMessage(new ApiError(0, 'x', 'timeout'), 'f')).toMatch(/espera/i);
	});

	it('uses status-aware copy for auth and not found', () => {
		expect(toUserMessage(new ApiError(401, '', 'unauthorized'), 'f')).toMatch(/sesión/i);
		expect(toUserMessage(new ApiError(403, '', 'forbidden'), 'f')).toMatch(/permiso/i);
		expect(toUserMessage(new ApiError(404, '', 'not_found'), 'f')).toMatch(/no encontrado/i);
	});

	it('uses Error message otherwise', () => {
		expect(toUserMessage(new Error('boom'), 'f')).toBe('boom');
		expect(toUserMessage({}, 'fallback')).toBe('fallback');
	});
});
