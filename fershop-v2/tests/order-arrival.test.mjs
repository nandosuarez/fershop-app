import assert from "node:assert/strict";
import test from "node:test";

import {
  getItemArrivedQuantity,
  getOrderArrivalProgress,
} from "../lib/order-arrival.ts";

function makeItem(quantity, arrivedQuantity) {
  return {
    productId: "product",
    productName: "Producto",
    quantity,
    arrivedQuantity,
    unitPriceCop: 100_000,
    lineTotalCop: quantity * 100_000,
    saleMode: "preorder",
    paymentPolicy: "split_50_50",
  };
}

test("reconoce una llegada parcial por producto", () => {
  const progress = getOrderArrivalProgress({
    items: [makeItem(1, 1), makeItem(1, 0), makeItem(1, 0)],
  });

  assert.deepEqual(progress, {
    totalUnits: 3,
    arrivedUnits: 1,
    remainingUnits: 2,
    hasPartialArrival: true,
    allArrived: false,
  });
});

test("permite recibir parcialmente varias unidades del mismo producto", () => {
  const progress = getOrderArrivalProgress({ items: [makeItem(3, 2)] });

  assert.equal(progress.arrivedUnits, 2);
  assert.equal(progress.remainingUnits, 1);
  assert.equal(progress.hasPartialArrival, true);
});

test("mantiene compatibles los pedidos antiguos marcados como llegados", () => {
  const item = makeItem(2, undefined);

  assert.equal(getItemArrivedQuantity(item, "2026-11-18T12:00:00.000Z"), 2);
  assert.equal(
    getOrderArrivalProgress({
      items: [item, makeItem(1, undefined)],
      arrivalRecordedAtIso: "2026-11-18T12:00:00.000Z",
    }).allArrived,
    true
  );
});
