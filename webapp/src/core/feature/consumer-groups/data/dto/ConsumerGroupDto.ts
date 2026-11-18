export type SubscriptionFilterDto = {
  event_types?: string[] | null;
  warehouse_ids?: number[] | null;
};
export type ConsumerGroupDto = {
  consumer_group_id: string;
  connector_id: string;
  last_cursor: number;
  last_heartbeat: string | null;
  subscription: SubscriptionFilterDto | null;
  created_at: string | null;
  updated_at: string | null;
};
export type ConnectorRegistryDto = {
  connector_id: string;
  display_name: string;
  created_at: string | null;
  updated_at: string | null;
};
export type ConsumerGroupListResponseDto = { consumer_groups: ConsumerGroupDto[] };
export type ConnectorRegistryListResponseDto = { connectors: ConnectorRegistryDto[] };
