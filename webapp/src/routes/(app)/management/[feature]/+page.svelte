<script lang="ts">
 import {page} from '$app/state';
 import AdminOperationScreen from '../../../../core/feature/admin-operations/ui/screens/AdminOperationScreen.svelte';
 import VendorsScreen from '../../../../core/feature/vendors/ui/screens/VendorsScreen.svelte';
</script>
{#if page.params.feature==='vendors'}<VendorsScreen />{:else}<AdminOperationScreen />{/if}