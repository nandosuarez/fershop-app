"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getOrderPurchaseFundingBreakdown } from "@/lib/capital-report";
import { formatCop } from "@/lib/commerce";
import type {
  DashboardOrder,
  InventorySnapshot,
  OrderItem,
  PurchaseOrder,
} from "@/lib/types";

interface CapitalReportWorkbenchProps {
  orders: DashboardOrder[];
  inventory: InventorySnapshot;
  purchaseOrders: PurchaseOrder[];
}

const timeZone = "America/Bogota";
const numberFormatter = new Intl.NumberFormat("es-CO");
const percentFormatter = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

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

function getDirectPurchaseItems(order: DashboardOrder): OrderItem[] {
  const items = order.items ?? [];
  if (!order.inventoryReserved) {
    return items;
  }
  return items.filter((item) => item.saleMode !== "immediate");
}

export function CapitalReportWorkbench({
  orders,
  inventory,
  purchaseOrders,
}: CapitalReportWorkbenchProps) {
  const today = getDateKey(new Date().toISOString());
  const earliestDate = useMemo(() => {
    const dates = [
      ...orders.map((order) => getDateKey(order.createdAtIso)),
      ...purchaseOrders.map(getPurchaseOrderDate),
    ].sort();
    return dates[0] ?? `${today.slice(0, 4)}-01-01`;
  }, [orders, purchaseOrders, today]);
  const [fromDate, setFromDate] = useState(earliestDate);
  const [toDate, setToDate] = useState(today);
  const hasValidRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const report = useMemo(() => {
    if (!hasValidRange) {
      return null;
    }

    const rows = orders
      .filter((order) => {
        const orderDate = getDateKey(order.createdAtIso);
        return orderDate >= fromDate && orderDate <= toDate;
      })
      .map((order) => {
        const directItems = getDirectPurchaseItems(order);
        return {
          order,
          directItemCount: directItems.length,
          funding: getOrderPurchaseFundingBreakdown(order, directItems),
        };
      })
      .filter((row) => row.directItemCount > 0)
      .sort(
        (left, right) =>
          right.funding.ownCapitalCop - left.funding.ownCapitalCop ||
          right.order.createdAtIso.localeCompare(left.order.createdAtIso)
      );

    const directTotals = rows.reduce(
      (totals, row) => {
        totals.saleTotalCop += row.funding.saleTotalCop;
        totals.productCostCop += row.funding.productCostCop;
        totals.shippingCostCop += row.funding.shippingCostCop;
        totals.totalPurchaseCostCop += row.funding.totalPurchaseCostCop;
        totals.customerContributionCop += row.funding.customerContributionCop;
        totals.ownCapitalCop += row.funding.ownCapitalCop;
        totals.totalPaidCop += row.funding.totalPaidCop;
        totals.paidAfterPurchaseCop += row.funding.paidAfterPurchaseCop;
        if (!row.funding.hasCompleteCosts) {
          totals.ordersWithIncompleteCosts += 1;
        }
        return totals;
      },
      {
        saleTotalCop: 0,
        productCostCop: 0,
        shippingCostCop: 0,
        totalPurchaseCostCop: 0,
        customerContributionCop: 0,
        ownCapitalCop: 0,
        totalPaidCop: 0,
        paidAfterPurchaseCop: 0,
        ordersWithIncompleteCosts: 0,
      }
    );

    const inventoryTotals = purchaseOrders
      .filter((order) => {
        const purchaseDate = getPurchaseOrderDate(order);
        return (
          order.statusCode === "received" &&
          purchaseDate >= fromDate &&
          purchaseDate <= toDate
        );
      })
      .reduce(
        (totals, order) => {
          order.items.forEach((item) => {
            totals.productCostCop += item.unitCostCop * item.quantity;
            totals.shippingCostCop += item.unitShippingCostCop * item.quantity;
          });
          return totals;
        },
        { productCostCop: 0, shippingCostCop: 0 }
      );
    const inventoryPurchaseCostCop =
      inventoryTotals.productCostCop + inventoryTotals.shippingCostCop;
    const totalPurchaseCostCop =
      directTotals.totalPurchaseCostCop + inventoryPurchaseCostCop;
    const ownCapitalCop = directTotals.ownCapitalCop + inventoryPurchaseCostCop;
    const customerContributionCop = directTotals.customerContributionCop;

    return {
      rows,
      customerPurchasesTotalCop: directTotals.saleTotalCop,
      productCostCop: directTotals.productCostCop + inventoryTotals.productCostCop,
      shippingCostCop:
        directTotals.shippingCostCop + inventoryTotals.shippingCostCop,
      totalPurchaseCostCop,
      customerContributionCop,
      customerContributionPercent:
        totalPurchaseCostCop > 0
          ? Math.round((customerContributionCop / totalPurchaseCostCop) * 10_000) / 100
          : 0,
      ownCapitalCop,
      ownCapitalPercent:
        totalPurchaseCostCop > 0
          ? Math.round((ownCapitalCop / totalPurchaseCostCop) * 10_000) / 100
          : 0,
      totalPaidCop: directTotals.totalPaidCop,
      paidAfterPurchaseCop: directTotals.paidAfterPurchaseCop,
      directOwnCapitalCop: directTotals.ownCapitalCop,
      inventoryPurchaseCostCop,
      ordersWithIncompleteCosts: directTotals.ordersWithIncompleteCosts,
    };
  }, [fromDate, hasValidRange, orders, purchaseOrders, toDate]);

  return (
    <main className="ops-page capital-report-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Informes</p>
          <h1>Capital invertido</h1>
          <p className="capital-report-intro">
            Cuanto costo comprar la mercancia y cuanto salio realmente del dinero de FerShop.
          </p>
        </div>
      </div>

      <section className="ops-card reports-filter-card">
        <div>
          <strong>Periodo de las compras</strong>
          <span>Pedidos creados y ordenes de inventario recibidas en estas fechas.</span>
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
        <p className="order-form-error" role="alert">La fecha inicial debe ser anterior o igual a la fecha final.</p>
      ) : (
        <>
          <article className="ops-card capital-report-sales-summary">
            <div>
              <span>Total de las compras</span>
              <strong>{formatCop(report.customerPurchasesTotalCop)}</strong>
            </div>
            <small>Valor total vendido a los clientes en los pedidos del periodo</small>
          </article>

          <section className="capital-report-hero-grid" aria-label="Resumen del capital">
            <article className="ops-card capital-report-hero-card capital-report-hero-card--capital">
              <span>Dinero propio invertido</span>
              <strong>{formatCop(report.ownCapitalCop)}</strong>
              <small>Lo que FerShop tuvo que completar para poder comprar</small>
            </article>
            <article className="ops-card capital-report-hero-card">
              <span>Costo total de las compras</span>
              <strong>{formatCop(report.totalPurchaseCostCop)}</strong>
              <small>Producto mas envio de todos los articulos comprados</small>
            </article>
            <article className="ops-card capital-report-hero-card capital-report-hero-card--shipping">
              <span>Dinero aportado por clientes</span>
              <strong>{formatCop(report.customerContributionCop)}</strong>
              <small>Anticipos disponibles al momento de comprar</small>
            </article>
            <article className="ops-card capital-report-hero-card capital-report-hero-card--risk">
              <span>Porcentaje de dinero propio</span>
              <strong>{percentFormatter.format(report.ownCapitalPercent)}%</strong>
              <div className="capital-report-percentage" aria-label={`${report.ownCapitalPercent}% dinero propio`}>
                <span style={{ width: `${Math.min(report.ownCapitalPercent, 100)}%` }} />
              </div>
              <small>Clientes aportaron {percentFormatter.format(report.customerContributionPercent)}%</small>
            </article>
          </section>

          <section className="ops-card capital-report-example">
            <div><span>Ejemplo de la formula</span><strong>{formatCop(300_000)} producto</strong></div>
            <b aria-hidden="true">+</b>
            <div><span>Envio</span><strong>{formatCop(20_000)}</strong></div>
            <b aria-hidden="true">-</b>
            <div><span>Abono cliente</span><strong>{formatCop(200_000)}</strong></div>
            <b aria-hidden="true">=</b>
            <div className="capital-report-example__result"><span>Dinero propio</span><strong>{formatCop(120_000)} · 37,5%</strong></div>
          </section>

          <section className="capital-report-secondary-grid">
            <article className="ops-card capital-report-metric-card"><span>Costo de productos</span><strong>{formatCop(report.productCostCop)}</strong></article>
            <article className="ops-card capital-report-metric-card"><span>Costo de envio incluido</span><strong>{formatCop(report.shippingCostCop)}</strong></article>
            <article className="ops-card capital-report-metric-card"><span>Total pagado en pedidos directos</span><strong>{formatCop(report.totalPaidCop)}</strong><small>Incluye pagos posteriores a la compra</small></article>
            <article className="ops-card capital-report-metric-card"><span>Recuperado despues de comprar</span><strong>{formatCop(report.paidAfterPurchaseCop)}</strong><small>No cambia la inversion inicial</small></article>
          </section>

          <section className="ops-card capital-report-explanation capital-report-explanation--funding">
            <div><span className="capital-report-formula-number">1</span><p><strong>Producto + envio</strong><small>Costo real para comprar</small></p></div>
            <span aria-hidden="true">-</span>
            <div><span className="capital-report-formula-number">2</span><p><strong>Anticipo del cliente</strong><small>Dinero disponible al comprar</small></p></div>
            <span aria-hidden="true">=</span>
            <div><span className="capital-report-formula-number">3</span><p><strong>Dinero propio</strong><small>Capital puesto por FerShop</small></p></div>
          </section>

          <p className="capital-report-method-note">
            Si un pedido no tiene fecha de compra registrada, el informe toma como aporte del cliente los pagos marcados como anticipo. Las compras de inventario se consideran financiadas completamente con dinero propio y no se vuelven a sumar cuando se vende la existencia.
          </p>

          {report.ordersWithIncompleteCosts > 0 ? (
            <p className="capital-report-warning" role="status">Hay {numberFormatter.format(report.ordersWithIncompleteCosts)} pedido(s) con productos sin costo registrado. El capital real sera mayor cuando se completen esos costos.</p>
          ) : null}

          <section className="ops-card ops-table-card capital-report-detail">
            <div className="ops-card__header"><div><h2>Dinero propio por pedido</h2><span>{numberFormatter.format(report.rows.length)} compra(s) directas</span></div></div>
            {report.rows.length ? (
              <div className="ops-table-scroll">
                <table className="ops-table capital-report-table capital-funding-table">
                  <thead><tr><th>Pedido y cliente</th><th>Productos</th><th>Total compra</th><th>Costo producto</th><th>Envio</th><th>Costo total</th><th>Cliente aporto</th><th>Dinero propio</th><th>% propio</th></tr></thead>
                  <tbody>
                    {report.rows.map(({ order, funding }) => (
                      <tr key={order.id}>
                        <td><Link href={`/admin/seguimiento?order=${order.id}`} className="ops-order-link">{order.id}</Link><strong>{order.customerName}</strong><small>{formatDate(getDateKey(order.createdAtIso))}</small></td>
                        <td>{order.productName}</td>
                        <td><strong>{formatCop(funding.saleTotalCop)}</strong></td>
                        <td>{funding.hasCompleteCosts ? formatCop(funding.productCostCop) : "Costo incompleto"}</td>
                        <td>{formatCop(funding.shippingCostCop)}</td>
                        <td><strong>{formatCop(funding.totalPurchaseCostCop)}</strong></td>
                        <td className="capital-report-client-value">{formatCop(funding.customerContributionCop)}</td>
                        <td className="capital-report-financed-value"><strong>{formatCop(funding.ownCapitalCop)}</strong></td>
                        <td><strong>{percentFormatter.format(funding.ownCapitalPercent)}%</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="ops-empty-state reports-empty-state"><h2>No hay compras directas en este periodo</h2></div>}
          </section>

          <section className="capital-report-source-grid capital-report-source-grid--three">
            <article className="ops-card capital-report-source-card"><span>Dinero propio en pedidos</span><strong>{formatCop(report.directOwnCapitalCop)}</strong><small>Capital completado para compras de clientes</small></article>
            <article className="ops-card capital-report-source-card"><span>Dinero propio en inventario</span><strong>{formatCop(report.inventoryPurchaseCostCop)}</strong><small>Ordenes de inventario recibidas en el periodo</small></article>
            <article className="ops-card capital-report-source-card"><span>Capital que sigue en existencias</span><strong>{formatCop(inventory.totalInventoryValueCop)}</strong><small>Valor actual de las unidades disponibles</small></article>
          </section>
        </>
      )}
    </main>
  );
}
