import type { DashboardOrder, OrderItem } from "@/lib/types";

export interface OrderFinancialBreakdown {
  productCostCop: number;
  plannedShippingCop: number;
  paidCop: number;
  paymentRatio: number;
  shippingCollectedCop: number;
  shippingPendingCop: number;
  receivedForMerchandiseCop: number;
  hasCompleteCosts: boolean;
}

export interface OrderPurchaseFundingBreakdown {
  productCostCop: number;
  shippingCostCop: number;
  totalPurchaseCostCop: number;
  customerPaidBeforePurchaseCop: number;
  customerContributionCop: number;
  customerContributionPercent: number;
  ownCapitalCop: number;
  ownCapitalPercent: number;
  totalPaidCop: number;
  paidAfterPurchaseCop: number;
  hasCompleteCosts: boolean;
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

function getCustomerPaidBeforePurchaseCop(
  order: Pick<DashboardOrder, "payments" | "purchaseRecordedAtIso">
) {
  return order.payments
    .filter((payment) => {
      if (payment.statusCode !== "received") {
        return false;
      }
      if (order.purchaseRecordedAtIso && payment.recordedAtIso) {
        return payment.recordedAtIso <= order.purchaseRecordedAtIso;
      }
      return payment.kind === "advance";
    })
    .reduce((sum, payment) => sum + asNonNegativeInteger(payment.amountCop), 0);
}

function summarizePurchaseCosts(items: OrderItem[]) {
  return items.reduce(
    (summary, item) => {
      const quantity = asNonNegativeInteger(item.quantity);
      summary.productCostCop += asNonNegativeInteger(item.unitCostCop) * quantity;
      summary.shippingCostCop += asNonNegativeInteger(item.unitShippingCostCop) * quantity;
      summary.hasCompleteCosts &&= typeof item.unitCostCop === "number";
      return summary;
    },
    {
      productCostCop: 0,
      shippingCostCop: 0,
      hasCompleteCosts: items.length > 0,
    }
  );
}

export function getOrderPurchaseFundingBreakdown(
  order: Pick<
    DashboardOrder,
    "items" | "payments" | "purchaseRecordedAtIso"
  >,
  includedItems?: OrderItem[]
): OrderPurchaseFundingBreakdown {
  const allItems = order.items ?? [];
  const selectedItems = includedItems ?? allItems;
  const allCosts = summarizePurchaseCosts(allItems);
  const selectedCosts = summarizePurchaseCosts(selectedItems);
  const allPurchaseCostCop = allCosts.productCostCop + allCosts.shippingCostCop;
  const totalPurchaseCostCop =
    selectedCosts.productCostCop + selectedCosts.shippingCostCop;
  const customerPaidBeforePurchaseCop = getCustomerPaidBeforePurchaseCop(order);
  const totalCustomerContributionCop = Math.min(
    customerPaidBeforePurchaseCop,
    allPurchaseCostCop
  );
  const customerContributionCop =
    allPurchaseCostCop > 0
      ? Math.min(
          Math.round(
            totalCustomerContributionCop * (totalPurchaseCostCop / allPurchaseCostCop)
          ),
          totalPurchaseCostCop
        )
      : 0;
  const ownCapitalCop = Math.max(
    totalPurchaseCostCop - customerContributionCop,
    0
  );
  const totalPaidCop = getReceivedPaymentsCop(order);

  return {
    productCostCop: selectedCosts.productCostCop,
    shippingCostCop: selectedCosts.shippingCostCop,
    totalPurchaseCostCop,
    customerPaidBeforePurchaseCop,
    customerContributionCop,
    customerContributionPercent:
      totalPurchaseCostCop > 0
        ? Math.round((customerContributionCop / totalPurchaseCostCop) * 10_000) / 100
        : 0,
    ownCapitalCop,
    ownCapitalPercent:
      totalPurchaseCostCop > 0
        ? Math.round((ownCapitalCop / totalPurchaseCostCop) * 10_000) / 100
        : 0,
    totalPaidCop,
    paidAfterPurchaseCop: Math.max(totalPaidCop - customerPaidBeforePurchaseCop, 0),
    hasCompleteCosts: selectedCosts.hasCompleteCosts,
  };
}

export function getOrderFinancialBreakdown(
  order: Pick<
    DashboardOrder,
    "items" | "payments" | "totalCop"
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

  return {
    productCostCop,
    plannedShippingCop,
    paidCop,
    paymentRatio,
    shippingCollectedCop,
    shippingPendingCop: Math.max(plannedShippingCop - shippingCollectedCop, 0),
    receivedForMerchandiseCop,
    hasCompleteCosts,
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
