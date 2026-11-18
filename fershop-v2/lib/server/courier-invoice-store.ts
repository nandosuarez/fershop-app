import { randomUUID } from "node:crypto";

import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import type {
  CourierCharge,
  CourierGuide,
  CourierInvoice,
  CourierInvoiceSnapshot,
  CreateCourierInvoiceInput,
  MarkCourierGuidesReceivedInput,
  RegisterCourierPaymentInput,
} from "@/lib/types";

interface CourierInvoiceStore {
  updatedAtIso: string;
  invoices: CourierInvoice[];
}

let mutationQueue = Promise.resolve();

export class CourierInvoiceStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "CourierInvoiceStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeDate(value: string, label: string) {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new CourierInvoiceStoreError(`Selecciona una fecha valida para ${label}.`);
  }
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new CourierInvoiceStoreError(`Selecciona una fecha valida para ${label}.`);
  }
  return date;
}

function normalizeMoney(value: number, label: string, allowZero = false) {
  const amount = roundMoney(Number(value));
  if (!Number.isFinite(amount) || (allowZero ? amount < 0 : amount <= 0)) {
    throw new CourierInvoiceStoreError(`${label} debe ser mayor que ${allowZero ? "o igual a " : ""}cero.`);
  }
  return amount;
}

function buildEmptyStore(): CourierInvoiceStore {
  return { updatedAtIso: new Date().toISOString(), invoices: [] };
}

function isValidStore(value: unknown): value is CourierInvoiceStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CourierInvoiceStore>;
  return typeof candidate.updatedAtIso === "string" && Array.isArray(candidate.invoices);
}

async function persistStore(store: CourierInvoiceStore) {
  await writeAppDocument("courier-invoices", store);
}

async function ensureStore() {
  const parsed = await readAppDocument<unknown>("courier-invoices");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new CourierInvoiceStoreError("Los datos de cajas y courier no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store = buildEmptyStore();
  await persistStore(store);
  return store;
}

async function withMutation<T>(mutate: (store: CourierInvoiceStore) => Promise<T> | T) {
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const result = await mutate(store);
    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return result;
  });
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getGuidePaidUsd(invoice: CourierInvoice, guideId: string) {
  return roundMoney(
    invoice.payments.reduce(
      (sum, payment) =>
        sum +
        payment.allocations
          .filter((allocation) => allocation.guideId === guideId)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amountUsd, 0),
      0
    )
  );
}

export function getChargePaidUsd(invoice: CourierInvoice, chargeId: string) {
  return roundMoney(
    invoice.payments.reduce(
      (sum, payment) =>
        sum +
        payment.allocations
          .filter((allocation) => allocation.chargeId === chargeId)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amountUsd, 0),
      0
    )
  );
}

export function getInvoiceTotalUsd(invoice: CourierInvoice) {
  return roundMoney(
    invoice.guides.reduce((sum, guide) => sum + guide.amountUsd, 0) +
      invoice.charges.reduce((sum, charge) => sum + charge.amountUsd, 0)
  );
}

export function getInvoicePaidUsd(invoice: CourierInvoice) {
  return roundMoney(invoice.payments.reduce((sum, payment) => sum + payment.amountUsd, 0));
}

function buildSnapshot(store: CourierInvoiceStore): CourierInvoiceSnapshot {
  const invoices = [...store.invoices].sort(
    (left, right) =>
      right.invoiceDate.localeCompare(left.invoiceDate) ||
      right.createdAtIso.localeCompare(left.createdAtIso)
  );
  const totalUsd = roundMoney(invoices.reduce((sum, invoice) => sum + getInvoiceTotalUsd(invoice), 0));
  const paidUsd = roundMoney(invoices.reduce((sum, invoice) => sum + getInvoicePaidUsd(invoice), 0));
  const guides = invoices.flatMap((invoice) => invoice.guides);
  return {
    invoices,
    metrics: {
      totalInvoices: invoices.length,
      totalGuides: guides.length,
      totalWeightLb: roundMoney(guides.reduce((sum, guide) => sum + guide.weightLb, 0)),
      receivedGuides: guides.filter((guide) => Boolean(guide.receivedAtIso)).length,
      pendingReceiptGuides: guides.filter((guide) => !guide.receivedAtIso).length,
      totalUsd,
      paidUsd,
      pendingPaymentUsd: roundMoney(totalUsd - paidUsd),
      paidCop: Math.round(
        invoices.reduce(
          (sum, invoice) => sum + invoice.payments.reduce((paymentSum, payment) => paymentSum + payment.amountCop, 0),
          0
        )
      ),
    },
  };
}

function normalizeGuide(input: CreateCourierInvoiceInput["guides"][number]): CourierGuide {
  const guideNumber = input.guideNumber.toUpperCase().replace(/\s+/g, "").trim();
  if (!/^VIL[A-Z0-9-]{6,}$/.test(guideNumber)) {
    throw new CourierInvoiceStoreError(`Revisa el numero de guia ${input.guideNumber || "sin identificar"}.`);
  }
  return {
    id: `courier-guide-${randomUUID()}`,
    guideNumber,
    weightLb: normalizeMoney(input.weightLb, `El peso de ${guideNumber}`),
    rateUsd: normalizeMoney(input.rateUsd, `La tarifa de ${guideNumber}`),
    amountUsd: normalizeMoney(input.amountUsd, `El valor de ${guideNumber}`),
  };
}

function normalizeCharge(input: CreateCourierInvoiceInput["charges"][number]): CourierCharge {
  const description = input.description.trim().toUpperCase();
  if (description.length < 2) {
    throw new CourierInvoiceStoreError("Escribe la descripcion del cargo adicional.");
  }
  return {
    id: `courier-charge-${randomUUID()}`,
    description,
    amountUsd: normalizeMoney(input.amountUsd, `El valor de ${description}`),
  };
}

function getInvoiceOrThrow(store: CourierInvoiceStore, invoiceId: string) {
  const invoice = store.invoices.find((candidate) => candidate.id === invoiceId);
  if (!invoice) {
    throw new CourierInvoiceStoreError("No encontramos la factura seleccionada.", 404);
  }
  return invoice;
}

export async function getCourierInvoiceSnapshot() {
  return cloneValue(buildSnapshot(await ensureStore()));
}

export async function createCourierInvoice(input: CreateCourierInvoiceInput) {
  return withMutation((store) => {
    const courierName = input.courierName.trim().toUpperCase();
    const invoiceNumber = input.invoiceNumber.trim().toUpperCase();
    if (courierName.length < 3) {
      throw new CourierInvoiceStoreError("Escribe el nombre del courier.");
    }
    if (invoiceNumber.length < 2) {
      throw new CourierInvoiceStoreError("Escribe el numero de factura.");
    }
    if (!input.guides.length) {
      throw new CourierInvoiceStoreError("La factura debe contener al menos una guia.");
    }
    if (
      store.invoices.some(
        (invoice) =>
          invoice.courierName.toUpperCase() === courierName &&
          invoice.invoiceNumber.toUpperCase() === invoiceNumber
      )
    ) {
      throw new CourierInvoiceStoreError(`La factura ${invoiceNumber} ya fue registrada.`, 409);
    }

    const guides = input.guides.map(normalizeGuide);
    const guideNumbers = new Set<string>();
    for (const guide of guides) {
      if (guideNumbers.has(guide.guideNumber)) {
        throw new CourierInvoiceStoreError(`La guia ${guide.guideNumber} esta repetida en la factura.`);
      }
      guideNumbers.add(guide.guideNumber);
      const existingInvoice = store.invoices.find((invoice) =>
        invoice.guides.some((candidate) => candidate.guideNumber === guide.guideNumber)
      );
      if (existingInvoice) {
        throw new CourierInvoiceStoreError(
          `La guia ${guide.guideNumber} ya existe en la factura ${existingInvoice.invoiceNumber}.`,
          409
        );
      }
    }
    const charges = input.charges.map(normalizeCharge);
    const calculatedTotalUsd = roundMoney(
      guides.reduce((sum, guide) => sum + guide.amountUsd, 0) +
        charges.reduce((sum, charge) => sum + charge.amountUsd, 0)
    );
    const declaredTotalUsd = normalizeMoney(input.declaredTotalUsd, "El total de la factura");
    if (Math.abs(calculatedTotalUsd - declaredTotalUsd) > 0.02) {
      throw new CourierInvoiceStoreError(
        `El total de la factura debe coincidir con las guias y cargos (USD ${calculatedTotalUsd.toFixed(2)}).`
      );
    }
    if (!input.sourceFile.id || !input.sourceFile.url) {
      throw new CourierInvoiceStoreError("No pudimos asociar el PDF original.");
    }

    const now = new Date().toISOString();
    const invoice: CourierInvoice = {
      id: `courier-invoice-${randomUUID()}`,
      courierName,
      invoiceNumber,
      invoiceDate: normalizeDate(input.invoiceDate, "la factura"),
      billedTo: input.billedTo?.trim() || undefined,
      currency: "USD",
      guides,
      charges,
      declaredTotalUsd,
      sourceFile: input.sourceFile,
      payments: [],
      createdAtIso: now,
      updatedAtIso: now,
    };
    store.invoices.unshift(invoice);
    return cloneValue(invoice);
  });
}

export async function markCourierGuidesReceived(
  invoiceId: string,
  input: MarkCourierGuidesReceivedInput
) {
  return withMutation((store) => {
    const invoice = getInvoiceOrThrow(store, invoiceId);
    const guideIds = [...new Set(input.guideIds)];
    if (!guideIds.length) {
      throw new CourierInvoiceStoreError("Selecciona al menos una guia.");
    }
    const receivedDate = normalizeDate(input.receivedDate, "la recepcion");
    const receivedAtIso = new Date(`${receivedDate}T12:00:00-05:00`).toISOString();
    for (const guideId of guideIds) {
      const guide = invoice.guides.find((candidate) => candidate.id === guideId);
      if (!guide) {
        throw new CourierInvoiceStoreError("Una de las guias seleccionadas no pertenece a la factura.");
      }
      guide.receivedAtIso = receivedAtIso;
      guide.receiptNote = input.note?.trim() || undefined;
    }
    invoice.updatedAtIso = new Date().toISOString();
    return cloneValue(invoice);
  });
}

export async function registerCourierPayment(
  invoiceId: string,
  input: RegisterCourierPaymentInput
) {
  return withMutation((store) => {
    const invoice = getInvoiceOrThrow(store, invoiceId);
    const guideIds = [...new Set(input.guideIds)];
    const chargeIds = [...new Set(input.chargeIds)];
    if (!guideIds.length && !chargeIds.length) {
      throw new CourierInvoiceStoreError("Selecciona al menos una guia o cargo por pagar.");
    }
    const allocations = [];
    for (const guideId of guideIds) {
      const guide = invoice.guides.find((candidate) => candidate.id === guideId);
      if (!guide) {
        throw new CourierInvoiceStoreError("Una de las guias seleccionadas no pertenece a la factura.");
      }
      const pendingUsd = roundMoney(guide.amountUsd - getGuidePaidUsd(invoice, guideId));
      if (pendingUsd <= 0) {
        throw new CourierInvoiceStoreError(`La guia ${guide.guideNumber} ya esta pagada.`);
      }
      allocations.push({ guideId, amountUsd: pendingUsd });
    }
    for (const chargeId of chargeIds) {
      const charge = invoice.charges.find((candidate) => candidate.id === chargeId);
      if (!charge) {
        throw new CourierInvoiceStoreError("Uno de los cargos seleccionados no pertenece a la factura.");
      }
      const pendingUsd = roundMoney(charge.amountUsd - getChargePaidUsd(invoice, chargeId));
      if (pendingUsd <= 0) {
        throw new CourierInvoiceStoreError(`El cargo ${charge.description} ya esta pagado.`);
      }
      allocations.push({ chargeId, amountUsd: pendingUsd });
    }
    const amountUsd = roundMoney(allocations.reduce((sum, allocation) => sum + allocation.amountUsd, 0));
    const amountCop = Math.round(normalizeMoney(input.amountCop, "El valor pagado en COP"));
    const method = input.method.trim();
    if (method.length < 2) {
      throw new CourierInvoiceStoreError("Escribe el metodo de pago.");
    }
    const payment = {
      id: `courier-payment-${randomUUID()}`,
      amountUsd,
      amountCop,
      exchangeRateCop: roundMoney(amountCop / amountUsd),
      paymentDate: normalizeDate(input.paymentDate, "el pago"),
      method,
      reference: input.reference?.trim() || undefined,
      allocations,
      createdAtIso: new Date().toISOString(),
    };
    invoice.payments.push(payment);
    invoice.updatedAtIso = new Date().toISOString();
    return cloneValue(invoice);
  });
}

export function getCourierInvoiceStoreError(error: unknown) {
  if (error instanceof CourierInvoiceStoreError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof SyntaxError) {
    return { message: "Los datos de la factura no son validos.", status: 400 };
  }
  console.error(error);
  return { message: "No pudimos guardar los datos del courier.", status: 500 };
}
