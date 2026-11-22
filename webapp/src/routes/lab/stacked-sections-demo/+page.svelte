<script lang="ts">
	/**
	 * StackedSections demo 001 — spring release product update page.
	 * Port of React StackedSectionsDemo001 using StackedSections + Pane.
	 */
	import StackedSections from '../../../lib/components/StackedSections.svelte';
	import StackedSectionPane from '../../../lib/components/StackedSectionPane.svelte';

	const STACK_OFFSET = 40;

	type Tone = 'light' | 'dark';

	const chapters: Array<{
		title: string;
		lead: string;
		body: string;
		tone: Tone;
		kind: 'tools' | 'board' | 'inbox' | 'cta';
	}> = [
		{
			title: 'Stop chasing context',
			lead: 'Issues, cycles, and customer asks lived in three places.',
			body: 'This release pulls triage into one surface so leads can answer “what are we building and why?” without opening five tabs.',
			tone: 'light',
			kind: 'tools'
		},
		{
			title: 'Cycles that match reality',
			lead: 'Two-week rhythm with capacity hints built in.',
			body: 'Teams see load per lane before the sprint starts — scope slips show up as bar drift, not a surprise retro topic.',
			tone: 'dark',
			kind: 'board'
		},
		{
			title: 'Customer requests, ranked',
			lead: 'Votes roll up from support and sales without a spreadsheet.',
			body: 'Product can promote a request to an issue in one gesture; the inbox stays the source of truth for what users asked for.',
			tone: 'light',
			kind: 'inbox'
		},
		{
			title: 'Ship it on your workspace',
			lead: 'Flags roll out per team — no all-hands required.',
			body: 'Admins enable the spring bundle when ready. Everyone else sees what changed in the changelog the moment they log in.',
			tone: 'dark',
			kind: 'cta'
		}
	];

	const tools = [
		{ label: 'Standup notes', where: 'Slack thread' },
		{ label: 'Cycle scope', where: 'Spreadsheet' },
		{ label: 'Customer ask', where: 'Email' }
	];

	const lanes = [
		{ name: 'Backlog', fill: 28 },
		{ name: 'In progress', fill: 62 },
		{ name: 'Review', fill: 44 },
		{ name: 'Done', fill: 91 }
	];

	const requests = [
		{ title: 'Export audit log to S3', votes: 48 },
		{ title: 'Guest role for contractors', votes: 31 },
		{ title: 'Slack → issue from reaction', votes: 27 }
	];
</script>

<svelte:head>
	<title>StackedSections Demo · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">StackedSections · Spring release</h1>
	<p class="detail-lead">
		Demo de producto: cuatro capítulos pin y stack al hacer scroll. Tipografía Space Grotesk +
		Inter (tokens Abellis).
	</p>
</section>

<div class="demo">
	<div class="demo-inner">
		<header class="demo-header">
			<h2 class="demo-h1">Spring release, one scroll</h2>
			<p class="demo-lead">
				A product update page for a project tool — four chapters pin and stack as you read
				through what shipped this quarter.
			</p>
		</header>

		<StackedSections
			stackOffset={STACK_OFFSET}
			withDramaEffect
			scrollRunway="min(50vh, 24rem)"
			paneGap={null}
			class="demo-deck"
		>
			{#each chapters as ch, i}
				<StackedSectionPane index={i + 1}>
					<section class="chapter chapter--{ch.tone}">
						<div class="chapter-pad">
							<div class="chapter-copy">
								<h3 class="chapter-title">{ch.title}</h3>
								<p class="chapter-lead">{ch.lead}</p>
								<p class="chapter-body">{ch.body}</p>
							</div>

							{#if ch.kind === 'tools'}
								<div class="panel">
									{#each tools as row}
										<div class="tool-row">
											<span class="tool-label">{row.label}</span>
											<span class="tool-where">{row.where}</span>
										</div>
									{/each}
								</div>
							{:else if ch.kind === 'board'}
								<div class="panel panel--pad">
									<p class="board-meta">Cycle · Apr 7 → Apr 21</p>
									<div class="board-lanes">
										{#each lanes as lane}
											<div class="lane">
												<span class="lane-name">{lane.name}</span>
												<div class="lane-track">
													<div class="lane-fill" style="width: {lane.fill}%"></div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else if ch.kind === 'inbox'}
								<ul class="panel panel--list">
									{#each requests as item}
										<li class="req">
											<span class="req-title">{item.title}</span>
											<span class="req-votes">{item.votes}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<div class="panel panel--pad cta">
									<div class="cta-row">
										<span class="cta-avatar">P</span>
										<div>
											<p class="cta-ws">acme.workspace</p>
											<p class="cta-meta">42 members · Pro plan</p>
										</div>
									</div>
									<div class="cta-btn">Turn on spring features</div>
								</div>
							{/if}
						</div>
					</section>
				</StackedSectionPane>
			{/each}
		</StackedSections>

		<footer class="demo-footer">End of release notes</footer>
	</div>
</div>

<style>
	.detail-intro { margin-bottom: 1.25rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 42rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}

	.demo {
		background: #e8eaef; color: #0f1011; border-radius: 14px; overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.demo-inner {
		margin-inline: auto; width: 100%; max-width: 48rem; padding-inline: 1.5rem;
	}
	@media (min-width: 640px) {
		.demo-inner { padding-inline: 2rem; }
	}
	.demo-header {
		display: flex; min-height: min(30svh, 260px); flex-direction: column; justify-content: center;
		gap: 0.75rem; padding-top: max(1.25rem, env(safe-area-inset-top)); padding-bottom: 3rem;
	}
	.demo-h1 {
		margin: 0; max-width: 14ch; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(2rem, 8vw, 3rem); font-weight: 600; line-height: 1.02; letter-spacing: -0.03em;
	}
	.demo-lead {
		margin: 0; max-width: 28rem; font-size: 0.875rem; line-height: 1.65;
		color: color-mix(in srgb, #0f1011 68%, transparent);
	}
	.demo-deck { width: 100%; }

	.chapter {
		display: flex; width: 100%; flex-shrink: 0; flex-direction: column;
		overflow: hidden; border-radius: 1rem;
	}
	.chapter--light { background: #f4f5f8; color: #0f1011; }
	.chapter--dark { background: #0f1011; color: #eeeef0; }
	.chapter-pad {
		display: flex; flex-direction: column; gap: 1.5rem; padding: 2rem 1.5rem;
	}
	@media (min-width: 640px) {
		.chapter-pad { padding: 2.25rem 2rem; }
	}
	.chapter-copy { display: flex; flex-direction: column; gap: 0.625rem; }
	.chapter-title {
		margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.75rem, 7vw, 2.75rem); font-weight: 600; line-height: 1.05; letter-spacing: -0.03em;
	}
	.chapter-lead { margin: 0; font-size: 15px; line-height: 1.35; opacity: 0.72; }
	.chapter-body { margin: 0; max-width: 65ch; font-size: 0.875rem; line-height: 1.65; opacity: 0.72; }

	.panel {
		display: flex; flex-direction: column; gap: 0.5rem; border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
		padding: 0.75rem; background: color-mix(in srgb, #fff 80%, transparent);
	}
	.chapter--dark .panel {
		border-color: color-mix(in srgb, #eeeef0 12%, transparent); background: #1a1b1e;
	}
	.panel--pad { padding: 1rem; }
	.panel--list { list-style: none; margin: 0; padding: 0.75rem; }

	.tool-row {
		display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
		border-radius: 0.5rem; background: color-mix(in srgb, #000 3%, transparent);
		padding: 0.625rem 0.75rem;
	}
	.chapter--dark .tool-row { background: color-mix(in srgb, #fff 4%, transparent); }
	.tool-label { font-size: 0.875rem; font-weight: 500; letter-spacing: -0.01em; }
	.tool-where { font-size: 0.75rem; opacity: 0.72; }

	.board-meta { margin: 0 0 0.75rem; font-size: 0.75rem; font-weight: 500; opacity: 0.72; }
	.board-lanes { display: flex; flex-direction: column; gap: 0.75rem; }
	.lane { display: flex; align-items: center; gap: 0.75rem; }
	.lane-name { width: 6rem; flex-shrink: 0; font-size: 0.75rem; opacity: 0.72; }
	.lane-track {
		height: 0.5rem; flex: 1; overflow: hidden; border-radius: 9999px;
		background: color-mix(in srgb, #fff 10%, transparent);
	}
	.chapter--light .lane-track { background: color-mix(in srgb, #000 8%, transparent); }
	.lane-fill { height: 100%; border-radius: 9999px; background: #8b93ff; }
	.chapter--light .lane-fill { background: #5e6ad2; }

	.req {
		display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
		border-radius: 0.5rem; padding: 0.625rem 0.75rem;
	}
	.req-title { font-size: 0.875rem; font-weight: 500; line-height: 1.35; letter-spacing: -0.01em; }
	.req-votes {
		flex-shrink: 0; border-radius: 0.375rem; padding: 0.125rem 0.5rem;
		font-size: 11px; font-weight: 500; font-variant-numeric: tabular-nums;
		background: color-mix(in srgb, #5e6ad2 12%, transparent); color: #4a52a8;
	}
	.chapter--dark .req-votes {
		background: color-mix(in srgb, #8b93ff 14%, transparent); color: #b4b9ff;
	}

	.cta-row { display: flex; align-items: center; gap: 0.75rem; }
	.cta-avatar {
		display: flex; width: 2.5rem; height: 2.5rem; align-items: center; justify-content: center;
		border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700;
		background: #8b93ff; color: #0f1011;
	}
	.cta-ws { margin: 0; font-size: 0.875rem; font-weight: 500; letter-spacing: -0.01em; }
	.cta-meta { margin: 0; font-size: 0.75rem; opacity: 0.72; }
	.cta-btn {
		display: flex; height: 2.75rem; align-items: center; justify-content: center;
		border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; letter-spacing: -0.01em;
		background: #8b93ff; color: #0f1011;
	}

	.demo-footer {
		display: flex; min-height: min(16svh, 120px); align-items: center; justify-content: center;
		padding-bottom: 3rem; font-size: 0.875rem;
		color: color-mix(in srgb, #0f1011 45%, transparent);
	}
</style>
