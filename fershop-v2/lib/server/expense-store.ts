import { randomUUID } from "node:crypto";

import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import { getOperationsSnapshot } from "@/lib/server/operations-store";
import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  ExpensePaymentSource,
  ExpenseSnapshot,
  ShippingFundContribution,
} from "@/lib/types";

interface ExpenseStore {
  updatedAtIso: string;
  expenses: Expense[];
}

const categoryLabels: Record<ExpenseCategory, string> = {
  box_shipping: "Envio de cajas",
  packaging: "Empaque",
  local_transport: "Transporte local",
  marketing: "Publicidad",
  operations: "Operacion",
  other: "Otro",
};

const paymentSourceLabels: Record<ExpensePaymentSource, string> = {
  shipping_fund: "Fondo de envios",
  general: "Caja general",
};

let mutationQueue = Promise.resolve();

export class ExpenseStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ExpenseStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildEmptyStore(): ExpenseStore {
  return {
    updatedAtIso: new Date().toISOString(),
    expenses: [],
  };
}

function isValidStore(value: unknown): value is ExpenseStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ExpenseStore>;
  return typeof candidate.updatedAtIso === "string" && Array.isArray(candidate.expenses);
}

async function persistStore(store: ExpenseStore) {
  await writeAppDocument("expenses", store);
}

async function ensureStore(): Promise<ExpenseStore> {
  const parsed = await readAppDocument<unknown>("expenses");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new ExpenseStoreError("Los datos de gastos no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store = buildEmptyStore();
  await persistStore(store);
  return store;
}

async function withMutation<T>(mutate: (store: ExpenseStore) => Promise<T> | T): Promise<T> {
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

function isExpenseCategory(value: string): value is ExpenseCategory {
  return Object.hasOwn(categoryLabels, value);
}

function isPaymentSource(value: string): value is ExpensePaymentSource {
  return Object.hasOwn(paymentSourceLabels, value);
}

function normalizeDate(value: string) {
  const expenseDate = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
    throw new ExpenseStoreError("Selecciona una fecha valida para el gasto.");
  }
  const parsedDate = new Date(`${expenseDate}T12:00:00-05:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ExpenseStoreError("Selecciona una fecha valida para el gasto.");
  }
  return expenseDate;
}

function normalizeExpense(input: CreateExpenseInput) {
  const description = input.description.trim();
  const amountCop = Math.round(Number(input.amountCop));
  const paymentSource: ExpensePaymentSource =
    input.category === "box_shipping" ? "shipping_fund" : "general";
  if (description.length < 3) {
    throw new ExpenseStoreError("Escribe el concepto del gasto.");
  }
  if (!isExpenseCategory(input.category)) {
    throw new ExpenseStoreError("Selecciona una categoria valida.");
  }
  if (!isPaymentSource(input.paymentSource)) {
    throw new ExpenseStoreError("Selecciona desde donde se pago el gasto.");
  }
  if (!Number.isFinite(amountCop) || amountCop <= 0) {
    throw new ExpenseStoreError("El valor del gasto debe ser mayor que cero.");
  }

  return {
    description,
    category: input.category,
    amountCop,
    paymentSource,
    expenseDate: normalizeDate(input.expenseDate),
    note: input.note?.trim() || undefined,
  };
}

async function getShippingContributions(): Promise<ShippingFundContribution[]> {
  const operations = await getOperationsSnapshot();
  const contributions = operations.orders.flatMap((order) =>
    (order.items ?? []).flatMap((item, itemIndex) => {
      const quantity = Math.max(Math.round(item.quantity), 0);
      const unitShippingCostCop = Math.max(Math.round(item.unitShippingCostCop ?? 0), 0);
      if (!quantity || !unitShippingCostCop) {
        return [];
      }
      return [
        {
          id: `${order.id}-${item.productId}-${itemIndex}`,
          orderId: order.id,
          orderCreatedAtIso: order.createdAtIso,
          customerName: order.customerName,
          productId: item.productId,
          productName: item.productName,
          quantity,
          unitShippingCostCop,
          amountCop: quantity * unitShippingCostCop,
        },
      ];
    })
  );

  return contributions.sort((left, right) =>
    right.orderCreatedAtIso.localeCompare(left.orderCreatedAtIso)
  );
}

export async function getExpenseSnapshot(): Promise<ExpenseSnapshot> {
  const [store, shippingContributions] = await Promise.all([
    ensureStore(),
    getShippingContributions(),
  ]);
  const expenses = [...store.expenses].sort((left, right) =>
    right.expenseDate.localeCompare(left.expenseDate) ||
    right.createdAtIso.localeCompare(left.createdAtIso)
  );
  const shippingFundAccruedCop = shippingContributions.reduce(
    (sum, contribution) => sum + contribution.amountCop,
    0
  );
  const shippingFundSpentCop = expenses
    .filter((expense) => expense.paymentSource === "shipping_fund")
    .reduce((sum, expense) => sum + expense.amountCop, 0);
  const generalExpensesCop = expenses
    .filter((expense) => expense.paymentSource === "general")
    .reduce((sum, expense) => sum + expense.amountCop, 0);

  return cloneValue({
    expenses,
    shippingContributions,
    metrics: {
      shippingFundAccruedCop,
      shippingFundSpentCop,
      shippingFundBalanceCop: shippingFundAccruedCop - shippingFundSpentCop,
      generalExpensesCop,
      totalExpensesCop: shippingFundSpentCop + generalExpensesCop,
    },
  });
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return withMutation((store) => {
    const normalized = normalizeExpense(input);
    const expense: Expense = {
      id: `expense-${randomUUID()}`,
      ...normalized,
      categoryLabel: categoryLabels[normalized.category],
      paymentSourceLabel: paymentSourceLabels[normalized.paymentSource],
      createdAtIso: new Date().toISOString(),
    };
    store.expenses.unshift(expense);
    return cloneValue(expense);
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await withMutation((store) => {
    const expenseIndex = store.expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex === -1) {
      throw new ExpenseStoreError("No encontramos el gasto seleccionado.", 404);
    }
    store.expenses.splice(expenseIndex, 1);
  });
}

export function getExpenseStoreError(error: unknown) {
  if (error instanceof ExpenseStoreError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof SyntaxError) {
    return { message: "Los datos del gasto no son validos.", status: 400 };
  }
  console.error(error);
  return { message: "No pudimos guardar los datos del gasto.", status: 500 };
}
