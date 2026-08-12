import { randomUUID } from "node:crypto";

import { customers as seedCustomers } from "@/lib/customers";
import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "@/lib/types";

interface CustomerStore {
  updatedAtIso: string;
  customers: Customer[];
}

let mutationQueue = Promise.resolve();

export class CustomerStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "CustomerStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildSeedStore(): CustomerStore {
  return {
    updatedAtIso: new Date().toISOString(),
    customers: cloneValue(seedCustomers),
  };
}

function isValidStore(value: unknown): value is CustomerStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CustomerStore>;
  return typeof candidate.updatedAtIso === "string" && Array.isArray(candidate.customers);
}

async function persistStore(store: CustomerStore) {
  await writeAppDocument("customers", store);
}

async function ensureStore(): Promise<CustomerStore> {
  const parsed = await readAppDocument<unknown>("customers");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new CustomerStoreError("Los datos de clientes no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store = buildSeedStore();
  await persistStore(store);
  return store;
}

function normalizeInput(input: CreateCustomerInput | UpdateCustomerInput) {
  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLocaleLowerCase("es"),
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    department: input.department.trim(),
    postalCode: input.postalCode?.trim() || undefined,
    country: input.country.trim() || "Colombia",
  };
}

function validateCustomer(
  customer: ReturnType<typeof normalizeInput>,
  customers: Customer[],
  currentCustomerId?: string
) {
  if (customer.fullName.length < 2) {
    throw new CustomerStoreError("Escribe el nombre del cliente.");
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new CustomerStoreError("Escribe un correo valido.");
  }
  if (customer.phone.length < 7) {
    throw new CustomerStoreError("Escribe el telefono del cliente.");
  }
  if (!customer.address) {
    throw new CustomerStoreError("Escribe la direccion del cliente.");
  }
  if (!customer.city) {
    throw new CustomerStoreError("Escribe la ciudad del cliente.");
  }
  if (!customer.department) {
    throw new CustomerStoreError("Escribe el departamento del cliente.");
  }

  const duplicate = customers.find(
    (candidate) =>
      candidate.id !== currentCustomerId &&
      ((customer.email && candidate.email.toLocaleLowerCase("es") === customer.email) ||
        candidate.phone.replace(/\D/g, "") === customer.phone.replace(/\D/g, ""))
  );
  if (duplicate) {
    throw new CustomerStoreError("Ya existe un cliente con ese correo o telefono.", 409);
  }
}

export async function getCustomers(): Promise<Customer[]> {
  const store = await ensureStore();
  return cloneValue(store.customers);
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const normalized = normalizeInput(input);
    validateCustomer(normalized, store.customers);

    const customer: Customer = {
      id: `customer-${randomUUID()}`,
      ...normalized,
    };
    store.customers.unshift(customer);
    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return cloneValue(customer);
  });
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput
): Promise<Customer> {
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const customer = store.customers.find((candidate) => candidate.id === customerId);
    if (!customer) {
      throw new CustomerStoreError("No encontramos el cliente seleccionado.", 404);
    }
    const normalized = normalizeInput(input);
    validateCustomer(normalized, store.customers, customerId);
    Object.assign(customer, normalized);
    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return cloneValue(customer);
  });
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getCustomerStoreError(error: unknown) {
  if (error instanceof CustomerStoreError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof SyntaxError) {
    return { message: "Los datos del cliente no son validos.", status: 400 };
  }
  console.error(error);
  return { message: "No pudimos guardar los datos del cliente.", status: 500 };
}
