<script lang="ts">
	/**
	 * Halo Sign In — soft two-layer sign-in card (tray + card).
	 * CSS animations replace Motion; demo submit cycles idle → loading → done.
	 */
	import './halo-sign-in.css';

	export type HaloSignInValues = { email: string; password: string };

	type Status = 'idle' | 'loading' | 'done';
	type Provider = 'google' | 'facebook' | 'apple';

	type Props = {
		onSubmit?: (values: HaloSignInValues) => Promise<void> | void;
		onProvider?: (provider: Provider) => void;
	};

	let { onSubmit, onProvider }: Props = $props();

	let showPassword = $state(false);
	let status = $state<Status>('idle');
	const emailId = 'hsi-email';
	const passwordId = 'hsi-password';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (status !== 'idle') return;
		const form = e.currentTarget as HTMLFormElement;
		const data = new FormData(form);
		status = 'loading';
		try {
			if (onSubmit) {
				await onSubmit({
					email: String(data.get('email') ?? ''),
					password: String(data.get('password') ?? '')
				});
			} else {
				await new Promise((r) => setTimeout(r, 1100));
			}
			status = 'done';
			setTimeout(() => (status = 'idle'), 1500);
		} catch {
			status = 'idle';
		}
	}
</script>

<main class="hsi">
	<section class="hsi__tray" aria-labelledby="hsi-title">
		<div class="hsi__card">
			<div class="hsi__halo">
				<svg viewBox="-60 -60 120 120" class="hsi__dots" aria-hidden="true">
					<g class="hsi__dots-spin">
						{#each [
							[33.944, 1.947], [32.202, 10.852], [27.084, 20.528], [19.182, 28.063], [9.378, 32.678],
							[-1.191, 33.979], [-11.599, 31.962], [-20.869, 26.84], [-28.141, 19.082], [-32.666, 9.42],
							[-33.979, -1.191], [-31.962, -11.599], [-26.84, -20.869], [-19.082, -28.141], [-9.42, -32.666],
							[1.191, -33.979], [11.599, -31.962], [20.869, -26.84],
							[42.731, 10.508], [37.997, 22.186], [29.556, 32.587], [18.238, 40.091], [5.27, 43.683],
							[-8.151, 43.238], [-20.722, 38.8], [-31.462, 30.724], [-39.248, 19.728], [-43.238, 6.824],
							[-43.238, -6.824], [-39.248, -19.728], [-31.462, -30.724], [-20.722, -38.8], [-8.151, -43.238],
							[5.27, -43.683], [18.238, -40.091], [29.556, -32.587], [37.997, -22.186], [42.731, -10.508],
							[42.731, 10.508], [53.196, 9.277], [49.651, 21.301], [42.562, 31.801], [32.587, 39.862],
							[20.528, 44.791], [7.074, 46.237], [-6.824, 44.079], [-19.728, 38.396], [-30.724, 29.556],
							[-38.8, 18.238], [-43.238, 5.27], [-43.683, -8.151], [-40.091, -20.722], [-32.587, -31.462],
							[-22.186, -39.248], [-10.508, -43.238], [2.094, -43.95], [14.54, -41.192], [25.767, -35.274],
							[34.894, -26.84], [41.192, -16.538], [44.079, -5.27], [43.683, 6.824], [40.091, 18.238],
							[33.087, 28.141], [23.51, 35.838], [12.152, 40.64]
						] as pt, i (i)}
							<circle cx={pt[0]} cy={pt[1]} r="0.9" fill="currentColor" />
						{/each}
					</g>
				</svg>
				<div class="hsi__mark">
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							class="hsi__mark-path"
							d="M4.5 10.4 12 4.5l7.5 5.9V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18v-7.6Z"
							fill="none"
							stroke="#fff"
							stroke-width="2"
							stroke-linejoin="round"
							opacity="0"
						/>
						<g class="hsi__mark-key">
							<circle cx="12" cy="12.8" r="1.7" fill="#fff" />
							<path d="M11.2 13.6h1.6l.4 3h-2.4l.4-3Z" fill="#fff" />
						</g>
					</svg>
				</div>
			</div>

			<header class="hsi__head hsi__item hsi__item--0">
				<h1 id="hsi-title" class="hsi__title">Sign in to continue</h1>
				<p class="hsi__lede">Please sign in to start your rental application</p>
			</header>

			<form class="hsi__form" onsubmit={handleSubmit}>
				<div class="hsi__item hsi__item--1">
					<div class="hsi__field">
						<label class="hsi__sr" for={emailId}>Email</label>
						<span class="hsi__field-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M3.5 5.5h17a1.5 1.5 0 0 1 1.5 1.5v.36l-10 5.7-10-5.7V7a1.5 1.5 0 0 1 1.5-1.5Z" />
								<path d="M2 9.08V17a1.5 1.5 0 0 0 1.5 1.5h17A1.5 1.5 0 0 0 22 17V9.08l-9.5 5.42a1 1 0 0 1-1 0L2 9.08Z" />
							</svg>
						</span>
						<input
							id={emailId}
							class="hsi__input"
							type="email"
							name="email"
							required
							autocomplete="email"
							placeholder="Email"
						/>
					</div>
				</div>

				<div class="hsi__item hsi__item--2">
					<div class="hsi__field">
						<label class="hsi__sr" for={passwordId}>Password</label>
						<span class="hsi__field-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M7 9V7.5a5 5 0 0 1 10 0V9h.5A2.5 2.5 0 0 1 20 11.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-8A2.5 2.5 0 0 1 6.5 9H7Zm2 0h6V7.5a3 3 0 1 0-6 0V9Zm3 4a1.5 1.5 0 0 0-1 2.62V17a1 1 0 1 0 2 0v-1.38A1.5 1.5 0 0 0 12 13Z"
								/>
							</svg>
						</span>
						<input
							id={passwordId}
							class="hsi__input"
							type={showPassword ? 'text' : 'password'}
							name="password"
							required
							minlength="6"
							autocomplete="current-password"
							placeholder="Password"
						/>
						<span class="hsi__trailing">
							<button
								type="button"
								class="hsi__peek"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								aria-pressed={showPassword}
								onclick={() => (showPassword = !showPassword)}
							>
								<span class="hsi__peek-icon">
									{#if showPassword}
										<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path
												d="M3.3 2.3a1 1 0 0 0-1.4 1.4l2.4 2.4A11.6 11.6 0 0 0 2.2 11.4a1.4 1.4 0 0 0 0 1.2C3.7 15.9 7.4 19 12 19c1.7 0 3.3-.4 4.7-1.2l3 3a1 1 0 0 0 1.4-1.4l-17.8-17.1ZM12 8.5c.2 0 .5 0 .7.1L8.6 4.5A10.9 10.9 0 0 1 12 5c4.6 0 8.3 3.1 9.8 6.4a1.4 1.4 0 0 1 0 1.2 11.7 11.7 0 0 1-2.4 3.4L15.4 12A3.5 3.5 0 0 0 12 8.5Zm-3.4 3.1 3.8 3.8a3.5 3.5 0 0 1-3.8-3.8Z"
											/>
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M12 5c4.6 0 8.3 3.1 9.8 6.4a1.4 1.4 0 0 1 0 1.2C20.3 15.9 16.6 19 12 19s-8.3-3.1-9.8-6.4a1.4 1.4 0 0 1 0-1.2C3.7 8.1 7.4 5 12 5Zm0 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
											/>
										</svg>
									{/if}
								</span>
							</button>
						</span>
					</div>
				</div>

				<div class="hsi__submit-row hsi__item hsi__item--3">
					<button type="submit" class="hsi__submit" disabled={status !== 'idle'} aria-live="polite">
						{#key status}
							<span class="hsi__submit-label">
								{#if status === 'idle'}
									Sign In
								{:else if status === 'loading'}
									<svg viewBox="0 0 24 24" fill="none" class="hsi__spinner" aria-hidden="true">
										<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="3" />
										<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
									</svg>
									Signing in…
								{:else}
									Welcome back
								{/if}
							</span>
						{/key}
					</button>
				</div>
			</form>

			<div class="hsi__or hsi__item hsi__item--4">
				<span class="hsi__rule" aria-hidden="true"></span>
				<span>Or continue with</span>
				<span class="hsi__rule" aria-hidden="true"></span>
			</div>

			<div class="hsi__socials hsi__item hsi__item--5">
				<button type="button" class="hsi__social" aria-label="Continue with Google" title="Continue with Google" onclick={() => onProvider?.('google')}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
						<path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
						<path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
						<path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
					</svg>
				</button>
				<button type="button" class="hsi__social" aria-label="Continue with Facebook" title="Continue with Facebook" onclick={() => onProvider?.('facebook')}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<circle cx="12" cy="12" r="12" fill="#0866FF" />
						<path fill="#fff" d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.95-1.88h1.51V4.92s-1.37-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.03V24a12.1 12.1 0 0 0 3.76 0v-8.53h2.8Z" />
					</svg>
				</button>
				<button type="button" class="hsi__social" aria-label="Continue with Apple" title="Continue with Apple" onclick={() => onProvider?.('apple')}>
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91a4.8 4.8 0 0 0-3.77-2.04c-1.6-.16-3.13.94-3.95.94-.81 0-2.07-.92-3.4-.9a5.04 5.04 0 0 0-4.26 2.58c-1.82 3.15-.47 7.82 1.3 10.38.87 1.25 1.9 2.66 3.26 2.6 1.31-.05 1.8-.84 3.38-.84 1.58 0 2.02.84 3.4.82 1.41-.03 2.3-1.27 3.15-2.53a11.3 11.3 0 0 0 1.43-2.93 4.55 4.55 0 0 1-2.76-4.17ZM13.77 5.1A4.5 4.5 0 0 0 14.83 1.8a4.63 4.63 0 0 0-3 1.55 4.3 4.3 0 0 0-1.09 3.18 3.81 3.81 0 0 0 3.03-1.43Z" />
					</svg>
				</button>
			</div>
		</div>

		<p class="hsi__foot">
			Don't have an account?
			<a href="#signup" class="hsi__link">Sign Up</a>
		</p>
	</section>
</main>
