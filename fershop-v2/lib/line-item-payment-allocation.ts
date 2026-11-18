export interface LineItemPaymentAllocation {
  totalCop: number;
  paidCop: number;
  pendingCop: number;
}

function asNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(Math.round(value), 0) : 0;
}

export function allocatePaymentByLineTotals(
  lineTotalsCop: number[],
  paymentCop: number
): LineItemPaymentAllocation[] {
  const totals = lineTotalsCop.map(asNonNegativeInteger);
  let remainingTotalCop = totals.reduce((total, value) => total + value, 0);
  let remainingPaymentCop = Math.min(asNonNegativeInteger(paymentCop), remainingTotalCop);

  return totals.map((totalCop) => {
    const paidCop = remainingTotalCop > 0
      ? Math.min(
          totalCop,
          remainingPaymentCop,
          Math.round((remainingPaymentCop * totalCop) / remainingTotalCop)
        )
      : 0;

    remainingTotalCop -= totalCop;
    remainingPaymentCop -= paidCop;

    return {
      totalCop,
      paidCop,
      pendingCop: totalCop - paidCop,
    };
  });
}
