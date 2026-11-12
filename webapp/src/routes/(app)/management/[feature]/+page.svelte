<script lang="ts">
 import {page} from '$app/state';
 import AdminOperationScreen from '../../../../core/feature/admin-operations/ui/screens/AdminOperationScreen.svelte';
 import VendorsScreen from '../../../../core/feature/vendors/ui/screens/VendorsScreen.svelte';
 import UsersScreen from '../../../../core/feature/users/ui/screens/UsersScreen.svelte';
 import PreferredBinsScreen from '../../../../core/feature/preferred-bins/ui/screens/PreferredBinsScreen.svelte';
 import PurchaseOrdersScreen from '../../../../core/feature/purchase-orders/ui/screens/PurchaseOrdersScreen.svelte';
 import TransferOrdersScreen from '../../../../core/feature/transfer-orders/ui/screens/TransferOrdersScreen.svelte';
 import InventoryAdjustmentsScreen from '../../../../core/feature/inventory-adjustments/ui/screens/InventoryAdjustmentsScreen.svelte';
</script>
{#if page.params.feature==='vendors'}
 <VendorsScreen />
{:else if page.params.feature==='users'}
 <UsersScreen />
{:else if page.params.feature==='preferred-bins'}
 <PreferredBinsScreen />
{:else if page.params.feature==='purchase-orders'}
 <PurchaseOrdersScreen />
{:else if page.params.feature==='transfer-orders'}
 <TransferOrdersScreen />
{:else if page.params.feature==='adjustments'||page.params.feature==='count-approvals'}
 <InventoryAdjustmentsScreen />
{:else}
 <AdminOperationScreen />
{/if}
