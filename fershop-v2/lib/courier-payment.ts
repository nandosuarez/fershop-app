import type { CourierPaymentCurrency } from "@/lib/types";

export interface CourierPayableItem {
  invoiceId: string;
  invoiceDate: string;
  invoiceCreatedAtIso: string;
  itemId: string;
  itemType: "guide" | "charge";
  itemOrder: number;
  pendingUsd: number;
}

export interface CourierPaymentAllocationResult extends CourierPayableItem {
  amountUsd: number;
}

export interface CourierPaymentAmounts {
  amountUsd: number;
  amountCop: number;
  exchangeRateCop: number;
}

export function roundUsd(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertCourierPayment(
  currency: CourierPaymentCurrency,
  amount: number,
  exchangeRateCop: number
): CourierPaymentAmounts {
  const normalizedAmount = Number(amount);
  const normalizedRate = Number(exchangeRateCop);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("El valor del abono debe ser mayor a cero.");
  }
  if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
    throw new Error("La tasa debe ser mayor a cero.");
  }

  const amountUsd = roundUsd(
    currency === "USD" ? normalizedAmount : normalizedAmount / normalizedRate
  );
  const amountCop = Math.round(
    currency === "COP" ? normalizedAmount : normalizedAmount * normalizedRate
  );
  if (amountUsd <= 0 || amountCop <= 0) {
    throw new Error("El abono es demasiado pequeno para distribuirlo.");
  }

  return {
    amountUsd,
    amountCop,
    exchangeRateCop: Math.round((amountCop / amountUsd + Number.EPSILON) * 100) / 100,
  };
}

export function allocateCourierPayment(
  items: CourierPayableItem[],
  requestedUsd: number
): CourierPaymentAllocationResult[] {
  const amountUsd = roundUsd(requestedUsd);
  const sortedItems = [...items]
    .filter((item) => roundUsd(item.pendingUsd) > 0)
    .sort(
      (left, right) =>
        left.invoiceDate.localeCompare(right.invoiceDate) ||
        left.invoiceCreatedAtIso.localeCompare(right.invoiceCreatedAtIso) ||
        left.itemOrder - right.itemOrder ||
        left.itemId.localeCompare(right.itemId)
    );
  const totalPendingUsd = roundUsd(
    sortedItems.reduce((total, item) => total + roundUsd(item.pendingUsd), 0)
  );
  if (amountUsd <= 0) {
    throw new Error("El valor del abono debe ser mayor a cero.");
  }
  if (amountUsd > totalPendingUsd + 0.001) {
    throw new Error("El abono supera el saldo total pendiente.");
  }

  let remainingUsd = amountUsd;
  const allocations: CourierPaymentAllocationResult[] = [];
  for (const item of sortedItems) {
    if (remainingUsd <= 0) break;
    const appliedUsd = roundUsd(Math.min(item.pendingUsd, remainingUsd));
    if (appliedUsd <= 0) continue;
    allocations.push({ ...item, amountUsd: appliedUsd });
    remainingUsd = roundUsd(remainingUsd - appliedUsd);
  }
  if (remainingUsd > 0.001) {
    throw new Error("No pudimos distribuir todo el abono.");
  }
  return allocations;
}
