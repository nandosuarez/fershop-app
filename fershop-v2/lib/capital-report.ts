import type { DashboardOrder } from "@/lib/types";

export interface OrderFinancialBreakdown {
  productCostCop: number;
  plannedShippingCop: number;
  paidCop: number;
  paymentRatio: number;
  shippingCollectedCop: number;
  shippingPendingCop: number;
  receivedForMerchandiseCop: number;
  capitalInvestedCop: number;
  capitalRecoveredCop: number;
  capitalFinancedCop: number;
  hasCompleteCosts: boolean;
  hasCapitalInvestment: boolean;
}

export interface ItemShippingAllocation {
  itemIndex: number;
  plannedAmountCop: number;
  collectedAmountCop: number;
  pendingAmountCop: number;
}

function asNonNegativeInteger(value: number | undefined) {
  return Math.max(Math.round(Number(value) || 0), 0);
}

export function getReceivedPaymentsCop(order: Pick<DashboardOrder, "payments">) {
  return order.payments
    .filter((payment) => payment.statusCode === "received")
    .reduce((sum, payment) => sum + asNonNegativeInteger(payment.amountCop), 0);
}

export function hasOrderCapitalInvestment(
  order: Pick<
    DashboardOrder,
    "inventoryReserved" | "purchaseRecordedAtIso" | "arrivalRecordedAtIso" | "deliveredAtIso"
  >
) {
  return Boolean(
    order.inventoryReserved ||
      order.purchaseRecordedAtIso ||
      order.arrivalRecordedAtIso ||
      order.deliveredAtIso
  );
}

export function getOrderFinancialBreakdown(
  order: Pick<
    DashboardOrder,
    | "items"
    | "payments"
    | "totalCop"
    | "inventoryReserved"
    | "purchaseRecordedAtIso"
    | "arrivalRecordedAtIso"
    | "deliveredAtIso"
  >,
  paidCopOverride?: number
): OrderFinancialBreakdown {
  const items = order.items ?? [];
  const hasCompleteCosts =
    items.length > 0 && items.every((item) => typeof item.unitCostCop === "number");
  const productCostCop = items.reduce(
    (sum, item) =>
      sum + asNonNegativeInteger(item.unitCostCop) * asNonNegativeInteger(item.quantity),
    0
  );
  const plannedShippingCop = items.reduce(
    (sum, item) =>
      sum + asNonNegativeInteger(item.unitShippingCostCop) * asNonNegativeInteger(item.quantity),
    0
  );
  const orderTotalCop = asNonNegativeInteger(order.totalCop);
  const paidCop = Math.min(
    asNonNegativeInteger(paidCopOverride ?? getReceivedPaymentsCop(order)),
    orderTotalCop
  );
  const paymentRatio = orderTotalCop > 0 ? paidCop / orderTotalCop : 0;
  const shippingCollectedCop = Math.min(
    plannedShippingCop,
    Math.round(plannedShippingCop * paymentRatio)
  );
  const receivedForMerchandiseCop = Math.max(paidCop - shippingCollectedCop, 0);
  const hasCapitalInvestment = hasOrderCapitalInvestment(order);
  const capitalInvestedCop = hasCapitalInvestment ? productCostCop : 0;

  return {
    productCostCop,
    plannedShippingCop,
    paidCop,
    paymentRatio,
    shippingCollectedCop,
    shippingPendingCop: Math.max(plannedShippingCop - shippingCollectedCop, 0),
    receivedForMerchandiseCop,
    capitalInvestedCop,
    capitalRecoveredCop: Math.min(capitalInvestedCop, receivedForMerchandiseCop),
    capitalFinancedCop: Math.max(capitalInvestedCop - receivedForMerchandiseCop, 0),
    hasCompleteCosts,
    hasCapitalInvestment,
  };
}

export function getItemShippingAllocations(
  order: Parameters<typeof getOrderFinancialBreakdown>[0],
  paidCopOverride?: number
): ItemShippingAllocation[] {
  const items = order.items ?? [];
  const breakdown = getOrderFinancialBreakdown(order, paidCopOverride);
  const allocations = items.map((item, itemIndex) => ({
    itemIndex,
    plannedAmountCop:
      asNonNegativeInteger(item.unitShippingCostCop) * asNonNegativeInteger(item.quantity),
    collectedAmountCop: 0,
    pendingAmountCop: 0,
  }));
  const contributingAllocations = allocations.filter((allocation) => allocation.plannedAmountCop > 0);

  let allocatedCop = 0;
  contributingAllocations.forEach((allocation, index) => {
    const isLast = index === contributingAllocations.length - 1;
    allocation.collectedAmountCop = isLast
      ? breakdown.shippingCollectedCop - allocatedCop
      : Math.floor(allocation.plannedAmountCop * breakdown.paymentRatio);
    allocation.collectedAmountCop = Math.min(
      Math.max(allocation.collectedAmountCop, 0),
      allocation.plannedAmountCop
    );
    allocation.pendingAmountCop =
      allocation.plannedAmountCop - allocation.collectedAmountCop;
    allocatedCop += allocation.collectedAmountCop;
  });

  return allocations;
}
