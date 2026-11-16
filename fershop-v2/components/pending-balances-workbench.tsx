"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { FormattedNumberInput } from "@/components/formatted-number-input";
import { ListSearch } from "@/components/list-search";
import { formatCop, getOrderOutstandingCop, getOrderPaidCop } from "@/lib/commerce";
import { allocateGeneralPayment } from "@/lib/general-payment";
import { matchesSearch, normalizeSearchText } from "@/lib/search";
import type { DashboardOrder, OrderItem } from "@/lib/types";

interface PendingBalancesWorkbenchProps {
  orders: DashboardOrder[];
}

type ArrivalFilter = "all" | "arrived";

interface OrdersApiPayload {
  orders?: DashboardOrder[];
}

interface GeneralPaymentApiPayload {
  message?: string;
  orders?: DashboardOrder[];
  remainingCustomerBalanceCop?: number;
}

interface PendingCustomer {
  key: string;
  name: string;
  email?: string;
  phone: string;
  city: string;
  orders: DashboardOrder[];
  totalCop: number;
  paidCop: number;
  pendingCop: number;
  totalUnits: number;
}

interface PrintableOrder {
  order: DashboardOrder;
  items: OrderItem[];
  totalCop: number;
  paidCop: number;
  pendingCop: number;
  isPartial: boolean;
}

interface PrintableCustomer extends Omit<PendingCustomer, "orders"> {
  orders: PrintableOrder[];
  hasPartialOrders: boolean;
}

interface MessageCopyStatus {
  customerKey: string;
  key: string;
  message: string;
  isError: boolean;
}

const numberFormatter = new Intl.NumberFormat("es-CO");
const printLogoUrl = "/brand/fershop-logo-print.png";

function waitForNextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function waitForImageDecode(image: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, 3_000);
    image.decode().then(
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      },
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      }
    );
  });
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Use the browser fallback when clipboard permissions are unavailable.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}

async function fetchLatestOrders() {
  try {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OrdersApiPayload;
    return Array.isArray(payload.orders) ? payload.orders : null;
  } catch {
    return null;
  }
}

function filterOrdersByArrival(orders: DashboardOrder[], filter: ArrivalFilter) {
  return filter === "arrived"
    ? orders.filter((order) => Boolean(order.arrivalRecordedAtIso))
    : orders;
}

function getCustomerKey(order: DashboardOrder) {
  const phone = order.customerPhone.replace(/\D/g, "");
  if (phone) {
    return `phone:${phone}`;
  }

  const email = normalizeSearchText(order.customerEmail);
  if (email) {
    return `email:${email}`;
  }

  if (order.customerId) {
    return `id:${order.customerId}`;
  }

  return `name:${normalizeSearchText(order.customerName)}:${normalizeSearchText(order.customerCity)}`;
}

function getOrderItems(order: DashboardOrder): OrderItem[] {
  if (order.items?.length) {
    return order.items;
  }

  const quantity = Math.max(order.quantity, 1);
  return [
    {
      productId: order.productId,
      productName: order.productName,
      quantity,
      unitPriceCop: Math.round(order.totalCop / quantity),
      lineTotalCop: order.totalCop,
      saleMode: order.saleMode,
      paymentPolicy: order.paymentPolicy,
    },
  ];
}

function getItemSelectionKey(orderId: string, index: number) {
  return `${orderId}:${index}`;
}

function getCustomerItemKeys(customer: PendingCustomer) {
  return customer.orders.flatMap((order) =>
    getOrderItems(order).map((_, index) => getItemSelectionKey(order.id, index))
  );
}

function getSelectedKeys(customer: PendingCustomer, selectedKeys?: string[]) {
  return new Set(selectedKeys ?? getCustomerItemKeys(customer));
}

function buildPrintableCustomer(
  customer: PendingCustomer,
  selectedKeys?: string[]
): PrintableCustomer | null {
  const selection = getSelectedKeys(customer, selectedKeys);
  const orders = customer.orders.flatMap<PrintableOrder>((order) => {
    const allItems = getOrderItems(order);
    const items = allItems.filter((_, index) =>
      selection.has(getItemSelectionKey(order.id, index))
    );

    if (!items.length) {
      return [];
    }

    const isPartial = items.length !== allItems.length;
    const totalCop = isPartial
      ? items.reduce((total, item) => total + item.lineTotalCop, 0)
      : order.totalCop;
    const orderPaidCop = getOrderPaidCop(order);
    const paidCop = isPartial && order.totalCop > 0
      ? Math.min(totalCop, Math.round((orderPaidCop * totalCop) / order.totalCop))
      : Math.min(totalCop, orderPaidCop);

    return [{
      order,
      items,
      totalCop,
      paidCop,
      pendingCop: Math.max(totalCop - paidCop, 0),
      isPartial,
    }];
  });

  if (!orders.length) {
    return null;
  }

  return {
    ...customer,
    orders,
    totalCop: orders.reduce((total, order) => total + order.totalCop, 0),
    paidCop: orders.reduce((total, order) => total + order.paidCop, 0),
    pendingCop: orders.reduce((total, order) => total + order.pendingCop, 0),
    totalUnits: orders.reduce(
      (total, order) =>
        total + order.items.reduce((orderTotal, item) => orderTotal + item.quantity, 0),
      0
    ),
    hasPartialOrders: orders.some((order) => order.isPartial),
  };
}

function buildArrivalWhatsAppMessage(
  customer: PrintableCustomer,
  includesAllProducts: boolean
) {
  const products = customer.orders.flatMap(({ order, items }) =>
    items.map((item) => ({ orderId: order.id, item }))
  );
  const greeting = `Hola ${customer.name}, tenemos una buena noticia.`;

  if (products.length === 1) {
    const [{ orderId, item }] = products;
    return [
      greeting,
      "",
      `Tu producto *${item.productName}* del pedido *${orderId}* ya llego a Colombia.`,
      `Cantidad: ${numberFormatter.format(item.quantity)}`,
      `Saldo pendiente: *${formatCop(customer.pendingCop)}*`,
      "Metodo de pago: *Nequi o llave - 3045720023*",
      "",
      "Cuando realices el pago, envianos el comprobante para coordinar la entrega.",
      "",
      "Gracias por comprar en *FerShop USA*.",
    ].join("\n");
  }

  const heading = includesAllProducts
    ? "Todos tus productos ya llegaron a Colombia:"
    : "Los siguientes productos ya llegaron a Colombia:";
  const productLines = products.map(
    ({ orderId, item }) =>
      `- ${item.productName} (${numberFormatter.format(item.quantity)} unidad(es)) - ${orderId}`
  );

  return [
    greeting,
    "",
    heading,
    ...productLines,
    "",
    `Saldo pendiente: *${formatCop(customer.pendingCop)}*`,
    "Metodo de pago: *Nequi o llave - 3045720023*",
    ...(includesAllProducts
      ? ["Te adjuntamos tu estado de cuenta con el detalle completo de la compra."]
      : []),
    "Cuando realices el pago, envianos el comprobante para coordinar la entrega.",
    "",
    "Gracias por comprar en *FerShop USA*.",
  ].join("\n");
}

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

function formatReportDate(date = new Date()) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(date);
}

function groupPendingCustomers(orders: DashboardOrder[]) {
  const customers = new Map<string, PendingCustomer>();

  orders.forEach((order) => {
    const pendingCop = getOrderOutstandingCop(order);
    if (pendingCop <= 0) {
      return;
    }

    const key = getCustomerKey(order);
    const paidCop = getOrderPaidCop(order);
    const customer = customers.get(key);

    if (customer) {
      customer.orders.push(order);
      customer.totalCop += order.totalCop;
      customer.paidCop += paidCop;
      customer.pendingCop += pendingCop;
      customer.totalUnits += order.quantity;
      customer.email ||= order.customerEmail;
      customer.phone ||= order.customerPhone;
      customer.city ||= order.customerCity;
      return;
    }

    customers.set(key, {
      key,
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      city: order.customerCity,
      orders: [order],
      totalCop: order.totalCop,
      paidCop,
      pendingCop,
      totalUnits: order.quantity,
    });
  });

  return [...customers.values()]
    .map((customer) => ({
      ...customer,
      orders: customer.orders.sort(
        (left, right) => Date.parse(right.createdAtIso) - Date.parse(left.createdAtIso)
      ),
    }))
    .sort((left, right) => right.pendingCop - left.pendingCop);
}

function PrintableBalanceReport({ customer }: { customer: PrintableCustomer }) {
  return (
    <section className="balances-print-report" aria-label={`Estado de cuenta de ${customer.name}`}>
      <header className="balances-print-header">
        <div className="balances-print-brand">
          <img id="fershop-print-logo" src={printLogoUrl} alt="FerShop USA" />
        </div>
        <div>
          <span>Estado de cuenta</span>
          <small>Corte al {formatReportDate()}</small>
        </div>
      </header>

      <section className="balances-print-customer">
        <div>
          <span>Cliente</span>
          <strong>{customer.name}</strong>
        </div>
        <div>
          <span>Telefono</span>
          <strong>{customer.phone || "No registrado"}</strong>
        </div>
        <div>
          <span>Correo</span>
          <strong>{customer.email || "No registrado"}</strong>
        </div>
        <div>
          <span>Ciudad</span>
          <strong>{customer.city || "No registrada"}</strong>
        </div>
      </section>

      <section className="balances-print-summary" aria-label="Resumen del estado de cuenta">
        <div>
          <span>Total comprado</span>
          <strong>{formatCop(customer.totalCop)}</strong>
        </div>
        <div>
          <span>Total pagado</span>
          <strong>{formatCop(customer.paidCop)}</strong>
        </div>
        <div className="is-pending">
          <span>Saldo pendiente</span>
          <strong>{formatCop(customer.pendingCop)}</strong>
        </div>
      </section>

      <div className="balances-print-orders">
        {customer.orders.map(({ order, items, totalCop, paidCop, pendingCop, isPartial }) => {
          const receivedPayments = order.payments.filter(
            (payment) => payment.statusCode === "received"
          );

          return (
            <article key={order.id} className="balances-print-order">
              <header>
                <div>
                  <span>Pedido</span>
                  <strong>{order.id}</strong>
                </div>
                <div>
                  <span>Fecha</span>
                  <strong>{formatOrderDate(order.createdAtIso)}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong>{order.statusLabel}</strong>
                </div>
              </header>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unidad</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${order.id}-print-${item.productId}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{numberFormatter.format(item.quantity)}</td>
                      <td>{formatCop(item.unitPriceCop)}</td>
                      <td>{formatCop(item.lineTotalCop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isPartial ? (
                <div className="balances-print-payments">
                  <span>
                    Seleccion parcial: el valor pagado se aplico proporcionalmente a los productos
                    incluidos.
                  </span>
                </div>
              ) : receivedPayments.length ? (
                <div className="balances-print-payments">
                  <span>Pagos registrados:</span>
                  {receivedPayments.map((payment) => (
                    <span key={payment.id}>
                      {payment.recordedAtIso
                        ? formatOrderDate(payment.recordedAtIso)
                        : payment.recordedAtLabel}
                      : <strong>{formatCop(payment.amountCop)}</strong>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="balances-print-payments">
                  <span>No hay pagos registrados para este pedido.</span>
                </div>
              )}

              <footer>
                <span>Total: <strong>{formatCop(totalCop)}</strong></span>
                <span>Pagado: <strong>{formatCop(paidCop)}</strong></span>
                <span className="is-pending">Pendiente: <strong>{formatCop(pendingCop)}</strong></span>
              </footer>
            </article>
          );
        })}
      </div>

      <footer className="balances-print-footer">
        <div>
          <span>Saldo total pendiente</span>
          <strong>{formatCop(customer.pendingCop)}</strong>
        </div>
        <p>
          Este estado de cuenta refleja los pagos registrados hasta la fecha de corte. Si tienes
          alguna inquietud, comunicate con FerShop USA al 304 575 0023.
        </p>
        {customer.hasPartialOrders ? (
          <p>
            Los pagos de pedidos incluidos parcialmente se distribuyeron de forma proporcional al
            valor de los productos seleccionados.
          </p>
        ) : null}
      </footer>
    </section>
  );
}

export function PendingBalancesWorkbench({ orders: initialOrders }: PendingBalancesWorkbenchProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState<ArrivalFilter>("all");
  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);
  const [printCustomer, setPrintCustomer] = useState<PrintableCustomer | null>(null);
  const [printingCustomerKey, setPrintingCustomerKey] = useState<string | null>(null);
  const [generalPaymentCustomerKey, setGeneralPaymentCustomerKey] = useState<string | null>(null);
  const [generalPaymentAmountCop, setGeneralPaymentAmountCop] = useState(0);
  const [generalPaymentNote, setGeneralPaymentNote] = useState("");
  const [generalPaymentError, setGeneralPaymentError] = useState("");
  const [generalPaymentFeedback, setGeneralPaymentFeedback] = useState("");
  const [isSavingGeneralPayment, setIsSavingGeneralPayment] = useState(false);
  const [messageCopyStatus, setMessageCopyStatus] = useState<MessageCopyStatus | null>(null);
  const [selectedItemsByCustomer, setSelectedItemsByCustomer] = useState<Record<string, string[]>>(
    {}
  );

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const logo = new window.Image();
    logo.src = printLogoUrl;
    void logo.decode().catch(() => undefined);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function refreshOrders() {
      const latestOrders = await fetchLatestOrders();
      if (isActive && latestOrders) {
        setOrders(latestOrders);
      }
    }

    function refreshVisibleReport() {
      if (document.visibilityState === "visible") {
        void refreshOrders();
      }
    }

    void refreshOrders();
    const intervalId = window.setInterval(refreshVisibleReport, 30_000);
    window.addEventListener("focus", refreshVisibleReport);
    document.addEventListener("visibilitychange", refreshVisibleReport);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshVisibleReport);
      document.removeEventListener("visibilitychange", refreshVisibleReport);
    };
  }, []);

  const allCustomers = useMemo(() => groupPendingCustomers(orders), [orders]);
  const customers = useMemo(
    () => groupPendingCustomers(filterOrdersByArrival(orders, arrivalFilter)),
    [arrivalFilter, orders]
  );
  const generalPaymentCustomer = useMemo(
    () =>
      allCustomers.find((customer) => customer.key === generalPaymentCustomerKey) ?? null,
    [allCustomers, generalPaymentCustomerKey]
  );
  const generalPaymentPreview = useMemo(() => {
    if (!generalPaymentCustomer) {
      return [];
    }

    const allocationsByOrderId = new Map(
      allocateGeneralPayment(
        generalPaymentCustomer.orders.map((order) => ({
          orderId: order.id,
          createdAtIso: order.createdAtIso,
          outstandingCop: getOrderOutstandingCop(order),
        })),
        generalPaymentAmountCop
      ).map((allocation) => [allocation.orderId, allocation])
    );
    return [...generalPaymentCustomer.orders]
      .sort((left, right) => {
        const dateComparison = left.createdAtIso.localeCompare(right.createdAtIso);
        return dateComparison || left.id.localeCompare(right.id, undefined, { numeric: true });
      })
      .map((order) => {
        const previousOutstandingCop = getOrderOutstandingCop(order);
        const allocation = allocationsByOrderId.get(order.id);
        const appliedCop = allocation?.appliedCop ?? 0;
        return {
          order,
          orderId: order.id,
          previousOutstandingCop,
          appliedCop,
          remainingOutstandingCop: previousOutstandingCop - appliedCop,
        };
      });
  }, [generalPaymentAmountCop, generalPaymentCustomer]);
  const generalPaymentAffectedOrders = generalPaymentPreview.filter(
    (preview) => preview.appliedCop > 0
  ).length;
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        matchesSearch(search, [
          customer.name,
          customer.email,
          customer.phone,
          customer.city,
          ...customer.orders.flatMap((order) => [
            order.id,
            order.productName,
            ...getOrderItems(order).map((item) => item.productName),
          ]),
        ])
      ),
    [customers, search]
  );
  const summary = useMemo(
    () =>
      customers.reduce(
        (totals, customer) => {
          totals.pendingCop += customer.pendingCop;
          totals.orders += customer.orders.length;
          totals.units += customer.totalUnits;
          return totals;
        },
        { pendingCop: 0, orders: 0, units: 0 }
      ),
    [customers]
  );
  useEffect(() => {
    if (expandedCustomerKey && !customers.some((customer) => customer.key === expandedCustomerKey)) {
      setExpandedCustomerKey(null);
    }
  }, [customers, expandedCustomerKey]);

  useEffect(() => {
    if (generalPaymentCustomerKey && !generalPaymentCustomer) {
      setGeneralPaymentCustomerKey(null);
    }
  }, [generalPaymentCustomer, generalPaymentCustomerKey]);

  function openGeneralPayment(customerKey: string) {
    setGeneralPaymentCustomerKey(customerKey);
    setGeneralPaymentAmountCop(0);
    setGeneralPaymentNote("");
    setGeneralPaymentError("");
  }

  function closeGeneralPayment() {
    if (isSavingGeneralPayment) {
      return;
    }
    setGeneralPaymentCustomerKey(null);
    setGeneralPaymentAmountCop(0);
    setGeneralPaymentNote("");
    setGeneralPaymentError("");
  }

  async function saveGeneralPayment() {
    const customer = generalPaymentCustomer;
    if (!customer) {
      return;
    }
    if (generalPaymentAmountCop <= 0) {
      setGeneralPaymentError("Ingresa un valor mayor a cero.");
      return;
    }
    if (generalPaymentAmountCop > customer.pendingCop) {
      setGeneralPaymentError(`El abono no puede superar ${formatCop(customer.pendingCop)}.`);
      return;
    }

    setIsSavingGeneralPayment(true);
    setGeneralPaymentError("");
    try {
      const response = await fetch("/api/payments/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerKey: customer.key,
          orderIds: customer.orders.map((order) => order.id),
          amountCop: generalPaymentAmountCop,
          note: generalPaymentNote,
        }),
      });
      const payload = (await response.json()) as GeneralPaymentApiPayload;
      if (!response.ok) {
        setGeneralPaymentError(payload.message || "No pudimos registrar el abono general.");
        return;
      }

      const latestOrders = await fetchLatestOrders();
      if (latestOrders) {
        setOrders(latestOrders);
      } else if (payload.orders?.length) {
        const updatedOrders = new Map(payload.orders.map((order) => [order.id, order]));
        setOrders((current) =>
          current.map((order) => updatedOrders.get(order.id) ?? order)
        );
      }
      setGeneralPaymentFeedback(
        `Se registraron ${formatCop(generalPaymentAmountCop)} para ${customer.name}.`
      );
      setGeneralPaymentCustomerKey(null);
      setGeneralPaymentAmountCop(0);
      setGeneralPaymentNote("");
    } catch {
      setGeneralPaymentError("No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setIsSavingGeneralPayment(false);
    }
  }

  function updateCustomerSelection(customer: PendingCustomer, update: (keys: Set<string>) => void) {
    setSelectedItemsByCustomer((current) => {
      const keys = getSelectedKeys(customer, current[customer.key]);
      update(keys);
      return { ...current, [customer.key]: [...keys] };
    });
  }

  function toggleCustomerSelection(customer: PendingCustomer) {
    updateCustomerSelection(customer, (keys) => {
      const allKeys = getCustomerItemKeys(customer);
      if (allKeys.every((key) => keys.has(key))) {
        keys.clear();
      } else {
        allKeys.forEach((key) => keys.add(key));
      }
    });
  }

  function toggleOrderSelection(customer: PendingCustomer, order: DashboardOrder) {
    updateCustomerSelection(customer, (keys) => {
      const orderKeys = getOrderItems(order).map((_, index) =>
        getItemSelectionKey(order.id, index)
      );
      if (orderKeys.every((key) => keys.has(key))) {
        orderKeys.forEach((key) => keys.delete(key));
      } else {
        orderKeys.forEach((key) => keys.add(key));
      }
    });
  }

  function toggleItemSelection(customer: PendingCustomer, itemKey: string) {
    updateCustomerSelection(customer, (keys) => {
      if (keys.has(itemKey)) {
        keys.delete(itemKey);
      } else {
        keys.add(itemKey);
      }
    });
  }

  async function copyArrivalMessage(
    customer: PendingCustomer,
    selectedItemKeys: string[],
    messageKey: string,
    includesAllProducts: boolean
  ) {
    const printableCustomer = buildPrintableCustomer(customer, selectedItemKeys);
    if (!printableCustomer) {
      setMessageCopyStatus({
        customerKey: customer.key,
        key: messageKey,
        message: "Selecciona al menos un producto para preparar el mensaje.",
        isError: true,
      });
      return;
    }

    const hasProductsWithoutArrival = printableCustomer.orders.some(
      ({ order }) => !order.arrivalRecordedAtIso
    );
    if (hasProductsWithoutArrival) {
      setMessageCopyStatus({
        customerKey: customer.key,
        key: messageKey,
        message: "Solo se pueden notificar productos con llegada a Colombia registrada.",
        isError: true,
      });
      return;
    }

    try {
      await copyTextToClipboard(
        buildArrivalWhatsAppMessage(printableCustomer, includesAllProducts)
      );
      setMessageCopyStatus({
        customerKey: customer.key,
        key: messageKey,
        message: includesAllProducts
          ? "Mensaje copiado. Guarda el PDF y adjuntalo en WhatsApp."
          : "Mensaje de llegada copiado.",
        isError: false,
      });
    } catch {
      setMessageCopyStatus({
        customerKey: customer.key,
        key: messageKey,
        message: "No pudimos copiar el mensaje. Intenta nuevamente.",
        isError: true,
      });
    }
  }

  useEffect(() => {
    function clearPrintCustomer() {
      setPrintCustomer(null);
    }

    window.addEventListener("afterprint", clearPrintCustomer);
    return () => window.removeEventListener("afterprint", clearPrintCustomer);
  }, []);

  async function printBalance(customerKey: string) {
    setPrintingCustomerKey(customerKey);

    try {
      let customer = customers.find((candidate) => candidate.key === customerKey) ?? null;
      const latestOrders = await fetchLatestOrders();

      if (latestOrders) {
        setOrders(latestOrders);
        customer =
          groupPendingCustomers(filterOrdersByArrival(latestOrders, arrivalFilter)).find(
            (candidate) => candidate.key === customerKey
          ) ?? null;
      }

      if (!customer) {
        return;
      }

      const printableCustomer = buildPrintableCustomer(
        customer,
        selectedItemsByCustomer[customerKey]
      );
      if (!printableCustomer) {
        return;
      }

      setPrintCustomer(printableCustomer);
      await waitForNextFrame();
      await waitForNextFrame();
      await document.fonts.ready;

      const logo = document.querySelector<HTMLImageElement>("#fershop-print-logo");
      if (logo) {
        await waitForImageDecode(logo);
      }

      window.print();
    } finally {
      setPrintingCustomerKey(null);
    }
  }

  return (
    <>
      <main className="ops-page reports-page balances-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Informes</p>
          <h1>Saldos pendientes</h1>
          <p className="balances-page-description">
            Personas con cartera pendiente y detalle de los productos comprados.
          </p>
        </div>
      </div>

      <section className="ops-stat-grid reports-stat-grid" aria-label="Resumen de cartera">
        <article className="ops-stat-card balances-highlight-card">
          <span>Total por cobrar</span>
          <strong>{formatCop(summary.pendingCop)}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Personas con saldo</span>
          <strong>{numberFormatter.format(customers.length)}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Pedidos pendientes</span>
          <strong>{numberFormatter.format(summary.orders)}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Productos vendidos</span>
          <strong>{numberFormatter.format(summary.units)}</strong>
        </article>
      </section>

      <section className="ops-card ops-table-card balances-section">
        <div className="ops-card__header balances-section-header">
          <div>
            <h2>Cartera por persona</h2>
            <span>
              {arrivalFilter === "arrived"
                ? "Solo pedidos con llegada a Colombia registrada"
                : "Ordenada de mayor a menor saldo"}
            </span>
          </div>
          <label className="balances-arrival-filter">
            <span>Estado del pedido</span>
            <select
              value={arrivalFilter}
              onChange={(event) => {
                setArrivalFilter(event.target.value as ArrivalFilter);
                setExpandedCustomerKey(null);
                setMessageCopyStatus(null);
              }}
            >
              <option value="all">Todos los saldos</option>
              <option value="arrived">Llegados a Colombia</option>
            </select>
          </label>
        </div>
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar persona, pedido o producto..."
          resultLabel={`${numberFormatter.format(filteredCustomers.length)} de ${numberFormatter.format(customers.length)} personas`}
        />
        {generalPaymentFeedback ? (
          <p className="general-payment-success" role="status">
            {generalPaymentFeedback}
          </p>
        ) : null}

        {filteredCustomers.length ? (
          <div className="ops-table-scroll">
            <table className="ops-table balances-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Pedidos</th>
                  <th>Unidades</th>
                  <th>Total comprado</th>
                  <th>Pagado</th>
                  <th>Saldo pendiente</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const isExpanded = expandedCustomerKey === customer.key;
                  const selectedKeys = getSelectedKeys(
                    customer,
                    selectedItemsByCustomer[customer.key]
                  );
                  const allItemKeys = getCustomerItemKeys(customer);
                  const selectedItemCount = allItemKeys.filter((key) => selectedKeys.has(key)).length;
                  const allItemsSelected = selectedItemCount === allItemKeys.length;
                  const completeCustomer =
                    allCustomers.find((candidate) => candidate.key === customer.key) ?? customer;
                  const selectedIncludesAllCustomerProducts =
                    allItemsSelected &&
                    selectedItemCount === getCustomerItemKeys(completeCustomer).length;
                  const selectedReport = buildPrintableCustomer(
                    customer,
                    selectedItemsByCustomer[customer.key]
                  );
                  const selectedProductsHaveArrived = Boolean(
                    selectedReport?.orders.every(({ order }) => order.arrivalRecordedAtIso)
                  );
                  const selectedMessageKey = `selection:${customer.key}:${[...selectedKeys]
                    .sort()
                    .join("|")}`;
                  return (
                    <Fragment key={customer.key}>
                      <tr className={isExpanded ? "is-selected" : undefined}>
                        <td>
                          <div className="balances-customer-cell">
                            <span className="balances-avatar" aria-hidden="true">
                              {customer.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                            <div>
                              <strong>{customer.name}</strong>
                              <small>{customer.phone || customer.email || customer.city}</small>
                            </div>
                          </div>
                        </td>
                        <td>{numberFormatter.format(customer.orders.length)}</td>
                        <td>{numberFormatter.format(customer.totalUnits)}</td>
                        <td>{formatCop(customer.totalCop)}</td>
                        <td>{formatCop(customer.paidCop)}</td>
                        <td><strong className="balances-pending-amount">{formatCop(customer.pendingCop)}</strong></td>
                        <td>
                          <button
                            type="button"
                            className="balances-detail-button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedCustomerKey((current) =>
                                current === customer.key ? null : customer.key
                              )
                            }
                          >
                            {isExpanded ? "Ocultar" : "Ver detalle"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="reports-inline-detail-row">
                          <td colSpan={7} className="reports-inline-detail-cell">
                            <div className="reports-inline-detail balances-inline-detail">
                              <header className="balances-detail-header">
                                <div>
                                  <span>Detalle de cartera</span>
                                  <h2>{customer.name}</h2>
                                  <p>
                                    {[customer.phone, customer.email, customer.city]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                  <label className="balances-select-all">
                                    <input
                                      type="checkbox"
                                      checked={allItemsSelected}
                                      onChange={() => toggleCustomerSelection(customer)}
                                    />
                                    <span>
                                      {allItemsSelected ? "Quitar seleccion" : "Seleccionar todo"}
                                    </span>
                                    <small>
                                      {numberFormatter.format(selectedItemCount)} de{" "}
                                      {numberFormatter.format(allItemKeys.length)} productos
                                    </small>
                                  </label>
                                </div>
                                <div className="balances-detail-actions">
                                  <div className="balances-detail-total">
                                    <span>Saldo seleccionado</span>
                                    <strong>{formatCop(selectedReport?.pendingCop ?? 0)}</strong>
                                  </div>
                                  <button
                                    type="button"
                                    className="ops-button ops-button--primary"
                                    onClick={() => openGeneralPayment(customer.key)}
                                  >
                                    Registrar abono general
                                  </button>
                                  <button
                                    type="button"
                                    className="ops-button"
                                    disabled={
                                      selectedItemCount === 0 || !selectedProductsHaveArrived
                                    }
                                    title={
                                      selectedProductsHaveArrived
                                        ? "Copiar mensaje para WhatsApp"
                                        : "Todos los productos seleccionados deben tener llegada registrada"
                                    }
                                    onClick={() =>
                                      void copyArrivalMessage(
                                        customer,
                                        [...selectedKeys],
                                        selectedMessageKey,
                                        selectedIncludesAllCustomerProducts
                                      )
                                    }
                                  >
                                    {messageCopyStatus?.key === selectedMessageKey &&
                                    !messageCopyStatus.isError
                                      ? "Mensaje copiado"
                                      : "Copiar mensaje WhatsApp"}
                                  </button>
                                  <button
                                    type="button"
                                    className="ops-button"
                                    disabled={printingCustomerKey !== null || selectedItemCount === 0}
                                    onClick={() => void printBalance(customer.key)}
                                  >
                                    {printingCustomerKey === customer.key
                                      ? "Preparando PDF..."
                                      : "Imprimir / guardar PDF"}
                                  </button>
                                  {selectedItemCount === 0 ? (
                                    <small className="balances-selection-warning" role="status">
                                      Selecciona al menos un producto.
                                    </small>
                                  ) : null}
                                  {messageCopyStatus?.customerKey === customer.key ? (
                                    <small
                                      className={`balances-message-feedback${
                                        messageCopyStatus.isError ? " is-error" : ""
                                      }`}
                                      role={messageCopyStatus.isError ? "alert" : "status"}
                                    >
                                      {messageCopyStatus.message}
                                    </small>
                                  ) : null}
                                </div>
                              </header>

                              <div className="balances-order-list">
                                {customer.orders.map((order) => {
                                  const paidCop = getOrderPaidCop(order);
                                  const pendingCop = getOrderOutstandingCop(order);
                                  const items = getOrderItems(order);
                                  const orderItemKeys = items.map((_, index) =>
                                    getItemSelectionKey(order.id, index)
                                  );
                                  const selectedOrderItems = orderItemKeys.filter((key) =>
                                    selectedKeys.has(key)
                                  ).length;
                                  const orderSelected = selectedOrderItems === orderItemKeys.length;

                                  return (
                                    <article key={order.id} className="balances-order-card">
                                      <div className="balances-order-header">
                                        <div className="balances-order-select">
                                          <input
                                            type="checkbox"
                                            aria-label={`Incluir todos los productos de ${order.id}`}
                                            checked={orderSelected}
                                            onChange={() => toggleOrderSelection(customer, order)}
                                          />
                                          <div>
                                            <Link
                                              href={`/admin/seguimiento?order=${order.id}`}
                                              className="ops-order-link"
                                            >
                                              {order.id}
                                            </Link>
                                            <span>{formatOrderDate(order.createdAtIso)}</span>
                                            <small>
                                              {numberFormatter.format(selectedOrderItems)} de{" "}
                                              {numberFormatter.format(orderItemKeys.length)} seleccionados
                                            </small>
                                          </div>
                                        </div>
                                        <span className={`ops-status ops-status--${order.statusCode}`}>
                                          {order.statusLabel}
                                        </span>
                                      </div>

                                      <div className="balances-order-summary" aria-label={`Resumen de ${order.id}`}>
                                        <div>
                                          <span>Total</span>
                                          <strong>{formatCop(order.totalCop)}</strong>
                                        </div>
                                        <div>
                                          <span>Pagado</span>
                                          <strong>{formatCop(paidCop)}</strong>
                                        </div>
                                        <div className="is-pending">
                                          <span>Pendiente</span>
                                          <strong>{formatCop(pendingCop)}</strong>
                                        </div>
                                      </div>

                                      <div className="balances-product-list">
                                        {items.map((item, index) => {
                                          const itemKey = getItemSelectionKey(order.id, index);
                                          const itemMessageKey = `product:${itemKey}`;
                                          const canNotifyArrival = Boolean(order.arrivalRecordedAtIso);
                                          return (
                                          <div
                                            key={`${order.id}-${item.productId}-${index}`}
                                            className={`balances-product-row${
                                              selectedKeys.has(itemKey) ? " is-selected" : ""
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              aria-label={`Incluir ${item.productName} en el PDF`}
                                              checked={selectedKeys.has(itemKey)}
                                              onChange={() => toggleItemSelection(customer, itemKey)}
                                            />
                                            <span className="ops-product-thumb">
                                              {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" />
                                              ) : (
                                                item.productName.slice(0, 2).toUpperCase()
                                              )}
                                            </span>
                                            <div className="balances-product-name">
                                              <strong>{item.productName}</strong>
                                              <small>{numberFormatter.format(item.quantity)} unidad(es)</small>
                                            </div>
                                            <div>
                                              <span>Precio unidad</span>
                                              <strong>{formatCop(item.unitPriceCop)}</strong>
                                            </div>
                                            <div>
                                              <span>Subtotal</span>
                                              <strong>{formatCop(item.lineTotalCop)}</strong>
                                            </div>
                                            <div className="balances-product-message">
                                              <button
                                                type="button"
                                                className="balances-message-button"
                                                disabled={!canNotifyArrival}
                                                title={
                                                  canNotifyArrival
                                                    ? "Copiar aviso de llegada"
                                                    : "Registra primero la llegada a Colombia"
                                                }
                                                onClick={() =>
                                                  void copyArrivalMessage(
                                                    customer,
                                                    [itemKey],
                                                    itemMessageKey,
                                                    false
                                                  )
                                                }
                                              >
                                                {messageCopyStatus?.key === itemMessageKey &&
                                                !messageCopyStatus.isError
                                                  ? "Copiado"
                                                  : "Copiar aviso"}
                                              </button>
                                              {!canNotifyArrival ? <small>Sin llegada</small> : null}
                                            </div>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ops-empty-state reports-empty-state">
            <h2>
              {customers.length
                ? "No encontramos coincidencias"
                : arrivalFilter === "arrived"
                  ? "No hay saldos de pedidos llegados"
                  : "No hay saldos pendientes"}
            </h2>
            <p>
              {customers.length
                ? "Prueba buscando por otro nombre, pedido o producto."
                : arrivalFilter === "arrived"
                  ? "No hay pedidos con llegada registrada y saldo pendiente."
                  : "Todos los pedidos registrados se encuentran pagados."}
            </p>
          </div>
        )}
        </section>
      </main>
      {generalPaymentCustomer ? (
        <div
          className="order-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeGeneralPayment();
            }
          }}
        >
          <section
            className="order-modal general-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="general-payment-title"
          >
            <header className="order-modal__header">
              <div>
                <h2 id="general-payment-title">Registrar abono general</h2>
                <small>{generalPaymentCustomer.name}</small>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                disabled={isSavingGeneralPayment}
                onClick={closeGeneralPayment}
              >
                x
              </button>
            </header>

            <div className="general-payment-body">
              <div className="general-payment-summary">
                <span>Saldo total pendiente</span>
                <strong>{formatCop(generalPaymentCustomer.pendingCop)}</strong>
                <small>
                  {numberFormatter.format(generalPaymentCustomer.orders.length)} pedido(s) con saldo
                </small>
              </div>

              <div className="general-payment-fields">
                <label className="general-payment-field">
                  <span>Valor recibido</span>
                  <span className="money-input general-payment-money-input">
                    <span>$</span>
                    <FormattedNumberInput
                      value={generalPaymentAmountCop}
                      max={generalPaymentCustomer.pendingCop}
                      disabled={isSavingGeneralPayment}
                      aria-label="Valor del abono general"
                      autoFocus
                      onValueChange={(value) => {
                        setGeneralPaymentAmountCop(value);
                        setGeneralPaymentError("");
                      }}
                    />
                  </span>
                </label>

                <label className="general-payment-field">
                  <span>Nota opcional</span>
                  <textarea
                    value={generalPaymentNote}
                    disabled={isSavingGeneralPayment}
                    placeholder="Ejemplo: transferencia recibida por Nequi"
                    rows={2}
                    onChange={(event) => setGeneralPaymentNote(event.target.value)}
                  />
                </label>
              </div>

              <div className="general-payment-rule">
                <strong>Distribucion automatica</strong>
                <span>
                  El dinero se aplicara primero al pedido mas antiguo y continuara en orden hasta
                  agotar el valor recibido.
                </span>
              </div>

              {generalPaymentPreview.length ? (
                <div className="general-payment-allocation">
                  <div className="general-payment-allocation__header">
                    <strong>Vista previa</strong>
                    <span>
                      {numberFormatter.format(generalPaymentAffectedOrders)} reciben abono de{" "}
                      {numberFormatter.format(generalPaymentPreview.length)} pendientes
                    </span>
                  </div>
                  <div className="general-payment-allocation__list">
                    {generalPaymentPreview.map((preview, index) => (
                      <div
                        className={`general-payment-row${
                          preview.appliedCop > 0 ? "" : " is-unaffected"
                        }`}
                        key={preview.orderId}
                      >
                        <span className="general-payment-sequence">{index + 1}</span>
                        <div>
                          <strong>{preview.orderId}</strong>
                          <small>{formatOrderDate(preview.order.createdAtIso)}</small>
                        </div>
                        <div>
                          <span>Se aplica</span>
                          <strong>
                            {preview.appliedCop > 0
                              ? formatCop(preview.appliedCop)
                              : "Sin aplicar"}
                          </strong>
                        </div>
                        <div>
                          <span>Queda</span>
                          <strong>{formatCop(preview.remainingOutstandingCop)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {generalPaymentError ? (
                <p className="order-form-error" role="alert">
                  {generalPaymentError}
                </p>
              ) : null}
            </div>

            <footer className="order-modal__footer">
              <span>
                Nuevo saldo: {formatCop(
                  Math.max(generalPaymentCustomer.pendingCop - generalPaymentAmountCop, 0)
                )}
              </span>
              <div>
                <button
                  type="button"
                  className="ops-button"
                  disabled={isSavingGeneralPayment}
                  onClick={closeGeneralPayment}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ops-button ops-button--primary"
                  disabled={isSavingGeneralPayment || generalPaymentAmountCop <= 0}
                  onClick={() => void saveGeneralPayment()}
                >
                  {isSavingGeneralPayment ? "Registrando..." : "Registrar y distribuir"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
      {printCustomer ? <PrintableBalanceReport customer={printCustomer} /> : null}
    </>
  );
}
