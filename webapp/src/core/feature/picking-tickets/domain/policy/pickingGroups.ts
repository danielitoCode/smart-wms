export interface ShippingGroupCandidate {
  customerName: string | null;
  shipAddress?: string | null;
  shipByDate?: string | null;
  shippingAddress: {
    name: string | null; line1: string | null; line2: string | null;
    city: string | null; state: string | null; postalCode: string | null; country?: string | null;
  };
}
function norm(value: unknown): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.,#]+$/, '').trim();
}
function zip5(value: unknown): string {
  const postal = norm(value);
  return postal.match(/^(\d{5})/)?.[1] ?? postal;
}
export function shippingGroupKey(order: ShippingGroupCandidate | null | undefined): string | null {
  if (!order) return null;
  const address = order.shippingAddress;
  const name = norm(address.name || order.customerName);
  const line1 = norm(address.line1);
  if (line1) {
    const postal = zip5(address.postalCode);
    if (!postal) return null;
    return [name, line1, norm(address.line2), norm(address.city), norm(address.state), postal].join('|');
  }
  const legacy = norm(order.shipAddress);
  return legacy ? `legacy:${name}|${legacy}` : null;
}
export function groupOrdersByAddress<T extends ShippingGroupCandidate>(orders: T[]) {
  const byKey = new Map<string, T[]>();
  for (const order of orders) {
    const key = shippingGroupKey(order);
    if (!key) continue;
    const members = byKey.get(key) ?? [];
    members.push(order);
    byKey.set(key, members);
  }
  const groups = [...byKey.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([key, members]) => ({ key, orders: members }));
  const earliest = (group: { orders: T[] }) => group.orders.reduce<number | null>((best, order) => {
    if (!order.shipByDate) return best;
    const time = new Date(order.shipByDate).getTime();
    return best === null || time < best ? time : best;
  }, null);
  groups.sort((a, b) => {
    const left = earliest(a); const right = earliest(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right;
  });
  return groups;
}
