import type { DashboardOrder, OrderItem } from "@/lib/types";

export interface OrderArrivalProgress {
  totalUnits: number;
  arrivedUnits: number;
  remainingUnits: number;
  hasPartialArrival: boolean;
  allArrived: boolean;
}

function asNonNegativeInteger(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(Math.trunc(value ?? 0), 0) : 0;
}

export function getItemArrivedQuantity(
  item: Pick<OrderItem, "quantity" | "arrivedQuantity">,
  legacyOrderArrivalIso?: string
) {
  const quantity = asNonNegativeInteger(item.quantity);
  if (legacyOrderArrivalIso) {
    return quantity;
  }
  return Math.min(asNonNegativeInteger(item.arrivedQuantity), quantity);
}

export function getOrderArrivalProgress(
  order: Pick<DashboardOrder, "items" | "arrivalRecordedAtIso">
): OrderArrivalProgress {
  const items = (order.items ?? []).filter((item) => item.saleMode === "preorder");
  const totalUnits = items.reduce(
    (total, item) => total + asNonNegativeInteger(item.quantity),
    0
  );
  const arrivedUnits = items.reduce(
    (total, item) =>
      total + getItemArrivedQuantity(item, order.arrivalRecordedAtIso),
    0
  );
  const remainingUnits = Math.max(totalUnits - arrivedUnits, 0);

  return {
    totalUnits,
    arrivedUnits,
    remainingUnits,
    hasPartialArrival: arrivedUnits > 0 && remainingUnits > 0,
    allArrived: totalUnits > 0 && remainingUnits === 0,
  };
}
