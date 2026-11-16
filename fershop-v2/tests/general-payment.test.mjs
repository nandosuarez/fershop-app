import assert from "node:assert/strict";
import test from "node:test";

import { allocateGeneralPayment } from "../lib/general-payment.ts";

test("distribuye el abono desde el pedido mas antiguo", () => {
  const allocations = allocateGeneralPayment(
    [
      { orderId: "FS-2112", createdAtIso: "2026-08-03T12:00:00.000Z", outstandingCop: 280_000 },
      { orderId: "FS-2104", createdAtIso: "2026-08-01T12:00:00.000Z", outstandingCop: 120_000 },
      { orderId: "FS-2107", createdAtIso: "2026-08-02T12:00:00.000Z", outstandingCop: 95_000 },
    ],
    180_000
  );

  assert.deepEqual(
    allocations.map(({ orderId, appliedCop, remainingOutstandingCop }) => ({
      orderId,
      appliedCop,
      remainingOutstandingCop,
    })),
    [
      { orderId: "FS-2104", appliedCop: 120_000, remainingOutstandingCop: 0 },
      { orderId: "FS-2107", appliedCop: 60_000, remainingOutstandingCop: 35_000 },
    ]
  );
});

test("usa el numero de pedido para desempatar pedidos de la misma fecha", () => {
  const allocations = allocateGeneralPayment(
    [
      { orderId: "FS-2110", createdAtIso: "2026-08-01T12:00:00.000Z", outstandingCop: 50_000 },
      { orderId: "FS-2109", createdAtIso: "2026-08-01T12:00:00.000Z", outstandingCop: 50_000 },
    ],
    70_000
  );

  assert.deepEqual(
    allocations.map(({ orderId, appliedCop }) => ({ orderId, appliedCop })),
    [
      { orderId: "FS-2109", appliedCop: 50_000 },
      { orderId: "FS-2110", appliedCop: 20_000 },
    ]
  );
});

test("ignora pedidos sin saldo y no asigna mas dinero del disponible", () => {
  const allocations = allocateGeneralPayment(
    [
      { orderId: "FS-2101", createdAtIso: "2026-07-01T12:00:00.000Z", outstandingCop: 0 },
      { orderId: "FS-2102", createdAtIso: "2026-07-02T12:00:00.000Z", outstandingCop: 80_000 },
    ],
    200_000
  );

  assert.deepEqual(allocations, [
    {
      orderId: "FS-2102",
      createdAtIso: "2026-07-02T12:00:00.000Z",
      previousOutstandingCop: 80_000,
      appliedCop: 80_000,
      remainingOutstandingCop: 0,
    },
  ]);
});
