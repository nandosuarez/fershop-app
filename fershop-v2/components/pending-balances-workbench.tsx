"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { ListSearch } from "@/components/list-search";
import { formatCop, getOrderOutstandingCop, getOrderPaidCop } from "@/lib/commerce";
import { matchesSearch, normalizeSearchText } from "@/lib/search";
import type { DashboardOrder, OrderItem } from "@/lib/types";

interface PendingBalancesWorkbenchProps {
  orders: DashboardOrder[];
}

interface OrdersApiPayload {
  orders?: DashboardOrder[];
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

const numberFormatter = new Intl.NumberFormat("es-CO");

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

function PrintableBalanceReport({ customer }: { customer: PendingCustomer }) {
  return (
    <section className="balances-print-report" aria-label={`Estado de cuenta de ${customer.name}`}>
      <header className="balances-print-header">
        <div className="balances-print-brand">
          <img src="/brand/fershop-logo-light.png" alt="FerShop USA" />
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
        {customer.orders.map((order) => {
          const paidCop = getOrderPaidCop(order);
          const pendingCop = getOrderOutstandingCop(order);
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
                  {getOrderItems(order).map((item, index) => (
                    <tr key={`${order.id}-print-${item.productId}-${index}`}>
                      <td>{item.productName}</td>
                      <td>{numberFormatter.format(item.quantity)}</td>
                      <td>{formatCop(item.unitPriceCop)}</td>
                      <td>{formatCop(item.lineTotalCop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {receivedPayments.length ? (
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
                <span>Total: <strong>{formatCop(order.totalCop)}</strong></span>
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
      </footer>
    </section>
  );
}

export function PendingBalancesWorkbench({ orders: initialOrders }: PendingBalancesWorkbenchProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);
  const [printCustomerKey, setPrintCustomerKey] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    let isActive = true;

    async function refreshOrders() {
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as OrdersApiPayload;
        if (isActive && Array.isArray(payload.orders)) {
          setOrders(payload.orders);
        }
      } catch {
        // Keep the last valid balances visible if a background refresh fails.
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

  const customers = useMemo(() => groupPendingCustomers(orders), [orders]);
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
  const printCustomer = customers.find((customer) => customer.key === printCustomerKey) ?? null;

  useEffect(() => {
    if (expandedCustomerKey && !customers.some((customer) => customer.key === expandedCustomerKey)) {
      setExpandedCustomerKey(null);
    }
  }, [customers, expandedCustomerKey]);

  useEffect(() => {
    function clearPrintCustomer() {
      setPrintCustomerKey(null);
    }

    window.addEventListener("afterprint", clearPrintCustomer);
    return () => window.removeEventListener("afterprint", clearPrintCustomer);
  }, []);

  function printBalance(customerKey: string) {
    setPrintCustomerKey(customerKey);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
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
            <span>Ordenada de mayor a menor saldo</span>
          </div>
        </div>
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar persona, pedido o producto..."
          resultLabel={`${numberFormatter.format(filteredCustomers.length)} de ${numberFormatter.format(customers.length)} personas`}
        />

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
                                </div>
                                <div className="balances-detail-actions">
                                  <div className="balances-detail-total">
                                    <span>Saldo total</span>
                                    <strong>{formatCop(customer.pendingCop)}</strong>
                                  </div>
                                  <button
                                    type="button"
                                    className="ops-button ops-button--primary"
                                    onClick={() => printBalance(customer.key)}
                                  >
                                    Imprimir / guardar PDF
                                  </button>
                                </div>
                              </header>

                              <div className="balances-order-list">
                                {customer.orders.map((order) => {
                                  const paidCop = getOrderPaidCop(order);
                                  const pendingCop = getOrderOutstandingCop(order);
                                  const items = getOrderItems(order);

                                  return (
                                    <article key={order.id} className="balances-order-card">
                                      <div className="balances-order-header">
                                        <div>
                                          <Link
                                            href={`/admin/seguimiento?order=${order.id}`}
                                            className="ops-order-link"
                                          >
                                            {order.id}
                                          </Link>
                                          <span>{formatOrderDate(order.createdAtIso)}</span>
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
                                        {items.map((item, index) => (
                                          <div
                                            key={`${order.id}-${item.productId}-${index}`}
                                            className="balances-product-row"
                                          >
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
                                          </div>
                                        ))}
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
            <h2>{customers.length ? "No encontramos coincidencias" : "No hay saldos pendientes"}</h2>
            <p>
              {customers.length
                ? "Prueba buscando por otro nombre, pedido o producto."
                : "Todos los pedidos registrados se encuentran pagados."}
            </p>
          </div>
        )}
        </section>
      </main>
      {printCustomer ? <PrintableBalanceReport customer={printCustomer} /> : null}
    </>
  );
}
