<script lang="ts">
	type IconName =
		| 'inbox' | 'map-pin' | 'clipboard-list' | 'package-check' | 'truck'
		| 'boxes' | 'scan' | 'package' | 'warehouse' | 'database'
		| 'menu' | 'user' | 'logout' | 'lock';

	let { name, size = 20, strokeWidth = 1.8 }: {
		name: IconName;
		size?: number;
		strokeWidth?: number;
	} = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
	{#if name === 'inbox'}
		<path d="M4 4h16l2 11v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4L4 4Z" /><path d="M2 15h6l2 3h4l2-3h6" />
	{:else if name === 'map-pin'}
		<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />
	{:else if name === 'clipboard-list'}
		<rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5Z" /><path d="M9 10h6M9 14h6M9 18h3" />
	{:else if name === 'package-check'}
		<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" /><path d="m8.5 5 9 5" />
	{:else if name === 'truck'}
		<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" />
	{:else if name === 'boxes'}
		<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.5 7.5 4 7.5-4M12 12v9" /><path d="m8 5.2 8 4.4" />
	{:else if name === 'scan'}
		<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10M9 9v6M15 9v6" />
	{:else if name === 'package'}
		<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" />
	{:else if name === 'warehouse'}
		<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M8 21v-7h8v7M8 10h.01M12 10h.01M16 10h.01" />
	{:else if name === 'database'}
		<ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
	{:else if name === 'menu'}
		<path d="M4 6h16M4 12h16M4 18h16" />
	{:else if name === 'user'}
		<circle cx="12" cy="8" r="3.5" /><path d="M4 21a8 8 0 0 1 16 0" />
	{:else if name === 'logout'}
		<path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
	{:else if name === 'lock'}
		<rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
	{/if}
</svg>
