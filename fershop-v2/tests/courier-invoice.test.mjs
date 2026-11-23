import assert from "node:assert/strict";

import {
  allocateCourierPayment,
  convertCourierPayment,
} from "../lib/courier-payment.ts";
import { parseCourierInvoiceTextItems } from "../lib/courier-invoice-parser.ts";

function item(text, x, y) {
  return { text, x, y, page: 1 };
}

const preview = parseCourierInvoiceTextItems([
  item("DNR USA CARGO", 93, 743),
  item("Date", 474, 715),
  item("11/10/2026", 463, 697),
  item("Invoice #", 540, 715),
  item("13167", 546, 697),
  item("Bill To", 66, 650),
  item("LORAINE CHIMAS", 57, 634),
  item("GUIA#VIL3050028739", 93, 449),
  item("24", 77, 449),
  item("2.80", 477, 449),
  item("67.20", 564, 449),
  item("GUIA#VIL3050028743", 93, 438),
  item("15", 77, 438),
  item("2.80", 477, 438),
  item("42.00", 564, 438),
  item("INSURANCE", 93, 427),
  item("5.00", 477, 427),
  item("5.00", 569, 427),
  item("Total", 426, 130),
  item("$114.20", 559, 132),
]);

assert.equal(preview.courierName, "DNR USA CARGO");
assert.equal(preview.invoiceNumber, "13167");
assert.equal(preview.invoiceDate, "2026-11-10");
assert.equal(preview.billedTo, "LORAINE CHIMAS");
assert.deepEqual(preview.guides, [
  { guideNumber: "VIL3050028739", weightLb: 24, rateUsd: 2.8, amountUsd: 67.2 },
  { guideNumber: "VIL3050028743", weightLb: 15, rateUsd: 2.8, amountUsd: 42 },
]);
assert.deepEqual(preview.charges, [{ description: "INSURANCE", amountUsd: 5 }]);
assert.equal(preview.calculatedTotalUsd, 114.2);
assert.equal(preview.declaredTotalUsd, 114.2);
assert.deepEqual(preview.warnings, []);

assert.deepEqual(convertCourierPayment("USD", 25, 4100), {
  amountUsd: 25,
  amountCop: 102500,
  exchangeRateCop: 4100,
});
assert.deepEqual(convertCourierPayment("COP", 102500, 4100), {
  amountUsd: 25,
  amountCop: 102500,
  exchangeRateCop: 4100,
});

const allocations = allocateCourierPayment(
  [
    {
      invoiceId: "newer",
      invoiceDate: "2026-11-20",
      invoiceCreatedAtIso: "2026-11-20T12:00:00.000Z",
      itemId: "guide-3",
      itemType: "guide",
      itemOrder: 0,
      pendingUsd: 40,
    },
    {
      invoiceId: "older",
      invoiceDate: "2026-11-10",
      invoiceCreatedAtIso: "2026-11-10T12:00:00.000Z",
      itemId: "guide-1",
      itemType: "guide",
      itemOrder: 0,
      pendingUsd: 30,
    },
    {
      invoiceId: "older",
      invoiceDate: "2026-11-10",
      invoiceCreatedAtIso: "2026-11-10T12:00:00.000Z",
      itemId: "guide-2",
      itemType: "guide",
      itemOrder: 1,
      pendingUsd: 50,
    },
  ],
  65
);
assert.deepEqual(
  allocations.map(({ invoiceId, itemId, amountUsd }) => ({ invoiceId, itemId, amountUsd })),
  [
    { invoiceId: "older", itemId: "guide-1", amountUsd: 30 },
    { invoiceId: "older", itemId: "guide-2", amountUsd: 35 },
  ]
);

console.log("Courier invoice and payment tests passed.");
