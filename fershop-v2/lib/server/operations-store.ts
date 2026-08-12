import { randomUUID } from "node:crypto";

import { dashboardOrders, products as seedProducts } from "@/lib/catalog";
import {
  formatCop,
  summarizeCart,
} from "@/lib/commerce";
import { customers as seedCustomers } from "@/lib/customers";
import { deriveOrderStatusCode, getOrderStatusPresentation } from "@/lib/operations";
import { getCustomers } from "@/lib/server/customer-store";
import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import { adjustInventoryForOrder, InventoryStoreError } from "@/lib/server/inventory-store";
import { getProducts } from "@/lib/server/product-store";
import type {
  ApplyOperationalActionInput,
  AddOrderCommentInput,
  CreateOrderInput,
  DashboardOrder,
  NotificationLogEntry,
  OperationMutationResult,
  OperationsMetrics,
  OperationsSnapshot,
  OrderTimelineEvent,
  PaymentLogEntry,
  RegisterPaymentInput,
  UpdateOrderInput,
} from "@/lib/types";

interface OperationsStore {
  lastOrderSequence: number;
  updatedAtIso: string;
  orders: DashboardOrder[];
}

class OperationsStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "OperationsStoreError";
  }
}

const timeZone = "America/Bogota";
let mutationQueue = Promise.resolve();

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildSeedStore(): OperationsStore {
  return {
    lastOrderSequence: dashboardOrders
      .map((order) => Number(order.id.replace("FS-", "")))
      .filter((sequence) => Number.isFinite(sequence))
      .reduce((highest, current) => Math.max(highest, current), 2100),
    updatedAtIso: new Date().toISOString(),
    orders: cloneValue(dashboardOrders),
  };
}

function isValidStoreShape(value: unknown): value is OperationsStore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<OperationsStore>;
  return (
    typeof candidate.lastOrderSequence === "number" &&
    typeof candidate.updatedAtIso === "string" &&
    Array.isArray(candidate.orders)
  );
}

async function ensureStoreFile(): Promise<OperationsStore> {
  const parsed = await readAppDocument<unknown>("operations");
  if (parsed) {
    if (!isValidStoreShape(parsed)) {
      throw new OperationsStoreError("Los datos de operaciones no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const seed = buildSeedStore();
  await persistStore(seed);
  return seed;
}

async function persistStore(store: OperationsStore) {
  await writeAppDocument("operations", store);
}

async function withStoreMutation<T>(
  mutate: (store: OperationsStore) => Promise<T> | T
): Promise<T> {
  const run = mutationQueue.then(async () => {
    const store = await ensureStoreFile();
    const result = await mutate(store);
    await persistStore(store);
    return result;
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

function sortOrders(orders: DashboardOrder[]) {
  return [...orders].sort((left, right) => right.updatedAtIso.localeCompare(left.updatedAtIso));
}

function formatDateTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeZone,
  }).format(new Date(iso));
}

function updateOrderPresentation(order: DashboardOrder) {
  const presentation = getOrderStatusPresentation(order);
  order.statusCode = presentation.statusCode;
  order.statusLabel = presentation.statusLabel;
  order.currentStageTitle = presentation.currentStageTitle;
  order.nextActionLabel = presentation.nextActionLabel;
}

function normalizeOrderDetails(
  order: DashboardOrder,
  catalogProducts = seedProducts,
  catalogCustomers = seedCustomers
) {
  if (!order.items?.length) {
    const product = catalogProducts.find((candidate) => candidate.id === order.productId);
    order.items = [
      {
        productId: order.productId,
        productName: order.productName,
        imageUrl: product?.imageUrl,
        quantity: order.quantity,
        unitPriceCop: product?.priceCop ?? Math.round(order.totalCop / Math.max(order.quantity, 1)),
        unitCostCop: product?.costCop,
        unitShippingCostCop: product?.shippingCostCop,
        lineTotalCop: order.totalCop,
        saleMode: product?.saleMode ?? order.saleMode,
        paymentPolicy: product?.paymentPolicy ?? order.paymentPolicy,
      },
    ];
  }

  order.items.forEach((item) => {
    const product = catalogProducts.find((candidate) => candidate.id === item.productId);
    if (product) {
      item.imageUrl ??= product.imageUrl;
      item.unitCostCop ??= product.costCop;
      item.unitShippingCostCop ??= product.shippingCostCop;
    }
  });

  const customer = catalogCustomers.find(
    (candidate) =>
      candidate.id === order.customerId ||
      candidate.fullName.toLocaleLowerCase("es").trim() ===
        order.customerName.toLocaleLowerCase("es").trim()
  );

  if (customer) {
    order.customerId = customer.id;
    order.customerEmail ??= customer.email;
    order.customerAddress ??= customer.address;
  }

  if (order.saleMode === "preorder" && !order.arrivalRecordedAtIso) {
    const receivedCop = order.payments
      .filter((payment) => payment.statusCode === "received")
      .reduce((sum, payment) => sum + payment.amountCop, 0);

    if (receivedCop > 0) {
      order.dueTodayCop = 0;
      order.dueOnArrivalCop = Math.max(order.totalCop - receivedCop, 0);

      const legacyPartialEvent = order.timeline.find(
        (event) =>
          event.type === "payment" &&
          (event.title === "Pago parcial registrado" || event.title === "Anticipo parcial registrado")
      );
      if (legacyPartialEvent) {
        legacyPartialEvent.title = "Anticipo registrado";
        legacyPartialEvent.detail = `Anticipo recibido. El saldo total pendiente quedo en ${formatCop(order.dueOnArrivalCop)}.`;
      }
    }
  }
}

function summarizeOrders(orders: DashboardOrder[]): OperationsMetrics {
  const normalized = sortOrders(orders).map((order) => {
    const copy = cloneValue(order);
    updateOrderPresentation(copy);
    return copy;
  });

  return {
    activeOrders: normalized.filter((order) => order.statusCode !== "delivered").length,
    totalOrders: normalized.length,
    pendingTodayCop: normalized.reduce((sum, order) => sum + order.dueTodayCop, 0),
    pendingArrivalCop: normalized.reduce((sum, order) => sum + order.dueOnArrivalCop, 0),
    notificationsLogged: normalized.reduce((sum, order) => sum + order.notifications.length, 0),
    immediateOrders: normalized.filter((order) => order.saleMode === "immediate").length,
    preorderOrders: normalized.filter((order) => order.saleMode === "preorder").length,
    readyToSource: normalized.filter((order) => order.statusCode === "ready_to_source").length,
    readyToDispatch: normalized.filter((order) => order.statusCode === "ready_to_dispatch").length,
  };
}

function makeTimelineEvent(event: Omit<OrderTimelineEvent, "id">): OrderTimelineEvent {
  return {
    ...event,
    id: `timeline-${randomUUID()}`,
  };
}

function makePaymentEntry(entry: Omit<PaymentLogEntry, "id">): PaymentLogEntry {
  return {
    ...entry,
    id: `payment-${randomUUID()}`,
  };
}

function makeNotificationEntry(input: {
  triggerLabel: string;
  statusLabel: string;
  messagePreview: string;
  sentAtIso?: string;
}): NotificationLogEntry {
  return {
    id: `notification-${randomUUID()}`,
    triggerLabel: input.triggerLabel,
    channelLabel: "WhatsApp",
    statusCode: input.sentAtIso ? "sent" : "draft",
    statusLabel: input.statusLabel,
    sentAtIso: input.sentAtIso,
    sentAtLabel: input.sentAtIso ? formatDateTimeLabel(input.sentAtIso) : "Pendiente",
    messagePreview: input.messagePreview,
  };
}

function getOrderByIdOrThrow(store: OperationsStore, orderId: string): DashboardOrder {
  const order = store.orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    throw new OperationsStoreError(`No encontramos el pedido ${orderId}.`, 404);
  }
  normalizeOrderDetails(order);
  return order;
}

function buildPurchaseMessage(order: DashboardOrder) {
  return `Hola ${order.customerName}, ya compramos tu pedido ${order.productName} en origen. Te avisaremos apenas llegue a Colombia para continuar el proceso.`;
}

function buildArrivalMessage(order: DashboardOrder) {
  return order.dueOnArrivalCop > 0
    ? `Hola ${order.customerName}, tu pedido ${order.productName} ya llego a Colombia. Para continuar necesitamos registrar el saldo final de ${formatCop(order.dueOnArrivalCop)}.`
    : `Hola ${order.customerName}, tu pedido ${order.productName} ya llego a Colombia y esta listo para entrega.`;
}

function buildDeliveryMessage(order: DashboardOrder) {
  return `Hola ${order.customerName}, tu pedido ${order.productName} ya fue entregado. Gracias por comprar con FerShop.`;
}

function buildAdvancePaymentResult(order: DashboardOrder, amountCop: number): OperationMutationResult {
  const statusCode = deriveOrderStatusCode(order);

  if (order.saleMode === "immediate") {
    if (statusCode === "ready_to_dispatch") {
      return {
        order,
        internalNote: "Caja ya confirmo el pago completo. El pedido puede pasar a despacho o entrega.",
        customerMessage: `Hola ${order.customerName}, confirmamos el pago total de tu pedido ${order.productName}. Ya podemos prepararlo para entrega.`,
      };
    }

    return {
      order,
      internalNote: "La referencia es inmediata, pero no debe salir hasta completar el valor total del pedido.",
      customerMessage: `Hola ${order.customerName}, recibimos un abono de ${formatCop(amountCop)} para tu pedido ${order.productName}. Aun queda pendiente ${formatCop(order.dueTodayCop)} para poder despacharlo.`,
    };
  }

  if (statusCode === "ready_to_source") {
    if (order.dueOnArrivalCop <= 0) {
      return {
        order,
        internalNote: "El pedido quedo pagado por completo y ya puede pasar a compra en origen.",
        customerMessage: `Hola ${order.customerName}, confirmamos el pago total de tu pedido ${order.productName}. El siguiente paso es comprar tus referencias en origen.`,
      };
    }

    return {
      order,
      internalNote: "El anticipo ya esta completo. Operaciones puede registrar la compra en origen.",
      customerMessage: `Hola ${order.customerName}, confirmamos tu anticipo para ${order.productName}. El siguiente paso es comprar tu referencia en origen.`,
    };
  }

  if (statusCode === "purchased_in_origin") {
    return {
      order,
      internalNote:
        order.dueOnArrivalCop > 0
          ? "El abono adicional quedo registrado. El pedido sigue esperando llegada a Colombia."
          : "El pedido quedo pagado por completo y sigue esperando llegada a Colombia.",
      customerMessage:
        order.dueOnArrivalCop > 0
          ? `Hola ${order.customerName}, registramos tu pago de ${formatCop(amountCop)}. Queda un saldo de ${formatCop(order.dueOnArrivalCop)} para tu pedido ${order.productName}.`
          : `Hola ${order.customerName}, confirmamos el pago total de tu pedido ${order.productName}. Te avisaremos apenas llegue a Colombia.`,
    };
  }

  return {
    order,
    internalNote: "El anticipo quedo registrado y el saldo se actualizo con el valor realmente recibido.",
    customerMessage: `Hola ${order.customerName}, ya registramos ${formatCop(amountCop)} para tu pedido ${order.productName}. Queda un saldo total de ${formatCop(order.dueTodayCop + order.dueOnArrivalCop)}.`,
  };
}

function buildBalancePaymentResult(order: DashboardOrder, amountCop: number): OperationMutationResult {
  if (order.dueOnArrivalCop <= 0) {
    return {
      order,
      internalNote: "El saldo final ya quedo confirmado y el pedido puede pasar a entrega.",
      customerMessage: `Hola ${order.customerName}, confirmamos el segundo pago de ${formatCop(amountCop)} para tu pedido ${order.productName}. Ya quedo listo para entrega.`,
    };
  }

  return {
    order,
    internalNote: "Aun queda saldo por recaudar antes de coordinar la entrega final.",
    customerMessage: `Hola ${order.customerName}, recibimos un abono de ${formatCop(amountCop)} para el saldo de tu pedido ${order.productName}. Queda pendiente ${formatCop(order.dueOnArrivalCop)} para dejarlo listo para entrega.`,
  };
}

function refreshPendingPaymentEntries(order: DashboardOrder) {
  order.payments = order.payments.filter((payment) => payment.statusCode !== "pending");

  if (order.saleMode === "preorder" && !order.arrivalRecordedAtIso && order.dueOnArrivalCop > 0) {
    order.payments.push(
      makePaymentEntry({
        kind: "balance",
        statusCode: "pending",
        statusLabel: "Pendiente",
        amountCop: order.dueOnArrivalCop,
        recordedAtLabel: "Se cobrara al llegar a Colombia",
        note: "Saldo reservado para el momento de llegada al pais.",
      })
    );
  }
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const store = await ensureStoreFile();
  const [catalogProducts, catalogCustomers] = await Promise.all([
    getProducts(),
    getCustomers(),
  ]);
  const orders = sortOrders(store.orders).map((order) => {
    const copy = cloneValue(order);
    normalizeOrderDetails(copy, catalogProducts, catalogCustomers);
    updateOrderPresentation(copy);
    return copy;
  });

  return {
    orders,
    metrics: summarizeOrders(orders),
  };
}

export async function getOrder(orderId: string) {
  const store = await ensureStoreFile();
  const [catalogProducts, catalogCustomers] = await Promise.all([
    getProducts(),
    getCustomers(),
  ]);
  const order = cloneValue(getOrderByIdOrThrow(store, orderId));
  normalizeOrderDetails(order, catalogProducts, catalogCustomers);
  updateOrderPresentation(order);
  return order;
}

export async function createOrder(input: CreateOrderInput): Promise<OperationMutationResult> {
  const catalogProducts = await getProducts();
  return withStoreMutation(async (store) => {
    const nowIso = new Date().toISOString();
    const actualInitialPaymentCop = Math.max(Math.round(input.actualInitialPaymentCop || 0), 0);
    const customerName = input.customerName.trim();
    const customerPhone = input.customerPhone.trim() || "Por confirmar";
    const customerCity = input.customerCity.trim() || "Por confirmar";

    if (!customerName) {
      throw new OperationsStoreError("Necesitamos al menos el nombre del cliente para crear el pedido.");
    }

    const normalizedItems = input.items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.trunc(item.quantity || 1)),
    }));
    const summary = summarizeCart(normalizedItems, catalogProducts);

    if (!summary.lines.length) {
      throw new OperationsStoreError("Agrega al menos un producto para crear el pedido.");
    }
    if (actualInitialPaymentCop > summary.totalCop) {
      throw new OperationsStoreError("El pago recibido no puede superar el total del pedido.");
    }

    const firstLine = summary.lines[0];
    const totalQuantity = summary.lines.reduce((sum, line) => sum + line.quantity, 0);
    const containsPreorder = summary.preorderUnits > 0;
    const purchaseWithoutAdvance =
      Boolean(input.purchaseWithoutAdvance) && actualInitialPaymentCop === 0;
    const canSourceOrder =
      containsPreorder && (actualInitialPaymentCop > 0 || purchaseWithoutAdvance);
    const pendingDueTodayCop = canSourceOrder
      ? 0
      : Math.max(summary.dueTodayCop - actualInitialPaymentCop, 0);
    const paymentAppliedToArrivalCop = Math.max(
      actualInitialPaymentCop - summary.dueTodayCop,
      0
    );
    const pendingDueOnArrivalCop = canSourceOrder
      ? Math.max(summary.totalCop - actualInitialPaymentCop, 0)
      : Math.max(summary.dueOnArrivalCop - paymentAppliedToArrivalCop, 0);
    const inventoryItems = summary.lines
      .filter((line) => line.product.tracksInventory)
      .map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      }));
    const productName =
      summary.lines.length === 1
        ? firstLine.product.name
        : `${firstLine.product.name} y ${summary.lines.length - 1} mas`;
    const customerMessage = purchaseWithoutAdvance
      ? `Hola ${customerName}, registramos tu pedido ${productName} sin anticipo. Queda pendiente un total de ${formatCop(summary.totalCop)}.`
      : `Hola ${customerName}, registramos tu pedido ${productName}. Recibimos ${formatCop(actualInitialPaymentCop)} y queda un saldo total de ${formatCop(Math.max(summary.totalCop - actualInitialPaymentCop, 0))}.`;

    store.lastOrderSequence += 1;
    const order: DashboardOrder = {
      id: `FS-${store.lastOrderSequence}`,
      items: summary.lines.map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        imageUrl: line.product.imageUrl,
        quantity: line.quantity,
        unitPriceCop: line.product.priceCop,
        unitCostCop: line.product.costCop,
        unitShippingCostCop: line.product.shippingCostCop,
        lineTotalCop: line.lineTotalCop,
        saleMode: line.product.saleMode,
        paymentPolicy: line.product.paymentPolicy,
      })),
      customerId: input.customerId,
      productId: firstLine.product.id,
      quantity: totalQuantity,
      customerName,
      customerEmail: input.customerEmail?.trim() || undefined,
      customerPhone,
      customerAddress: input.customerAddress?.trim() || undefined,
      customerCity,
      sourceChannel: "whatsapp",
      productName,
      statusCode: "awaiting_initial_payment",
      statusLabel: "Pedido creado",
      saleMode: containsPreorder ? "preorder" : "immediate",
      paymentPolicy: containsPreorder ? "split_50_50" : "full_today",
      totalCop: summary.totalCop,
      plannedDueTodayCop: summary.dueTodayCop,
      plannedDueOnArrivalCop: summary.dueOnArrivalCop,
      dueTodayCop: pendingDueTodayCop,
      dueOnArrivalCop: pendingDueOnArrivalCop,
      purchaseWithoutAdvance,
      inventoryReserved: inventoryItems.length > 0,
      etaLabel: containsPreorder
        ? "Incluye productos con pago 50/50"
        : "Existencias reservadas en inventario",
      assignedTo: input.assignedTo?.trim() || "Equipo FerShop",
      currentStageTitle: "Pedido creado",
      nextActionLabel: "Revisar pago pendiente",
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      payments: [],
      notifications: [
        makeNotificationEntry({
          triggerLabel: "Pedido recibido",
          statusLabel: "Pendiente de enviar",
          messagePreview: customerMessage,
        }),
      ],
      timeline: [
        makeTimelineEvent({
          type: "order",
          title: "Pedido registrado",
          detail: `Pedido creado desde WhatsApp con ${summary.lines.length} producto(s) y ${totalQuantity} unidad(es).`,
          atLabel: formatDateTimeLabel(nowIso),
          completed: true,
        }),
      ],
    };

    if (actualInitialPaymentCop > 0) {
      order.payments.push(
        makePaymentEntry({
          kind: "advance",
          statusCode: "received",
          statusLabel:
            containsPreorder
              ? actualInitialPaymentCop >= summary.totalCop
                ? "Pago completo"
                : "Anticipo recibido"
              : actualInitialPaymentCop >= summary.dueTodayCop
                ? "Pago completo"
                : "Abono recibido",
          amountCop: actualInitialPaymentCop,
          recordedAtIso: nowIso,
          recordedAtLabel: formatDateTimeLabel(nowIso),
          note: "Pago registrado al momento de abrir el pedido.",
        })
      );

      order.timeline.push(
        makeTimelineEvent({
          type: "payment",
          title:
            containsPreorder
              ? actualInitialPaymentCop >= summary.totalCop
                ? "Pago completo confirmado"
                : "Anticipo registrado"
              : actualInitialPaymentCop >= summary.dueTodayCop
                ? "Pago completo confirmado"
                : "Pago parcial registrado",
          detail:
            containsPreorder
              ? `Se registraron ${formatCop(actualInitialPaymentCop)} y queda un saldo total de ${formatCop(summary.totalCop - actualInitialPaymentCop)}.`
              : actualInitialPaymentCop >= summary.dueTodayCop
                ? `Se registraron ${formatCop(actualInitialPaymentCop)} al crear el pedido.`
                : `Se registraron ${formatCop(actualInitialPaymentCop)} y queda pendiente ${formatCop(order.dueTodayCop)}.`,
          atLabel: formatDateTimeLabel(nowIso),
          completed: true,
        })
      );
    }

    if (purchaseWithoutAdvance) {
      order.timeline.push(
        makeTimelineEvent({
          type: "order",
          title: "Pedido creado sin anticipo",
          detail: `No se registro pago. El saldo completo de ${formatCop(summary.totalCop)} queda pendiente.`,
          atLabel: formatDateTimeLabel(nowIso),
          completed: true,
        })
      );
    }

    refreshPendingPaymentEntries(order);
    updateOrderPresentation(order);
    if (inventoryItems.length) {
      await adjustInventoryForOrder(order.id, inventoryItems);
    }

    store.orders.unshift(order);
    store.updatedAtIso = nowIso;

    return {
      order: cloneValue(order),
      internalNote: purchaseWithoutAdvance
        ? `Pedido creado sin anticipo. Saldo pendiente: ${formatCop(summary.totalCop)}.`
        : `Pedido guardado con saldo pendiente de ${formatCop(Math.max(summary.totalCop - actualInitialPaymentCop, 0))}.`,
      customerMessage,
    };
  });
}

export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput
): Promise<OperationMutationResult> {
  const catalogProducts = await getProducts();
  return withStoreMutation(async (store) => {
    const order = getOrderByIdOrThrow(store, orderId);
    const nowIso = new Date().toISOString();
    const customerName = input.customerName.trim();

    if (!customerName) {
      throw new OperationsStoreError("Selecciona un cliente para guardar el pedido.");
    }
    if (!input.items.length) {
      throw new OperationsStoreError("Agrega al menos un producto al pedido.");
    }

    const productIds = input.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new OperationsStoreError("Cada producto debe aparecer una sola vez en el pedido.");
    }

    const currentItems = order.items ?? [];
    const nextItems = input.items.map((inputItem) => {
      const product = catalogProducts.find((candidate) => candidate.id === inputItem.productId);
      if (!product) {
        throw new OperationsStoreError("Uno de los productos seleccionados ya no existe.", 404);
      }

      const quantity = Math.max(1, Math.trunc(inputItem.quantity || 1));
      const unitPriceCop = Math.round(Number(inputItem.unitPriceCop));
      if (!Number.isFinite(unitPriceCop) || unitPriceCop <= 0) {
        throw new OperationsStoreError(`Revisa el precio de ${product.name}.`);
      }

      const currentItem = currentItems.find((item) => item.productId === inputItem.productId);
      const keepsOriginalPrice = currentItem?.unitPriceCop === unitPriceCop;
      const tracksInventory = currentItem
        ? currentItem.saleMode === "immediate"
        : Boolean(product.tracksInventory);
      return {
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        quantity,
        unitPriceCop,
        unitCostCop: keepsOriginalPrice
          ? currentItem?.unitCostCop ?? product.costCop
          : product.costCop,
        unitShippingCostCop: keepsOriginalPrice
          ? currentItem?.unitShippingCostCop ?? product.shippingCostCop
          : product.shippingCostCop,
        lineTotalCop: unitPriceCop * quantity,
        saleMode: tracksInventory ? ("immediate" as const) : ("preorder" as const),
        paymentPolicy: tracksInventory
          ? ("full_today" as const)
          : ("split_50_50" as const),
      };
    });

    const totalCop = nextItems.reduce((sum, item) => sum + item.lineTotalCop, 0);
    const paidCop = order.payments
      .filter((payment) => payment.statusCode === "received")
      .reduce((sum, payment) => sum + payment.amountCop, 0);
    if (totalCop < paidCop) {
      throw new OperationsStoreError(
        `El nuevo total no puede ser menor a lo pagado (${formatCop(paidCop)}).`
      );
    }
    if (order.statusCode === "delivered" && totalCop !== paidCop) {
      throw new OperationsStoreError(
        "Un pedido entregado debe conservar un total igual al valor pagado."
      );
    }

    const containsPreorder = nextItems.some((item) => item.saleMode === "preorder");
    const purchaseWithoutAdvance =
      Boolean(input.purchaseWithoutAdvance ?? order.purchaseWithoutAdvance ?? false) && paidCop === 0;
    const plannedDueTodayCop = nextItems.reduce(
      (sum, item) =>
        sum +
        (item.paymentPolicy === "full_today"
          ? item.lineTotalCop
          : Math.round(item.lineTotalCop * 0.5)),
      0
    );
    const plannedDueOnArrivalCop = Math.max(totalCop - plannedDueTodayCop, 0);
    const inventoryItems = nextItems.filter((item) => item.saleMode === "immediate");
    const usesInventoryModel = order.inventoryReserved !== undefined;

    if (usesInventoryModel) {
      await adjustInventoryForOrder(order.id, inventoryItems);
    }

    order.items = nextItems;
    order.productId = nextItems[0].productId;
    order.productName =
      nextItems.length === 1
        ? nextItems[0].productName
        : `${nextItems[0].productName} y ${nextItems.length - 1} mas`;
    order.quantity = nextItems.reduce((sum, item) => sum + item.quantity, 0);
    order.customerId = input.customerId;
    order.customerName = customerName;
    order.customerEmail = input.customerEmail?.trim() || undefined;
    order.customerPhone = input.customerPhone.trim() || "Por confirmar";
    order.customerAddress = input.customerAddress?.trim() || undefined;
    order.customerCity = input.customerCity.trim() || "Por confirmar";
    order.saleMode = containsPreorder ? "preorder" : "immediate";
    order.paymentPolicy = containsPreorder ? "split_50_50" : "full_today";
    order.totalCop = totalCop;
    order.plannedDueTodayCop = plannedDueTodayCop;
    order.plannedDueOnArrivalCop = plannedDueOnArrivalCop;
    order.purchaseWithoutAdvance = purchaseWithoutAdvance;
    order.inventoryReserved = usesInventoryModel
      ? inventoryItems.length > 0
      : undefined;
    order.etaLabel = containsPreorder
      ? "Incluye productos con pago 50/50"
      : "Existencias reservadas en inventario";

    if (order.statusCode === "delivered") {
      order.dueTodayCop = 0;
      order.dueOnArrivalCop = 0;
    } else if (containsPreorder) {
      order.dueTodayCop = paidCop > 0 || purchaseWithoutAdvance ? 0 : plannedDueTodayCop;
      order.dueOnArrivalCop =
        paidCop > 0 || purchaseWithoutAdvance
          ? Math.max(totalCop - paidCop, 0)
          : plannedDueOnArrivalCop;
    } else {
      order.dueTodayCop = Math.max(totalCop - paidCop, 0);
      order.dueOnArrivalCop = 0;
    }

    order.updatedAtIso = nowIso;
    order.timeline.push(
      makeTimelineEvent({
        type: "order",
        title: "Pedido corregido",
        detail: `Se actualizaron cliente, productos o cantidades. Nuevo total: ${formatCop(totalCop)}.`,
        atLabel: formatDateTimeLabel(nowIso),
        completed: true,
      })
    );
    refreshPendingPaymentEntries(order);
    updateOrderPresentation(order);
    store.updatedAtIso = nowIso;

    return cloneValue({
      order,
      internalNote: `Pedido corregido. El saldo pendiente quedo en ${formatCop(order.dueTodayCop + order.dueOnArrivalCop)}.`,
      customerMessage: `Hola ${customerName}, actualizamos tu pedido ${order.productName}. El total quedo en ${formatCop(totalCop)}.`,
    });
  });
}

export async function registerPayment(
  orderId: string,
  input: RegisterPaymentInput
): Promise<OperationMutationResult> {
  return withStoreMutation((store) => {
    const order = getOrderByIdOrThrow(store, orderId);
    const nowIso = new Date().toISOString();
    const amountCop = Math.max(Math.round(input.amountCop || 0), 0);

    if (amountCop <= 0) {
      throw new OperationsStoreError("El monto del pago debe ser mayor a cero.");
    }

    updateOrderPresentation(order);

    if (input.kind === "advance") {
      const outstandingCop = order.dueTodayCop + order.dueOnArrivalCop;
      if (outstandingCop <= 0) {
        throw new OperationsStoreError("Este pedido ya no tiene saldo pendiente.");
      }
      if (amountCop > outstandingCop) {
        throw new OperationsStoreError(
          `El pago supera el saldo pendiente de ${formatCop(outstandingCop)}.`
        );
      }

      if (order.saleMode === "preorder" && !order.arrivalRecordedAtIso) {
        order.dueTodayCop = 0;
        order.dueOnArrivalCop = Math.max(outstandingCop - amountCop, 0);
      } else {
        const appliedToInitialCop = Math.min(amountCop, order.dueTodayCop);
        const appliedToFutureBalanceCop = amountCop - appliedToInitialCop;
        order.dueTodayCop -= appliedToInitialCop;
        order.dueOnArrivalCop = Math.max(order.dueOnArrivalCop - appliedToFutureBalanceCop, 0);
      }
      order.payments.push(
        makePaymentEntry({
          kind: "advance",
          statusCode: "received",
          statusLabel:
            order.dueTodayCop === 0
              ? order.dueOnArrivalCop === 0
                ? "Pago completo"
                : order.saleMode === "immediate"
                  ? "Pago completo"
                  : "Confirmado"
              : "Abono recibido",
          amountCop,
          recordedAtIso: nowIso,
          recordedAtLabel: formatDateTimeLabel(nowIso),
          note:
            input.note?.trim() ||
            (order.saleMode === "immediate"
              ? "Pago registrado para liberar el despacho."
              : "Anticipo registrado para continuar con la compra en origen."),
        })
      );

      order.timeline.push(
        makeTimelineEvent({
          type: "payment",
          title:
            order.dueTodayCop === 0
              ? order.dueOnArrivalCop === 0
                ? "Pago completo confirmado"
                : order.saleMode === "immediate"
                  ? "Pago completo confirmado"
                  : "Anticipo confirmado"
              : order.saleMode === "immediate"
                ? "Pago parcial registrado"
                : "Anticipo parcial registrado",
          detail:
            order.dueTodayCop === 0
              ? `Caja confirmo ${formatCop(amountCop)} y el pedido cambio de etapa.`
              : `Caja registro ${formatCop(amountCop)}. Aun falta ${formatCop(order.dueTodayCop)} para completar esta etapa.`,
          atLabel: formatDateTimeLabel(nowIso),
          completed: true,
        })
      );

      order.updatedAtIso = nowIso;
      updateOrderPresentation(order);
      refreshPendingPaymentEntries(order);

      const result = buildAdvancePaymentResult(order, amountCop);
      order.notifications.unshift(
        makeNotificationEntry({
          triggerLabel: order.saleMode === "immediate" ? "Pago registrado" : "Anticipo registrado",
          statusLabel: "Enviado",
          messagePreview: result.customerMessage,
          sentAtIso: nowIso,
        })
      );
      store.updatedAtIso = nowIso;
      return cloneValue(result);
    }

    if (!order.arrivalRecordedAtIso) {
      throw new OperationsStoreError("El segundo pago solo se registra cuando el pedido ya llego a Colombia.");
    }
    if (order.dueOnArrivalCop <= 0) {
      throw new OperationsStoreError("Este pedido ya no tiene saldo final pendiente.");
    }
    if (amountCop > order.dueOnArrivalCop) {
      throw new OperationsStoreError(
        `El pago supera el saldo pendiente de ${formatCop(order.dueOnArrivalCop)}.`
      );
    }

    order.dueOnArrivalCop -= amountCop;
    order.payments.push(
      makePaymentEntry({
        kind: "balance",
        statusCode: "received",
        statusLabel: order.dueOnArrivalCop === 0 ? "Confirmado" : "Abono recibido",
        amountCop,
        recordedAtIso: nowIso,
        recordedAtLabel: formatDateTimeLabel(nowIso),
        note:
          input.note?.trim() || "Saldo registrado para dejar el pedido listo para entrega.",
      })
    );

    order.timeline.push(
      makeTimelineEvent({
        type: "payment",
        title: order.dueOnArrivalCop === 0 ? "Segundo pago confirmado" : "Saldo parcial registrado",
        detail:
          order.dueOnArrivalCop === 0
            ? `Se recibio el saldo final de ${formatCop(amountCop)}.`
            : `Se recibio ${formatCop(amountCop)} y queda pendiente ${formatCop(order.dueOnArrivalCop)}.`,
        atLabel: formatDateTimeLabel(nowIso),
        completed: true,
      })
    );

    order.updatedAtIso = nowIso;
    updateOrderPresentation(order);
    refreshPendingPaymentEntries(order);

    const result = buildBalancePaymentResult(order, amountCop);
    order.notifications.unshift(
      makeNotificationEntry({
        triggerLabel: "Segundo pago registrado",
        statusLabel: "Enviado",
        messagePreview: result.customerMessage,
        sentAtIso: nowIso,
      })
    );
    store.updatedAtIso = nowIso;
    return cloneValue(result);
  });
}

export async function applyOperationalAction(
  orderId: string,
  input: ApplyOperationalActionInput
): Promise<OperationMutationResult> {
  return withStoreMutation((store) => {
    const order = getOrderByIdOrThrow(store, orderId);
    const nowIso = new Date().toISOString();

    updateOrderPresentation(order);

    switch (input.actionType) {
      case "register_purchase": {
        if (deriveOrderStatusCode(order) !== "ready_to_source") {
          throw new OperationsStoreError("Este pedido todavia no esta listo para compra en origen.");
        }

        order.purchaseRecordedAtIso = nowIso;
        order.updatedAtIso = nowIso;
        order.etaLabel = `Compra en origen confirmada el ${formatDateLabel(nowIso)}`;
        order.timeline.push(
          makeTimelineEvent({
            type: "purchase",
            title: "Compra en origen registrada",
            detail: input.note?.trim() || "Operacion ya compro la referencia y ahora espera llegada a Colombia.",
            atLabel: formatDateTimeLabel(nowIso),
            completed: true,
          })
        );
        updateOrderPresentation(order);

        const customerMessage = buildPurchaseMessage(order);
        order.notifications.unshift(
          makeNotificationEntry({
            triggerLabel: "Compra realizada",
            statusLabel: "Enviado",
            messagePreview: customerMessage,
            sentAtIso: nowIso,
          })
        );
        store.updatedAtIso = nowIso;
        return cloneValue({
          order,
          internalNote: "Operaciones ya compro la referencia en origen. El siguiente hito es la llegada a Colombia.",
          customerMessage,
        });
      }
      case "mark_arrival": {
        if (deriveOrderStatusCode(order) !== "purchased_in_origin") {
          throw new OperationsStoreError("Este pedido aun no tiene compra en origen registrada.");
        }

        order.arrivalRecordedAtIso = nowIso;
        order.updatedAtIso = nowIso;
        order.etaLabel = `Llego a Colombia el ${formatDateLabel(nowIso)}`;
        order.timeline.push(
          makeTimelineEvent({
            type: "arrival",
            title: "Llegada a Colombia registrada",
            detail:
              input.note?.trim() ||
              "La mercancia ya esta en Colombia y ahora corresponde gestionar el saldo final.",
            atLabel: formatDateTimeLabel(nowIso),
            completed: true,
          })
        );
        updateOrderPresentation(order);
        refreshPendingPaymentEntries(order);

        const customerMessage = buildArrivalMessage(order);
        order.notifications.unshift(
          makeNotificationEntry({
            triggerLabel: "Llegada a Colombia",
            statusLabel: "Enviado",
            messagePreview: customerMessage,
            sentAtIso: nowIso,
          })
        );
        store.updatedAtIso = nowIso;
        return cloneValue({
          order,
          internalNote:
            order.dueOnArrivalCop > 0
              ? "La mercancia ya llego. Caja debe registrar el saldo antes de pasar a entrega."
              : "La mercancia llego y el pedido puede pasar a entrega.",
          customerMessage,
        });
      }
      case "mark_delivery": {
        if (deriveOrderStatusCode(order) !== "ready_to_dispatch") {
          throw new OperationsStoreError("El pedido todavia no esta listo para cierre y entrega.");
        }

        order.deliveredAtIso = nowIso;
        order.updatedAtIso = nowIso;
        order.etaLabel = `Entregado el ${formatDateLabel(nowIso)}`;
        order.timeline.push(
          makeTimelineEvent({
            type: "delivery",
            title: "Entrega final registrada",
            detail: input.note?.trim() || "El pedido fue entregado y el caso quedo cerrado.",
            atLabel: formatDateTimeLabel(nowIso),
            completed: true,
          })
        );
        updateOrderPresentation(order);

        const customerMessage = buildDeliveryMessage(order);
        order.notifications.unshift(
          makeNotificationEntry({
            triggerLabel: "Entrega realizada",
            statusLabel: "Enviado",
            messagePreview: customerMessage,
            sentAtIso: nowIso,
          })
        );
        store.updatedAtIso = nowIso;
        return cloneValue({
          order,
          internalNote: "El pedido queda cerrado. Si FerShop quiere, desde aqui ya solo sigue postventa.",
          customerMessage,
        });
      }
      default:
        throw new OperationsStoreError("La accion solicitada no existe.");
    }
  });
}

export async function addOrderComment(orderId: string, input: AddOrderCommentInput) {
  return withStoreMutation((store) => {
    const order = getOrderByIdOrThrow(store, orderId);
    const comment = input.comment.trim();
    const author = input.author?.trim() || "Jose FerShop";

    if (!comment) {
      throw new OperationsStoreError("Escribe un comentario antes de publicarlo.");
    }
    if (comment.length > 1000) {
      throw new OperationsStoreError("El comentario no puede superar 1000 caracteres.");
    }

    const nowIso = new Date().toISOString();
    order.timeline.push(
      makeTimelineEvent({
        type: "comment",
        title: author,
        detail: comment,
        atLabel: formatDateTimeLabel(nowIso),
        completed: true,
      })
    );
    order.updatedAtIso = nowIso;
    store.updatedAtIso = nowIso;

    return { order: cloneValue(order) };
  });
}

export async function markOrderNotified(orderId: string) {
  return withStoreMutation((store) => {
    const order = getOrderByIdOrThrow(store, orderId);
    const notification = order.notifications.find((entry) => entry.statusCode === "draft");

    if (!notification) {
      return { order: cloneValue(order) };
    }

    const nowIso = new Date().toISOString();
    notification.statusCode = "sent";
    notification.statusLabel = "Enviado";
    notification.sentAtIso = nowIso;
    notification.sentAtLabel = formatDateTimeLabel(nowIso);
    order.timeline.push(
      makeTimelineEvent({
        type: "notification",
        title: "Cliente notificado",
        detail: `${notification.triggerLabel} por ${notification.channelLabel}.`,
        atLabel: formatDateTimeLabel(nowIso),
        completed: true,
      })
    );
    order.updatedAtIso = nowIso;
    store.updatedAtIso = nowIso;

    return { order: cloneValue(order) };
  });
}

export function getOperationsErrorMessage(error: unknown) {
  if (error instanceof OperationsStoreError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof InventoryStoreError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "No pudimos completar la operacion. Revisa el backend y vuelve a intentarlo.",
  };
}
