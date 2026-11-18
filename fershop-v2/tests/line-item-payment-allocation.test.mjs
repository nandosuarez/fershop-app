import assert from "node:assert/strict";
import test from "node:test";

import { allocatePaymentByLineTotals } from "../lib/line-item-payment-allocation.ts";

test("distribuye el abono proporcionalmente entre los productos", () => {
  const allocations = allocatePaymentByLineTotals([300_000, 20_000], 200_000);

  assert.deepEqual(allocations, [
    { totalCop: 300_000, paidCop: 187_500, pendingCop: 112_500 },
    { totalCop: 20_000, paidCop: 12_500, pendingCop: 7_500 },
  ]);
});

test("conserva exactamente el total abonado cuando hay redondeos", () => {
  const allocations = allocatePaymentByLineTotals([100, 100, 100], 100);

  assert.equal(allocations.reduce((total, item) => total + item.paidCop, 0), 100);
  assert.equal(allocations.reduce((total, item) => total + item.pendingCop, 0), 200);
});

test("limita el abono al valor total de los productos", () => {
  const allocations = allocatePaymentByLineTotals([150_000, 250_000], 500_000);

  assert.deepEqual(allocations, [
    { totalCop: 150_000, paidCop: 150_000, pendingCop: 0 },
    { totalCop: 250_000, paidCop: 250_000, pendingCop: 0 },
  ]);
});
