"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getOrderFinancialBreakdown } from "@/lib/capital-report";
import { formatCop } from "@/lib/commerce";
import type {
  DashboardOrder,
  Expense,
  InventorySnapshot,
  PaymentLogEntry,
  PurchaseOrder,
} from "@/lib/types";

interface CapitalReportWorkbenchProps {
  orders: DashboardOrder[];
  inventory: InventorySnapshot;
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
}

const timeZone = "America/Bogota";
const numberFormatter = new Intl.NumberFormat("es-CO");

function getDateKey(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    })
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getPaymentDateKey(payment: PaymentLogEntry, order: DashboardOrder) {
  return getDateKey(payment.recordedAtIso ?? order.createdAtIso);
}

function getReceivedThrough(order: DashboardOrder, dateKey: string) {
  return order.payments
    .filter(
      (payment) =>
        payment.statusCode === "received" && getPaymentDateKey(payment, order) <= dateKey
    )
    .reduce((sum, payment) => sum + Math.max(Math.round(payment.amountCop), 0), 0);
}

function getReceivedInRange(order: DashboardOrder, fromDate: string, toDate: string) {
  return order.payments
    .filter((payment) => {
      const paymentDate = getPaymentDateKey(payment, order);
      return payment.statusCode === "received" && paymentDate >= fromDate && paymentDate <= toDate;
    })
    .reduce((sum, payment) => sum + Math.max(Math.round(payment.amountCop), 0), 0);
}

function previousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-05:00`);
  date.setDate(date.getDate() - 1);
  return getDateKey(date.toISOString());
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00-05:00`));
}

function getPurchaseOrderDate(order: PurchaseOrder) {
  return getDateKey(order.receivedAtIso ?? order.createdAtIso);
}

function getOrderInvestmentDate(order: DashboardOrder) {
  if (order.purchaseRecordedAtIso) {
    return getDateKey(order.purchaseRecordedAtIso);
  }
  if (order.inventoryReserved) {
    return getDateKey(order.createdAtIso);
  }
  if (order.arrivalRecordedAtIso) {
    return getDateKey(order.arrivalRecordedAtIso);
  }
  if (order.deliveredAtIso) {
    return getDateKey(order.deliveredAtIso);
  }
  return null;
}

export function CapitalReportWorkbench({
  orders,
  inventory,
  purchaseOrders,
  expenses,
}: CapitalReportWorkbenchProps) {
  const today = getDateKey(new Date().toISOString());
  const earliestDate = useMemo(() => {
    const dates = [
      ...orders.map((order) => getDateKey(order.createdAtIso)),
      ...purchaseOrders.map(getPurchaseOrderDate),
      ...expenses.map((expense) => expense.expenseDate),
    ].sort();
    return dates[0] ?? `${today.slice(0, 4)}-01-01`;
  }, [expenses, orders, purchaseOrders, today]);
  const [fromDate, setFromDate] = useState(earliestDate);
  const [toDate, setToDate] = useState(today);
  const hasValidRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const inventoryProductIds = useMemo(
    () => new Set(inventory.items.map((item) => item.product.id)),
    [inventory.items]
  );

  const report = useMemo(() => {
    if (!hasValidRange) {
      return null;
    }

    const beforeFromDate = previousDateKey(fromDate);
    let receivedInRangeCop = 0;
    let shippingCollectedInRangeCop = 0;
    let shippingCollectedThroughCutoffCop = 0;
    let shippingPlannedThroughCutoffCop = 0;
    let capitalFinancedAtCutoffCop = 0;

    const rows = orders
      .filter((order) => getDateKey(order.createdAtIso) <= toDate)
      .map((order) => {
        const paidBeforeRange = getReceivedThrough(order, beforeFromDate);
        const paidThroughCutoff = getReceivedThrough(order, toDate);
        const paidInRange = getReceivedInRange(order, fromDate, toDate);
        const beforeBreakdown = getOrderFinancialBreakdown(order, paidBeforeRange);
        const cutoffBreakdown = getOrderFinancialBreakdown(order, paidThroughCutoff);
        const shippingCollectedInRange = Math.max(
          cutoffBreakdown.shippingCollectedCop - beforeBreakdown.shippingCollectedCop,
          0
        );
        const receivedForMerchandiseInRange = Math.max(
          paidInRange - shippingCollectedInRange,
          0
        );
        const investmentDate = getOrderInvestmentDate(order);
        const hasInvestmentAtCutoff = Boolean(investmentDate && investmentDate <= toDate);
        const capitalFinanced = hasInvestmentAtCutoff
          ? Math.max(cutoffBreakdown.productCostCop - cutoffBreakdown.receivedForMerchandiseCop, 0)
          : 0;

        receivedInRangeCop += paidInRange;
        shippingCollectedInRangeCop += shippingCollectedInRange;
        shippingCollectedThroughCutoffCop += cutoffBreakdown.shippingCollectedCop;
        shippingPlannedThroughCutoffCop += cutoffBreakdown.plannedShippingCop;
        capitalFinancedAtCutoffCop += capitalFinanced;

        const hasActivityInRange =
          (getDateKey(order.createdAtIso) >= fromDate && getDateKey(order.createdAtIso) <= toDate) ||
          paidInRange > 0 ||
          Boolean(investmentDate && investmentDate >= fromDate && investmentDate <= toDate);

        return {
          order,
          paidInRange,
          shippingCollectedInRange,
          receivedForMerchandiseInRange,
          capitalFinanced,
          hasInvestmentAtCutoff,
          cutoffBreakdown,
          hasActivityInRange,
        };
      })
      .filter((row) => row.hasActivityInRange)
      .sort((left, right) => {
        const financeComparison = right.capitalFinanced - left.capitalFinanced;
        return financeComparison || right.order.createdAtIso.localeCompare(left.order.createdAtIso);
      });

    const directPurchaseCapitalCop = orders.reduce((sum, order) => {
      if (!order.purchaseRecordedAtIso) {
        return sum;
      }
      const purchaseDate = getDateKey(order.purchaseRecordedAtIso);
      if (purchaseDate < fromDate || purchaseDate > toDate) {
        return sum;
      }
      return (
        sum +
        (order.items ?? []).reduce(
          (itemSum, item) =>
            inventoryProductIds.has(item.productId)
              ? itemSum
              : itemSum + (item.unitCostCop ?? 0) * item.quantity,
          0
        )
      );
    }, 0);

    const inventoryPurchaseCapitalCop = purchaseOrders
      .filter((order) => {
        const purchaseDate = getPurchaseOrderDate(order);
        return order.statusCode === "received" && purchaseDate >= fromDate && purchaseDate <= toDate;
      })
      .reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum, item) => itemSum + item.unitCostCop * item.quantity,
            0
          ),
        0
      );

    const shippingSpentThroughCutoffCop = expenses
      .filter(
        (expense) =>
          expense.paymentSource === "shipping_fund" && expense.expenseDate <= toDate
      )
      .reduce((sum, expense) => sum + expense.amountCop, 0);

    const currentInventoryProductCapitalCop = inventory.items.reduce(
      (sum, item) =>
        sum + item.availableQuantity * Math.max(Math.round(item.product.costCop ?? 0), 0),
      0
    );

    return {
      rows,
      receivedInRangeCop,
      shippingCollectedInRangeCop,
      receivedForMerchandiseInRangeCop:
        receivedInRangeCop - shippingCollectedInRangeCop,
      capitalInvestedInRangeCop: directPurchaseCapitalCop + inventoryPurchaseCapitalCop,
      directPurchaseCapitalCop,
      inventoryPurchaseCapitalCop,
      capitalFinancedAtCutoffCop,
      currentInventoryProductCapitalCop,
      shippingPendingAtCutoffCop: Math.max(
        shippingPlannedThroughCutoffCop - shippingCollectedThroughCutoffCop,
        0
      ),
      shippingFundBalanceAtCutoffCop:
        shippingCollectedThroughCutoffCop - shippingSpentThroughCutoffCop,
    };
  }, [expenses, fromDate, hasValidRange, inventory.items, inventoryProductIds, orders, purchaseOrders, toDate]);

  return (
    <main className="ops-page capital-report-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Informes</p>
          <h1>Capital y recaudo</h1>
          <p className="capital-report-intro">
            Separa el dinero invertido, lo recibido del cliente y la parte realmente recaudada para envios.
          </p>
        </div>
      </div>

      <section className="ops-card reports-filter-card">
        <div>
          <strong>Periodo de movimientos</strong>
          <span>Los saldos se calculan al cierre de la fecha final.</span>
        </div>
        <div className="reports-date-fields">
          <label>
            <span>Desde</span>
            <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" value={toDate} min={fromDate} max={today} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
      </section>

      {!hasValidRange || !report ? (
        <p className="order-form-error" role="alert">
          La fecha inicial debe ser anterior o igual a la fecha final.
        </p>
      ) : (
        <>
          <section className="capital-report-hero-grid" aria-label="Resumen de capital y recaudo">
            <article className="ops-card capital-report-hero-card capital-report-hero-card--capital">
              <span>Capital invertido en el periodo</span>
              <strong>{formatCop(report.capitalInvestedInRangeCop)}</strong>
              <small>Mercancia comprada, sin mezclar el fondo de envio</small>
            </article>
            <article className="ops-card capital-report-hero-card">
              <span>Recibido de clientes</span>
              <strong>{formatCop(report.receivedInRangeCop)}</strong>
              <small>Pagos registrados entre {formatDate(fromDate)} y {formatDate(toDate)}</small>
            </article>
            <article className="ops-card capital-report-hero-card capital-report-hero-card--shipping">
              <span>De esos pagos, envio</span>
              <strong>{formatCop(report.shippingCollectedInRangeCop)}</strong>
              <small>Calculado proporcionalmente sobre cada pedido</small>
            </article>
            <article className="ops-card capital-report-hero-card capital-report-hero-card--risk">
              <span>Capital financiado al corte</span>
              <strong>{formatCop(report.capitalFinancedAtCutoffCop)}</strong>
              <small>Mercancia comprada que aun no cubre el cliente</small>
            </article>
          </section>

          <section className="capital-report-secondary-grid">
            <article className="ops-card capital-report-metric-card">
              <span>Recibido para mercancia</span>
              <strong>{formatCop(report.receivedForMerchandiseInRangeCop)}</strong>
            </article>
            <article className="ops-card capital-report-metric-card">
              <span>Capital actual en inventario</span>
              <strong>{formatCop(report.currentInventoryProductCapitalCop)}</strong>
              <small>Valor estimado con los costos vigentes</small>
            </article>
            <article className="ops-card capital-report-metric-card">
              <span>Envio pendiente por recaudar</span>
              <strong>{formatCop(report.shippingPendingAtCutoffCop)}</strong>
            </article>
            <article className={`ops-card capital-report-metric-card ${report.shippingFundBalanceAtCutoffCop < 0 ? "is-negative" : ""}`}>
              <span>Saldo fondo de envios al corte</span>
              <strong>{formatCop(report.shippingFundBalanceAtCutoffCop)}</strong>
            </article>
          </section>

          <section className="ops-card capital-report-explanation">
            <div>
              <span className="capital-report-formula-number">1</span>
              <p><strong>Pago del cliente</strong><small>Solo pagos recibidos</small></p>
            </div>
            <span aria-hidden="true">-</span>
            <div>
              <span className="capital-report-formula-number">2</span>
              <p><strong>Envio proporcional</strong><small>Segun el porcentaje pagado</small></p>
            </div>
            <span aria-hidden="true">=</span>
            <div>
              <span className="capital-report-formula-number">3</span>
              <p><strong>Dinero para mercancia</strong><small>Base para recuperar capital</small></p>
            </div>
          </section>

          <section className="ops-card ops-table-card capital-report-detail">
            <div className="ops-card__header">
              <div>
                <h2>Detalle por pedido</h2>
                <span>{numberFormatter.format(report.rows.length)} pedido(s) con movimientos</span>
              </div>
            </div>
            {report.rows.length ? (
              <div className="ops-table-scroll">
                <table className="ops-table capital-report-table">
                  <thead>
                    <tr>
                      <th>Pedido y cliente</th>
                      <th>Productos</th>
                      <th>Costo mercancia</th>
                      <th>Recibido</th>
                      <th>De ese pago, envio</th>
                      <th>Para mercancia</th>
                      <th>Financiado al corte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.order.id}>
                        <td>
                          <Link href={`/admin/seguimiento?order=${row.order.id}`} className="ops-order-link">
                            {row.order.id}
                          </Link>
                          <strong>{row.order.customerName}</strong>
                          <small>{formatDate(getDateKey(row.order.createdAtIso))}</small>
                        </td>
                        <td>{row.order.productName}</td>
                        <td>
                          {row.cutoffBreakdown.hasCompleteCosts
                            ? formatCop(row.cutoffBreakdown.productCostCop)
                            : "Costo incompleto"}
                        </td>
                        <td><strong>{formatCop(row.paidInRange)}</strong></td>
                        <td className="capital-report-shipping-value">{formatCop(row.shippingCollectedInRange)}</td>
                        <td>{formatCop(row.receivedForMerchandiseInRange)}</td>
                        <td className={row.capitalFinanced > 0 ? "capital-report-financed-value" : ""}>
                          <strong>
                            {row.hasInvestmentAtCutoff
                              ? formatCop(row.capitalFinanced)
                              : "Aun no invertido"}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ops-empty-state reports-empty-state">
                <h2>No hay movimientos en este periodo</h2>
              </div>
            )}
          </section>

          <section className="capital-report-source-grid">
            <article className="ops-card capital-report-source-card">
              <span>Compras para pedidos</span>
              <strong>{formatCop(report.directPurchaseCapitalCop)}</strong>
              <small>Referencias sin inventario compradas en el periodo</small>
            </article>
            <article className="ops-card capital-report-source-card">
              <span>Compras para inventario</span>
              <strong>{formatCop(report.inventoryPurchaseCapitalCop)}</strong>
              <small>Ordenes de compra recibidas en el periodo</small>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
