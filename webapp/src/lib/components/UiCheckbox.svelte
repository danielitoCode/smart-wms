<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		label = '',
		id = undefined,
		name = undefined,
		value = undefined,
		onchange = undefined
	}: {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		id?: string;
		name?: string;
		value?: string;
		onchange?: (checked: boolean) => void;
	} = $props();

	const inputId = $derived(id ?? `ui-check-${Math.random().toString(36).slice(2, 9)}`);

	function onInputChange(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		checked = el.checked;
		onchange?.(el.checked);
	}
</script>

<label class="ui-check" for={inputId}>
	<input
		id={inputId}
		class="ui-check__input"
		type="checkbox"
		{name}
		{value}
		{disabled}
		{checked}
		onchange={onInputChange}
	/>
	<span class="ui-check__box" aria-hidden="true">
		<svg viewBox="0 0 18 18" height="18" width="18">
			<path
				d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
			></path>
			<polyline points="1 9 7 14 15 4"></polyline>
		</svg>
	</span>
	{#if label}
		<span class="ui-check__text">{label}</span>
	{/if}
</label>
