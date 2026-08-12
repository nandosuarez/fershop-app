import { products } from "@/lib/catalog";
import { computeLine, formatCop, getPaymentPolicyLabel, getSaleModeLabel } from "@/lib/commerce";
import type {
  DashboardOrder,
  DraftOrderPreview,
  OperationalActionOption,
  OperationalPaymentOption,
  OrderStatusCode,
  Product,
} from "@/lib/types";

export function getProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function buildDraftOrderPreview(input: {
  productId: string;
  quantity: number;
  customerName: string;
  actualInitialPaymentCop: number;
}): DraftOrderPreview | null {
  const product = getProductById(input.productId);
  if (!product) {
    return null;
  }

  const quantity = Math.max(1, Math.trunc(input.quantity || 1));
  const line = computeLine(product, quantity);
  const actualInitialPaymentCop = Math.max(Math.round(input.actualInitialPaymentCop || 0), 0);
  const customerName = input.customerName.trim() || "tu clienta";
  const expectedDueTodayCop = line.dueTodayCop;
  const expectedDueOnArrivalCop = line.dueOnArrivalCop;
  const remainingAfterTodayCop = Math.max(line.lineTotalCop - actualInitialPaymentCop, 0);
  const pendingDueTodayCop = Math.max(expectedDueTodayCop - actualInitialPaymentCop, 0);
  const pendingDueOnArrivalCop = Math.max(remainingAfterTodayCop - pendingDueTodayCop, 0);

  if (product.saleMode === "immediate") {
    if (actualInitialPaymentCop >= expectedDueTodayCop) {
      return {
        product,
        quantity,
        totalCop: line.lineTotalCop,
        expectedDueTodayCop,
        expectedDueOnArrivalCop,
        actualInitialPaymentCop,
        pendingDueTodayCop,
        pendingDueOnArrivalCop,
        statusLabel: "Pago completo confirmado",
        nextActionLabel: "Despachar o coordinar entrega",
        internalNote:
          "Caja ya confirmo el pago completo. El pedido puede pasar directamente a despacho.",
        customerMessage: `Hola ${customerName}, confirmamos el pago total de tu pedido ${product.name}. Ya podemos prepararlo para entrega.`,
        operationalChecklist: [
          "Registrar pedido con modo entrega inmediata.",
          "Conciliar pago completo en caja.",
          "Avisar a la clienta que el pedido ya fue confirmado.",
          "Pasar a despacho o coordinacion de entrega.",
        ],
      };
    }

    if (actualInitialPaymentCop > 0) {
      return {
        product,
        quantity,
        totalCop: line.lineTotalCop,
        expectedDueTodayCop,
        expectedDueOnArrivalCop,
        actualInitialPaymentCop,
        pendingDueTodayCop,
        pendingDueOnArrivalCop,
        statusLabel: "Pago parcial recibido",
        nextActionLabel: "Cobrar saldo antes de despachar",
        internalNote:
          "La referencia es inmediata, pero el pedido no debe salir hasta completar el 100% del pago.",
        customerMessage: `Hola ${customerName}, recibimos un abono de ${formatCop(actualInitialPaymentCop)} para tu pedido ${product.name}. Para despacharlo necesitamos completar ${formatCop(expectedDueTodayCop)} hoy.`,
        operationalChecklist: [
          "Registrar pedido inmediato.",
          "Conciliar el abono recibido.",
          "Solicitar el saldo faltante antes del despacho.",
          "Mantener el pedido en espera hasta pago completo.",
        ],
      };
    }

    return {
      product,
      quantity,
        totalCop: line.lineTotalCop,
        expectedDueTodayCop,
        expectedDueOnArrivalCop,
        actualInitialPaymentCop,
        pendingDueTodayCop,
        pendingDueOnArrivalCop,
        statusLabel: "Esperando pago completo",
        nextActionLabel: "Cobrar el 100% para confirmar el despacho",
        internalNote:
          "Al ser una referencia inmediata, este pedido no necesita compra en origen pero si requiere pago completo.",
      customerMessage: `Hola ${customerName}, ya registramos tu pedido ${product.name}. Para confirmar la entrega inmediata necesitamos recibir ${formatCop(expectedDueTodayCop)} hoy.`,
      operationalChecklist: [
        "Registrar pedido inmediato.",
        "Compartir el monto total a cobrar hoy.",
        "Esperar confirmacion de pago completo.",
        "Despachar apenas caja confirme.",
      ],
    };
  }

  if (actualInitialPaymentCop >= expectedDueTodayCop) {
    return {
      product,
      quantity,
      totalCop: line.lineTotalCop,
      expectedDueTodayCop,
      expectedDueOnArrivalCop,
      actualInitialPaymentCop,
      pendingDueTodayCop,
      pendingDueOnArrivalCop,
      statusLabel: "Anticipo confirmado",
      nextActionLabel: "Registrar compra en origen y avisar a la clienta",
      internalNote:
        "El anticipo ya esta confirmado. Operaciones puede comprar en origen y luego disparar la notificacion de compra realizada.",
      customerMessage: `Hola ${customerName}, confirmamos tu anticipo por ${formatCop(actualInitialPaymentCop)} para ${product.name}. El siguiente paso es comprar tu referencia en origen.`,
      operationalChecklist: [
        "Registrar pedido por encargo.",
        "Conciliar anticipo inicial.",
        "Comprar la referencia en origen.",
        "Notificar a la clienta que la compra ya fue realizada.",
      ],
    };
  }

  if (actualInitialPaymentCop > 0) {
    return {
      product,
      quantity,
      totalCop: line.lineTotalCop,
      expectedDueTodayCop,
      expectedDueOnArrivalCop,
      actualInitialPaymentCop,
      pendingDueTodayCop,
      pendingDueOnArrivalCop,
      statusLabel: "Anticipo parcial recibido",
      nextActionLabel: "Completar anticipo antes de comprar",
      internalNote:
        "La compra internacional no debe ejecutarse hasta completar el anticipo objetivo del 50%.",
      customerMessage: `Hola ${customerName}, ya registramos ${formatCop(actualInitialPaymentCop)} para tu pedido ${product.name}. Para comprarlo en origen necesitamos completar ${formatCop(expectedDueTodayCop)} hoy.`,
      operationalChecklist: [
        "Registrar pedido por encargo.",
        "Conciliar el abono recibido.",
        "Solicitar el faltante del anticipo.",
        "No comprar en origen hasta completar el 50%.",
      ],
    };
  }

  return {
    product,
    quantity,
    totalCop: line.lineTotalCop,
    expectedDueTodayCop,
    expectedDueOnArrivalCop,
    actualInitialPaymentCop,
    pendingDueTodayCop,
    pendingDueOnArrivalCop,
    statusLabel: "Esperando anticipo",
    nextActionLabel: "Cobrar el 50% inicial para poder comprar",
    internalNote:
      "El pedido ya existe, pero operacion solo debe pasar a origen cuando caja confirme el anticipo.",
    customerMessage: `Hola ${customerName}, ya registramos tu pedido ${product.name}. Para comprarlo necesitamos un anticipo de ${formatCop(expectedDueTodayCop)} hoy y el saldo de ${formatCop(expectedDueOnArrivalCop)} cuando llegue a Colombia.`,
    operationalChecklist: [
      "Registrar pedido por encargo.",
      "Enviar resumen de anticipo y saldo.",
      "Esperar confirmacion del 50% inicial.",
      "Comprar en origen apenas caja confirme.",
    ],
  };
}

export function deriveOrderStatusCode(order: Pick<
  DashboardOrder,
  | "saleMode"
  | "plannedDueTodayCop"
  | "plannedDueOnArrivalCop"
  | "dueTodayCop"
  | "dueOnArrivalCop"
  | "purchaseRecordedAtIso"
  | "arrivalRecordedAtIso"
  | "deliveredAtIso"
>): OrderStatusCode {
  if (order.deliveredAtIso) {
    return "delivered";
  }

  if (order.saleMode === "immediate") {
    if (order.dueTodayCop <= 0) {
      return "ready_to_dispatch";
    }
    return order.dueTodayCop < order.plannedDueTodayCop
      ? "initial_payment_partial"
      : "awaiting_initial_payment";
  }

  if (order.arrivalRecordedAtIso) {
    if (order.dueOnArrivalCop <= 0) {
      return "ready_to_dispatch";
    }
    return order.dueOnArrivalCop < order.plannedDueOnArrivalCop
      ? "balance_partial"
      : "awaiting_balance";
  }

  if (order.purchaseRecordedAtIso) {
    return "purchased_in_origin";
  }

  if (order.dueTodayCop <= 0) {
    return "ready_to_source";
  }

  return order.dueTodayCop < order.plannedDueTodayCop
    ? "initial_payment_partial"
    : "awaiting_initial_payment";
}

export function getOrderStatusPresentation(order: Pick<
  DashboardOrder,
  | "saleMode"
  | "plannedDueTodayCop"
  | "plannedDueOnArrivalCop"
  | "dueTodayCop"
  | "dueOnArrivalCop"
  | "purchaseWithoutAdvance"
  | "purchaseRecordedAtIso"
  | "arrivalRecordedAtIso"
  | "deliveredAtIso"
>): {
  statusCode: OrderStatusCode;
  statusLabel: string;
  currentStageTitle: string;
  nextActionLabel: string;
} {
  const statusCode = deriveOrderStatusCode(order);

  switch (statusCode) {
    case "awaiting_initial_payment":
      return order.saleMode === "immediate"
        ? {
            statusCode,
            statusLabel: "Esperando pago completo",
            currentStageTitle: "Pendiente de pago",
            nextActionLabel: `Cobrar ${formatCop(order.dueTodayCop)} para confirmar despacho`,
          }
        : {
            statusCode,
            statusLabel: "Esperando anticipo",
            currentStageTitle: "Pendiente de confirmacion",
            nextActionLabel: `Registrar anticipo (referencia 50%: ${formatCop(order.plannedDueTodayCop)})`,
          };
    case "initial_payment_partial":
      return order.saleMode === "immediate"
        ? {
            statusCode,
            statusLabel: "Pago parcial recibido",
            currentStageTitle: "Esperando saldo final",
            nextActionLabel: `Cobrar saldo de ${formatCop(order.dueTodayCop)} antes de despachar`,
          }
        : {
            statusCode,
            statusLabel: "Anticipo recibido",
            currentStageTitle: "Anticipo registrado",
            nextActionLabel: "Registrar compra en origen y avisar a la clienta",
          };
    case "ready_to_source":
      return {
        statusCode,
        statusLabel: order.purchaseWithoutAdvance
          ? "Compra autorizada sin anticipo"
          : "Anticipo confirmado",
        currentStageTitle: "Listo para compra en origen",
        nextActionLabel: "Registrar compra internacional y avisar a la clienta",
      };
    case "purchased_in_origin":
      return {
        statusCode,
        statusLabel: "En compra internacional",
        currentStageTitle: "Esperando llegada a Colombia",
        nextActionLabel: "Marcar llegada y abrir cobro del saldo",
      };
    case "awaiting_balance":
      return {
        statusCode,
        statusLabel: "Esperando segundo pago",
        currentStageTitle: "Mercancia en Colombia",
        nextActionLabel: `Cobrar saldo de ${formatCop(order.dueOnArrivalCop)}`,
      };
    case "balance_partial":
      return {
        statusCode,
        statusLabel: "Saldo parcial recibido",
        currentStageTitle: "Esperando completar segundo pago",
        nextActionLabel: `Cobrar faltante de ${formatCop(order.dueOnArrivalCop)}`,
      };
    case "ready_to_dispatch":
      return order.saleMode === "immediate"
        ? {
            statusCode,
            statusLabel: "Listo para despacho",
            currentStageTitle: "Pago completo confirmado",
            nextActionLabel: "Coordinar entrega y cerrar pedido",
          }
        : {
            statusCode,
            statusLabel: "Listo para entrega",
            currentStageTitle: "Saldo confirmado",
            nextActionLabel: "Coordinar entrega y cerrar pedido",
          };
    case "delivered":
      return {
        statusCode,
        statusLabel: "Entregado",
        currentStageTitle: "Caso cerrado",
        nextActionLabel: "Sin acciones pendientes",
      };
    default:
      return {
        statusCode,
        statusLabel: "Pendiente",
        currentStageTitle: "Revisar pedido",
        nextActionLabel: "Validar el caso manualmente",
      };
  }
}

export function getAvailableOperationalActions(order: DashboardOrder): OperationalActionOption[] {
  const statusCode = deriveOrderStatusCode(order);

  if (statusCode === "ready_to_source") {
    return [
      {
        type: "register_purchase",
        label: "Registrar compra en origen",
        description: "Confirma que la referencia ya fue comprada y avisa a la clienta.",
      },
    ];
  }

  if (statusCode === "purchased_in_origin") {
    return [
      {
        type: "mark_arrival",
        label: "Marcar llegada a Colombia",
        description: "Activa el saldo pendiente y deja lista la solicitud de segundo pago.",
      },
    ];
  }

  if (statusCode === "ready_to_dispatch") {
    return [
      {
        type: "mark_delivery",
        label: "Marcar entrega",
        description: "Cierra el pedido y deja listo el mensaje final para la clienta.",
      },
    ];
  }

  return [];
}

export function getAvailablePaymentOptions(order: DashboardOrder): OperationalPaymentOption[] {
  const statusCode = deriveOrderStatusCode(order);

  if (
    order.saleMode === "preorder" &&
    !order.arrivalRecordedAtIso &&
    order.dueTodayCop + order.dueOnArrivalCop > 0
  ) {
    return [
      {
        kind: "advance",
        label: order.dueTodayCop > 0 ? "Registrar anticipo" : "Registrar pago adicional",
        description: "El anticipo puede ser menor o mayor al 50%; el saldo se calcula con el pago real.",
        suggestedAmountCop: order.dueTodayCop + order.dueOnArrivalCop,
      },
    ];
  }

  if (statusCode === "awaiting_initial_payment" || statusCode === "initial_payment_partial") {
    return [
      {
        kind: "advance",
        label: order.saleMode === "immediate" ? "Registrar pago del pedido" : "Registrar anticipo",
        description:
          order.saleMode === "immediate"
            ? "Sirve para confirmar pago completo o registrar un abono antes del despacho."
            : "Sirve para completar el 50% inicial antes de comprar en origen.",
        suggestedAmountCop: order.dueTodayCop,
      },
    ];
  }

  if (statusCode === "awaiting_balance" || statusCode === "balance_partial") {
    return [
      {
        kind: "balance",
        label: "Registrar segundo pago",
        description: "Confirma el saldo final para dejar el pedido listo para entrega.",
        suggestedAmountCop: order.dueOnArrivalCop,
      },
    ];
  }

  return [];
}

export function getOutstandingTotal(order: Pick<DashboardOrder, "dueTodayCop" | "dueOnArrivalCop">): number {
  return order.dueTodayCop + order.dueOnArrivalCop;
}

export function getOperationalModelLabel(product: Product): string {
  return `${getSaleModeLabel(product.saleMode)} | ${getPaymentPolicyLabel(product.paymentPolicy)}`;
}
