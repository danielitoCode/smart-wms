<script lang="ts">
	/**
	 * Lab layout — sin auth, sin shell de app.
	 * Solo para previsualizar componentes UI durante la migración.
	 */
	let { children } = $props();
</script>

<div class="lab-shell">
	<header class="lab-header">
		<a href="/lab" class="lab-brand">
			<span class="lab-brand__mark">UI</span>
			<span class="lab-brand__text">Component Lab</span>
		</a>
		<nav class="lab-nav">
			<a href="/lab">Overview</a>
			<a href="/lab/task-widget">TaskWidget</a>
			<a href="/lab/hover-expand">HoverExpand</a>
			<a href="/lab/onboarding">Onboarding</a>
		</nav>
	</header>
	<main class="lab-main">
		{@render children()}
	</main>
</div>

<style>
	.lab-shell {
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}

	.lab-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1.25rem;
		border-bottom: 1px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.lab-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		text-decoration: none;
		color: inherit;
		font-weight: 600;
	}

	.lab-brand__mark {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: var(--navy, #004c8b);
		color: #fff;
		font-size: 0.7rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		letter-spacing: 0.02em;
	}

	.lab-brand__text {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		color: var(--head-ink, #012a50);
	}

	.lab-nav {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.lab-nav a {
		padding: 0.35rem 0.7rem;
		border-radius: 8px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
		text-decoration: none;
		transition: background 140ms ease, color 140ms ease;
	}

	.lab-nav a:hover {
		background: var(--surface-2, #f5f8fc);
		color: var(--ink, #132234);
	}

	.lab-main {
		padding: 1.5rem 1.25rem 3rem;
		max-width: 1100px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		.lab-header {
			padding: 0.9rem 1.75rem;
		}
		.lab-main {
			padding: 2rem 1.75rem 4rem;
		}
	}
</style>
