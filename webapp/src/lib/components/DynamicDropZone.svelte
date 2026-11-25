<script lang="ts">
	/**
	 * Dynamic Drop Zone — file drop that turns into a black hole.
	 * Svelte 5 port (simplified interactive shell). Full motion version in artifacts/DynamicDropZone.svelte
	 */
	import './dynamic-drop-zone.css';

	export type DynamicDropZoneProps = {
		theme?: 'light' | 'dark';
		onFiles?: (files: File[]) => void;
	};

	let { theme = 'light', onFiles }: DynamicDropZoneProps = $props();

	let over = $state(false);
	let hole = $state(false);
	let status = $state<'idle' | 'uploading' | 'done'>('idle');
	let fileName = $state<string | null>(null);
	let demoName = 'invoice-batch.pdf';

	function accept(files: FileList | File[] | null) {
		if (!files || (files as FileList).length === 0) return;
		const list = Array.from(files as FileList);
		fileName = list[0]?.name ?? demoName;
		hole = true;
		status = 'uploading';
		onFiles?.(list);
		setTimeout(() => {
			status = 'done';
			setTimeout(() => {
				hole = false;
				status = 'idle';
			}, 1200);
		}, 1400);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		over = true;
	}
	function onDragLeave() {
		over = false;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		over = false;
		accept(e.dataTransfer?.files ?? null);
	}
	function onInputChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		accept(input.files);
		input.value = '';
	}
	function demo() {
		fileName = demoName;
		accept([new File(['demo'], demoName, { type: 'application/pdf' })]);
	}
</script>

<div class="pdz" data-theme={theme}>
	<div
		class="pdz__zone"
		data-over={over || undefined}
		data-hole={hole || undefined}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && demo()}
	>
		{#if status === 'idle' && !hole}
			<p class="pdz__title">Drop files here</p>
			<p class="pdz__hint">or press Enter / click the demo file to try without one</p>
			<button type="button" class="pdz__file" onpointerdown={(e) => e.preventDefault()} onclick={demo}>
				📄 {demoName}
			</button>
			<input type="file" class="sr-only" style="position:absolute;inset:0;opacity:0;cursor:pointer" onchange={onInputChange} />
		{:else if status === 'uploading'}
			<p class="pdz__title">Swallowing…</p>
			<p class="pdz__hint">{fileName}</p>
		{:else}
			<span class="pdz__pill">✓ Uploaded {fileName}</span>
		{/if}
	</div>
	<p class="pdz__hint">Real desktop files work too. Full black-hole rings live in artifacts.</p>
</div>
