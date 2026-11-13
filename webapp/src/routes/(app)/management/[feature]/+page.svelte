<script lang="ts">
	import { page } from '$app/state';
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
	import SettingsScreen from '../../../../core/feature/settings/ui/screens/SettingsScreen.svelte';
	import ApiTokensScreen from '../../../../core/feature/api-tokens/ui/screens/ApiTokensScreen.svelte';
	import ChannelsScreen from '../../../../core/feature/channels/ui/screens/ChannelsScreen.svelte';
	import WebhooksScreen from '../../../../core/feature/webhooks/ui/screens/WebhooksScreen.svelte';
	import NotificationsScreen from '../../../../core/feature/notifications/ui/screens/NotificationsScreen.svelte';
	import IntegrationsScreen from '../../../../core/feature/integrations/ui/screens/IntegrationsScreen.svelte';
	import ConsumerGroupsScreen from '../../../../core/feature/consumer-groups/ui/screens/ConsumerGroupsScreen.svelte';
	import InboundActivityScreen from '../../../../core/feature/inbound-activity/ui/screens/InboundActivityScreen.svelte';
	import ImportsScreen from '../../../../core/feature/imports/ui/screens/ImportsScreen.svelte';
	import AuditLogScreen from '../../../../core/feature/audit-log/ui/screens/AuditLogScreen.svelte';
</script>

{#if page.params.feature === 'customers'}
	<CustomersScreen />
{:else if page.params.feature === 'sales-orders'}
	<SalesOrdersScreen />
{:else if page.params.feature === 'vendors'}
	<VendorsScreen />
{:else if page.params.feature === 'users'}
	<UsersScreen />
{:else if page.params.feature === 'preferred-bins'}
	<PreferredBinsScreen />
{:else if page.params.feature === 'purchase-orders'}
	<PurchaseOrdersScreen />
{:else if page.params.feature === 'transfer-orders'}
	<TransferOrdersScreen />
{:else if page.params.feature === 'backorders'}
	<BackordersScreen />
{:else if page.params.feature === 'fraud'}
	<FraudReviewScreen />
{:else if page.params.feature === 'pos-activity'}
	<PosActivityScreen />
{:else if page.params.feature === 'inter-warehouse-transfers'}
	<InterWarehouseTransfersScreen />
{:else if page.params.feature === 'returns'}
	<ReturnsScreen />
{:else if page.params.feature === 'refunds'}
	<RefundsScreen />
{:else if page.params.feature === 'count-approvals'}
	<CycleCountApprovalsScreen />
{:else if page.params.feature === 'adjustments'}
	<InventoryAdjustmentsScreen />
{:else if page.params.feature === 'settings'}
	<SettingsScreen />
{:else if page.params.feature === 'api-tokens'}
	<ApiTokensScreen />
{:else if page.params.feature === 'channels'}
	<ChannelsScreen />
{:else if page.params.feature === 'webhooks'}
	<WebhooksScreen />
{:else if page.params.feature === 'notifications'}
	<NotificationsScreen />
{:else if page.params.feature === 'integrations'}
	<IntegrationsScreen />
{:else if page.params.feature === 'consumer-groups'}
	<ConsumerGroupsScreen />
{:else if page.params.feature === 'inbound-activity'}
	<InboundActivityScreen />
{:else if page.params.feature === 'imports'}
	<ImportsScreen />
{:else if page.params.feature === 'audit-log'}
	<AuditLogScreen />
{:else}
	<AdminOperationScreen />
{/if}
