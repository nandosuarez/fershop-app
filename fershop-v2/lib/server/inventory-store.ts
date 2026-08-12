import { randomUUID } from "node:crypto";

import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import { getProducts } from "@/lib/server/product-store";
import type {
  CreatePurchaseOrderInput,
  InventoryMovement,
  InventorySnapshot,
  PurchaseOrder,
} from "@/lib/types";

interface InventoryStore {
  lastPurchaseOrderSequence: number;
  updatedAtIso: string;
  purchaseOrders: PurchaseOrder[];
  movements: InventoryMovement[];
}

interface InventoryReservationItem {
  productId: string;
  quantity: number;
}

let mutationQueue = Promise.resolve();

export class InventoryStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "InventoryStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildEmptyStore(): InventoryStore {
  return {
    lastPurchaseOrderSequence: 1000,
    updatedAtIso: new Date().toISOString(),
    purchaseOrders: [],
    movements: [],
  };
}

function isValidStore(value: unknown): value is InventoryStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<InventoryStore>;
  return (
    typeof candidate.lastPurchaseOrderSequence === "number" &&
    typeof candidate.updatedAtIso === "string" &&
    Array.isArray(candidate.purchaseOrders) &&
    Array.isArray(candidate.movements)
  );
}

async function persistStore(store: InventoryStore) {
  await writeAppDocument("inventory", store);
}

async function ensureStore(): Promise<InventoryStore> {
  const parsed = await readAppDocument<unknown>("inventory");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new InventoryStoreError("Los datos de inventario no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store = buildEmptyStore();
  await persistStore(store);
  return store;
}

async function withMutation<T>(mutate: (store: InventoryStore) => Promise<T> | T): Promise<T> {
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

function getBalanceMap(movements: InventoryMovement[]) {
  const balances = new Map<string, number>();
  movements.forEach((movement) => {
    balances.set(movement.productId, (balances.get(movement.productId) ?? 0) + movement.quantity);
  });
  return balances;
}

function makeMovement(input: Omit<InventoryMovement, "id" | "createdAtIso">): InventoryMovement {
  return {
    id: `movement-${randomUUID()}`,
    createdAtIso: new Date().toISOString(),
    ...input,
  };
}

export async function getInventorySnapshot(): Promise<InventorySnapshot> {
  const [store, products] = await Promise.all([ensureStore(), getProducts()]);
  const balances = getBalanceMap(store.movements);
  const sortedMovements = [...store.movements].sort((left, right) =>
    right.createdAtIso.localeCompare(left.createdAtIso)
  );
  const items = products.filter((product) => product.tracksInventory).map((product) => {
    const productMovements = sortedMovements.filter(
      (movement) => movement.productId === product.id
    );
    return {
      product,
      availableQuantity: balances.get(product.id) ?? 0,
      totalEntries: productMovements
        .filter((movement) => movement.quantity > 0)
        .reduce((sum, movement) => sum + movement.quantity, 0),
      totalExits: productMovements
        .filter((movement) => movement.quantity < 0)
        .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0),
      lastMovement: productMovements[0],
    };
  });

  return cloneValue({
    items,
    movements: sortedMovements.slice(0, 100),
    totalAvailableUnits: items.reduce((sum, item) => sum + item.availableQuantity, 0),
    totalInventoryValueCop: items.reduce(
      (sum, item) =>
        sum +
        item.availableQuantity *
          ((item.product.costCop ?? 0) + (item.product.shippingCostCop ?? 0)),
      0
    ),
  });
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const store = await ensureStore();
  return cloneValue(
    [...store.purchaseOrders].sort((left, right) =>
      right.createdAtIso.localeCompare(left.createdAtIso)
    )
  );
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<PurchaseOrder> {
  const products = await getProducts();
  return withMutation((store) => {
    const supplier = input.supplier.trim();
    if (!supplier) {
      throw new InventoryStoreError("Escribe el proveedor de la orden de compra.");
    }
    if (!input.items.length) {
      throw new InventoryStoreError("Agrega al menos un producto a la orden de compra.");
    }
    const productIds = input.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new InventoryStoreError("Cada producto debe aparecer una sola vez.");
    }

    const items = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        throw new InventoryStoreError("Uno de los productos ya no existe.", 404);
      }
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 0));
      const unitCostCop = Math.round(Number(item.unitCostCop));
      const unitShippingCostCop = Math.round(Number(item.unitShippingCostCop));
      if (!Number.isFinite(unitCostCop) || unitCostCop < 0) {
        throw new InventoryStoreError(`Revisa el costo de ${product.name}.`);
      }
      if (!Number.isFinite(unitShippingCostCop) || unitShippingCostCop < 0) {
        throw new InventoryStoreError(`Revisa el envio de ${product.name}.`);
      }
      return {
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        quantity,
        unitCostCop,
        unitShippingCostCop,
        lineTotalCop: (unitCostCop + unitShippingCostCop) * quantity,
      };
    });

    store.lastPurchaseOrderSequence += 1;
    const receivedAtIso = new Date().toISOString();
    const purchaseOrder: PurchaseOrder = {
      id: `OC-${store.lastPurchaseOrderSequence}`,
      supplier,
      statusCode: "received",
      statusLabel: "Recibida",
      items,
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
      totalCostCop: items.reduce((sum, item) => sum + item.lineTotalCop, 0),
      createdAtIso: receivedAtIso,
      receivedAtIso,
    };
    items.forEach((item) => {
      store.movements.push(
        makeMovement({
          productId: item.productId,
          quantity: item.quantity,
          type: "purchase_receipt",
          referenceId: purchaseOrder.id,
          referenceLabel: `Entrada por ${purchaseOrder.id}`,
        })
      );
    });
    store.purchaseOrders.unshift(purchaseOrder);
    return cloneValue(purchaseOrder);
  });
}

export async function receivePurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrder> {
  return withMutation((store) => {
    const purchaseOrder = store.purchaseOrders.find(
      (candidate) => candidate.id === purchaseOrderId
    );
    if (!purchaseOrder) {
      throw new InventoryStoreError("No encontramos la orden de compra.", 404);
    }
    if (purchaseOrder.statusCode === "received") {
      throw new InventoryStoreError("Esta orden de compra ya fue recibida.", 409);
    }
    const receivedAtIso = new Date().toISOString();
    purchaseOrder.items.forEach((item) => {
      store.movements.push(
        makeMovement({
          productId: item.productId,
          quantity: item.quantity,
          type: "purchase_receipt",
          referenceId: purchaseOrder.id,
          referenceLabel: `Entrada por ${purchaseOrder.id}`,
        })
      );
    });
    purchaseOrder.statusCode = "received";
    purchaseOrder.statusLabel = "Recibida";
    purchaseOrder.receivedAtIso = receivedAtIso;
    return cloneValue(purchaseOrder);
  });
}

export async function adjustInventoryForOrder(
  orderId: string,
  items: InventoryReservationItem[]
) {
  return withMutation((store) => {
    const nextQuantities = new Map(
      items.map((item) => [item.productId, Math.max(1, Math.trunc(item.quantity || 1))])
    );
    const currentQuantities = new Map<string, number>();
    store.movements
      .filter(
        (movement) =>
          movement.referenceId === orderId &&
          (movement.type === "customer_order" || movement.type === "order_adjustment")
      )
      .forEach((movement) => {
        currentQuantities.set(
          movement.productId,
          (currentQuantities.get(movement.productId) ?? 0) - movement.quantity
        );
      });

    const balances = getBalanceMap(store.movements);
    const productIds = new Set([...currentQuantities.keys(), ...nextQuantities.keys()]);
    const changes = [...productIds].map((productId) => {
      const currentQuantity = currentQuantities.get(productId) ?? 0;
      const nextQuantity = nextQuantities.get(productId) ?? 0;
      return { productId, currentQuantity, nextQuantity, delta: nextQuantity - currentQuantity };
    });

    changes.forEach((change) => {
      if (change.delta > 0 && (balances.get(change.productId) ?? 0) < change.delta) {
        throw new InventoryStoreError("No hay existencias suficientes para guardar el pedido.", 409);
      }
    });

    changes.forEach((change) => {
      if (change.delta === 0) {
        return;
      }
      store.movements.push(
        makeMovement({
          productId: change.productId,
          quantity: -change.delta,
          type: change.currentQuantity === 0 && change.delta > 0
            ? "customer_order"
            : "order_adjustment",
          referenceId: orderId,
          referenceLabel:
            change.delta > 0
              ? `Salida por pedido ${orderId}`
              : `Devolucion por ajuste ${orderId}`,
        })
      );
    });
  });
}

export function getInventoryStoreError(error: unknown) {
  if (error instanceof InventoryStoreError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof SyntaxError) {
    return { message: "Los datos de inventario no son validos.", status: 400 };
  }
  console.error(error);
  return { message: "No pudimos actualizar el inventario.", status: 500 };
}
