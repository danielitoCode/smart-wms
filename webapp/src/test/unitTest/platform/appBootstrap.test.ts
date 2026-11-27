import { describe, expect, it, vi } from 'vitest';
import { initializeApp } from '../../../lib/platform/appBootstrap';

describe('initializeApp', () => {
	it('initializes theme before locale', () => {
		const order: string[] = [];
		const theme = { init: vi.fn(() => order.push('theme')) };
		const i18n = { init: vi.fn(() => order.push('i18n')) };

		initializeApp({ theme, i18n });

		expect(order).toEqual(['theme', 'i18n']);
		expect(theme.init).toHaveBeenCalledOnce();
		expect(i18n.init).toHaveBeenCalledOnce();
	});

	it('stops initialization and propagates the error to the root recovery state', () => {
		const failure = new Error('theme initialization failed');
		const theme = { init: vi.fn(() => { throw failure; }) };
		const i18n = { init: vi.fn() };

		expect(() => initializeApp({ theme, i18n })).toThrow(failure);
		expect(i18n.init).not.toHaveBeenCalled();
	});

	it('can be called again after a failed attempt', () => {
		const themeInit = vi.fn()
			.mockImplementationOnce(() => { throw new Error('temporary failure'); })
			.mockImplementationOnce(() => undefined);
		const theme = { init: themeInit };
		const i18n = { init: vi.fn() };

		expect(() => initializeApp({ theme, i18n })).toThrow('temporary failure');
		expect(() => initializeApp({ theme, i18n })).not.toThrow();
		expect(themeInit).toHaveBeenCalledTimes(2);
		expect(i18n.init).toHaveBeenCalledOnce();
	});
});
