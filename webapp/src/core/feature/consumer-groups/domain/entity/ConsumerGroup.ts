export type SubscriptionFilter = {
  eventTypes?: string[];
  warehouseIds?: number[];
};

export type ConnectorRegistryEntry = {
  connectorId: string;
  displayName: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ConsumerGroup = {
  consumerGroupId: string;
  connectorId: string;
  lastCursor: number;
  lastHeartbeat: string | null;
  subscription: SubscriptionFilter;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ConnectorCreateInput = { connectorId: string; displayName: string };
export type ConnectorUpdateInput = { connectorId: string; displayName: string };
export type ConsumerGroupCreateInput = {
  consumerGroupId: string;
  connectorId: string;
  subscription: SubscriptionFilter;
  acknowledgeReplay?: boolean;
};
export type ConsumerGroupUpdateInput = {
  consumerGroupId: string;
  subscription: SubscriptionFilter;
};
