<script lang="ts">
	import PrivacyBanner, { type CookieChoices } from '../../../lib/components/PrivacyBanner.svelte';

	let last: { action: string; choices: CookieChoices } | null = $state(null);

	function log(action: string, choices: CookieChoices) {
		last = { action, choices };
	}
</script>

<svelte:head>
	<title>PrivacyBanner · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Consent · Cookies</p>
		<h1 class="lab-title">PrivacyBanner</h1>
		<p class="lab-lead">
			Banner de cookies: Customize con switches, Reject all, Accept all. Confirmación con check animado.
		</p>

		<div class="lab-demo">
			{#key last?.action ?? 'fresh'}
				<PrivacyBanner
					onAccept={(c) => log('accept', c)}
					onReject={(c) => log('reject', c)}
					onSave={(c) => log('save', c)}
				/>
			{/key}
		</div>

		{#if last}
			<pre class="lab-log">{last.action}: {JSON.stringify(last.choices)}</pre>
			<button type="button" class="lab-reset" onclick={() => (last = null)}>Reset banner</button>
		{/if}
	</main>
</div>

<style>
	.lab {
		min-height: 100svh; margin: 0; padding: 1.25rem 1.25rem 3rem; background: #f4f4f5;
		color: #18181b; font-family: ui-sans-serif, system-ui, sans-serif;
		display: flex; flex-direction: column; align-items: center;
	}
	.lab-head { width: 100%; max-width: 440px; margin-bottom: 1.5rem; }
	.back {
		display: inline-block; padding: 0.35rem 0.75rem; border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12); background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem; font-weight: 600; color: inherit; text-decoration: none;
	}
	.lab-main { width: 100%; max-width: 440px; }
	.lab-kicker {
		margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700;
		letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem; font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700; letter-spacing: -0.03em;
	}
	.lab-lead { margin: 0 0 1.5rem; font-size: 0.95rem; line-height: 1.55; opacity: 0.7; }
	.lab-demo { display: flex; justify-content: center; }
	.lab-log {
		margin: 1rem 0 0; padding: 0.75rem 1rem; border-radius: 12px;
		background: rgba(24, 24, 27, 0.06); font-size: 0.75rem; overflow-x: auto;
	}
	.lab-reset {
		margin-top: 0.75rem; padding: 0.4rem 0.9rem; border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12); background: #fff;
		font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}
</style>
