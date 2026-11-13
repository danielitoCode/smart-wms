<script lang="ts">
 import {page} from '$app/state';
 import AdminOperationScreen from '../../../../core/feature/admin-operations/ui/screens/AdminOperationScreen.svelte';
 import CustomersScreen from '../../../../core/feature/customers/ui/screens/CustomersScreen.svelte';
 import SalesOrdersScreen from '../../../../core/feature/sales-orders/ui/screens/SalesOrdersScreen.svelte';
 import VendorsScreen from '../../../../core/feature/vendors/ui/screens/VendorsScreen.svelte';
 import UsersScreen from '../../../../core/feature/users/ui/screens/UsersScreen.svelte';
 import PreferredBinsScreen from '../../../../core/feature/preferred-bins/ui/screens/PreferredBinsScreen.svelte';
 import PurchaseOrdersScreen from '../../../../core/feature/purchase-orders/ui/screens/PurchaseOrdersScreen.svelte';
 import TransferOrdersScreen from '../../../../core/feature/transfer-orders/ui/screens/TransferOrdersScreen.svelte';
 import InventoryAdjustmentsScreen from '../../../../core/feature/inventory-adjustments/ui/screens/InventoryAdjustmentsScreen.svelte';
 import BackordersScreen from '../../../../core/feature/backorders/ui/screens/BackordersScreen.svelte';
 import FraudReviewScreen from '../../../../core/feature/fraud/ui/screens/FraudReviewScreen.svelte';
 import PosActivityScreen from '../../../../core/feature/pos-activity/ui/screens/PosActivityScreen.svelte';
 import InterWarehouseTransfersScreen from '../../../../core/feature/inter-warehouse-transfers/ui/screens/InterWarehouseTransfersScreen.svelte';
 import ReturnsScreen from '../../../../core/feature/returns/ui/screens/ReturnsScreen.svelte';
 import RefundsScreen from '../../../../core/feature/refunds/ui/screens/RefundsScreen.svelte';
 import CycleCountApprovalsScreen from '../../../../core/feature/cycle-count-approvals/ui/screens/CycleCountApprovalsScreen.svelte';
</script>
{#if page.params.feature==='customers'}
 <CustomersScreen />
{:else if page.params.feature==='sales-orders'}
 <SalesOrdersScreen />
{:else if page.params.feature==='vendors'}
 <VendorsScreen />
{:else if page.params.feature==='users'}
 <UsersScreen />
{:else if page.params.feature==='preferred-bins'}
 <PreferredBinsScreen />
{:else if page.params.feature==='purchase-orders'}
 <PurchaseOrdersScreen />
{:else if page.params.feature==='transfer-orders'}
 <TransferOrdersScreen />
{:else if page.params.feature==='backorders'}
 <BackordersScreen />
{:else if page.params.feature==='fraud'}
 <FraudReviewScreen />
{:else if page.params.feature==='pos-activity'}
 <PosActivityScreen />
{:else if page.params.feature==='inter-warehouse-transfers'}
 <InterWarehouseTransfersScreen />
{:else if page.params.feature==='returns'}
 <ReturnsScreen />
{:else if page.params.feature==='refunds'}
 <RefundsScreen />
{:else if page.params.feature==='count-approvals'}
 <CycleCountApprovalsScreen />
{:else if page.params.feature==='adjustments'}
 <InventoryAdjustmentsScreen />
{:else}
 <AdminOperationScreen />
{/if}
