export interface GeneralPaymentCandidate {
  orderId: string;
  createdAtIso: string;
  outstandingCop: number;
}

export interface GeneralPaymentAllocation {
  orderId: string;
  createdAtIso: string;
  previousOutstandingCop: number;
  appliedCop: number;
  remainingOutstandingCop: number;
}

export function allocateGeneralPayment(
  candidates: GeneralPaymentCandidate[],
  amountCop: number
): GeneralPaymentAllocation[] {
  let remainingCop = Math.max(Math.round(amountCop || 0), 0);

  return candidates
    .filter((candidate) => candidate.outstandingCop > 0)
    .sort((left, right) => {
      const dateComparison = left.createdAtIso.localeCompare(right.createdAtIso);
      return dateComparison || left.orderId.localeCompare(right.orderId, undefined, { numeric: true });
    })
    .flatMap((candidate) => {
      if (remainingCop <= 0) {
        return [];
      }

      const previousOutstandingCop = Math.max(Math.round(candidate.outstandingCop), 0);
      const appliedCop = Math.min(remainingCop, previousOutstandingCop);
      remainingCop -= appliedCop;

      return [{
        orderId: candidate.orderId,
        createdAtIso: candidate.createdAtIso,
        previousOutstandingCop,
        appliedCop,
        remainingOutstandingCop: previousOutstandingCop - appliedCop,
      }];
    });
}
