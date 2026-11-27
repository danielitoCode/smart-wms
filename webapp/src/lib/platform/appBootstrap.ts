export type BootstrapInitializer = {
	init(): void;
};

export type AppBootstrapDependencies = {
	theme: BootstrapInitializer;
	i18n: BootstrapInitializer;
};

/**
 * Runs the synchronous browser-only platform initializers in a deterministic
 * order. The caller owns readiness/error state and may safely retry this
 * function after a failed initialization.
 */
export function initializeApp({ theme, i18n }: AppBootstrapDependencies): void {
	theme.init();
	i18n.init();
}
