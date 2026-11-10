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
	});

	it('maps error string', () => {
		const err = ApiError.fromResponse(404, { error: 'not found' });
		expect(err.message).toBe('not found');
	});
});

describe('toUserMessage', () => {
	it('translates network and timeout', () => {
		expect(toUserMessage(new ApiError(0, 'x', 'network'), 'f')).toMatch(/red/i);
		expect(toUserMessage(new ApiError(0, 'x', 'timeout'), 'f')).toMatch(/espera/i);
	});

	it('uses Error message otherwise', () => {
		expect(toUserMessage(new Error('boom'), 'f')).toBe('boom');
		expect(toUserMessage({}, 'fallback')).toBe('fallback');
	});
});
