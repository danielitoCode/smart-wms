<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';
	import AppIcon from './AppIcon.svelte';
	const i18n = getContext<I18nState>('i18n');
</script>

<label class="locale" aria-label={i18n.t('Idioma')}>
	<AppIcon name="globe" size={17} />
	<select
			aria-label={i18n.t('Idioma')}
			value={i18n.locale}
			onchange={(event) => i18n.setLocale(event.currentTarget.value)}>
		<option value="it">Italiano</option>
		<option value="es">Español</option>
		<option value="en">English</option>
	</select>
</label>

<style>
	.locale {
		min-height:40px;
		display:inline-flex;
		align-items:center;
		gap:6px;
		padding:0 8px;
		border:1px solid var(--line);
		border-radius:10px;
		color:var(--link,var(--navy));
		background:var(--surface);
	}
	select {
		max-width:104px;
		border:0;
		outline:0;
		color:var(--ink);
		background:transparent;
		font:600 .78rem var(--body);
		cursor:pointer;
	}
	@media(max-width:520px) {
		.locale {
			min-width:40px;
			justify-content:center;
			padding:0 6px;
		}
		select { max-width:76px; }
	}
</style>
