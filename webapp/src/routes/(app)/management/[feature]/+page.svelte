<script lang="ts">
 import {page} from '$app/state';
 import AdminOperationScreen from '../../../../core/feature/admin-operations/ui/screens/AdminOperationScreen.svelte';
 import VendorsScreen from '../../../../core/feature/vendors/ui/screens/VendorsScreen.svelte';
 import UsersScreen from '../../../../core/feature/users/ui/screens/UsersScreen.svelte';
</script>
{#if page.params.feature==='vendors'}<VendorsScreen />{:else if page.params.feature==='users'}<UsersScreen />{:else}<AdminOperationScreen />{/if}