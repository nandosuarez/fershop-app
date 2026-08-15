"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { formatCop, getOrderProfitCop } from "@/lib/commerce";
import type { DashboardOrder } from "@/lib/types";

interface ReportsWorkbenchProps {
  orders: DashboardOrder[];
  view: "range" | "monthly";
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

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00-05:00`));
}

function summarizeOrders(orders: DashboardOrder[]) {
  return orders.reduce(
    (summary, order) => {
      summary.totalSoldCop += order.totalCop;
      summary.totalUnits += order.quantity;
      summary.pendingCop += order.dueTodayCop + order.dueOnArrivalCop;
      summary.profitCop += getOrderProfitCop(order) ?? 0;
      return summary;
    },
    {
      totalSoldCop: 0,
      totalUnits: 0,
      pendingCop: 0,
      profitCop: 0,
    }
  );
}

export function ReportsWorkbench({ orders, view }: ReportsWorkbenchProps) {
  const today = getDateKey(new Date().toISOString());
  const currentYear = Number(today.slice(0, 4));
  const [fromDate, setFromDate] = useState(`${today.slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(today);
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
  const availableYears = useMemo(() => {
    const years = new Set(orders.map((order) => Number(getDateKey(order.createdAtIso).slice(0, 4))));
    years.add(currentYear);
    return [...years].sort((left, right) => right - left);
  }, [currentYear, orders]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const hasValidRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const rangeOrders = useMemo(
    () =>
      hasValidRange
        ? orders.filter((order) => {
            const orderDate = getDateKey(order.createdAtIso);
            return orderDate >= fromDate && orderDate <= toDate;
          })
        : [],
    [fromDate, hasValidRange, orders, toDate]
  );
  const rangeSummary = useMemo(() => summarizeOrders(rangeOrders), [rangeOrders]);
  const dailyRows = useMemo(() => {
    const ordersByDate = new Map<string, DashboardOrder[]>();
    rangeOrders.forEach((order) => {
      const dateKey = getDateKey(order.createdAtIso);
      ordersByDate.set(dateKey, [...(ordersByDate.get(dateKey) ?? []), order]);
    });
    return [...ordersByDate.entries()]
      .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
      .map(([dateKey, dayOrders]) => ({
        dateKey,
        dateLabel: formatDayLabel(dateKey),
        orders: dayOrders,
        summary: summarizeOrders(dayOrders),
      }));
  }, [rangeOrders]);
  const monthlyRows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const month = String(monthIndex + 1).padStart(2, "0");
        const monthOrders = orders.filter((order) =>
          getDateKey(order.createdAtIso).startsWith(`${selectedYear}-${month}`)
        );
        return {
          monthLabel: new Intl.DateTimeFormat("es-CO", { month: "long", timeZone }).format(
            new Date(`${selectedYear}-${month}-15T12:00:00-05:00`)
          ),
          orders: monthOrders,
          summary: summarizeOrders(monthOrders),
        };
      }),
    [orders, selectedYear]
  );
  const yearlySummary = useMemo(
    () => summarizeOrders(monthlyRows.flatMap((row) => row.orders)),
    [monthlyRows]
  );

  return (
    <main className="ops-page reports-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Informes</p>
          <h1>{view === "range" ? "Ventas por fechas" : "Resumen mensual"}</h1>
        </div>
      </div>

      {view === "range" ? (
        <>
          <section className="ops-card reports-filter-card">
            <div>
              <strong>Selecciona el rango</strong>
            </div>
            <div className="reports-date-fields">
              <label>
                <span>Desde</span>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </label>
              <label>
                <span>Hasta</span>
                <input
                  type="date"
                  value={toDate}
                  max={today}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>
            </div>
          </section>

          {!hasValidRange ? (
            <p className="order-form-error" role="alert">
              La fecha inicial debe ser anterior o igual a la fecha final.
            </p>
          ) : null}

          <section className="ops-stat-grid reports-stat-grid" aria-label="Resumen del rango">
            <article className="ops-stat-card">
              <span>Total vendido</span>
              <strong>{formatCop(rangeSummary.totalSoldCop)}</strong>
            </article>
            <article className="ops-stat-card">
              <span>Pedidos</span>
              <strong>{numberFormatter.format(rangeOrders.length)}</strong>
            </article>
            <article className="ops-stat-card">
              <span>Utilidad</span>
              <strong>{formatCop(rangeSummary.profitCop)}</strong>
            </article>
            <article className="ops-stat-card">
              <span>Pendiente por cobrar</span>
              <strong>{formatCop(rangeSummary.pendingCop)}</strong>
            </article>
          </section>

          <section className="ops-card ops-table-card reports-section">
            <div className="ops-card__header">
              <h2>Ventas agrupadas por dia</h2>
              <span>{numberFormatter.format(dailyRows.length)} dias</span>
            </div>
            {dailyRows.length ? (
              <div className="ops-table-scroll">
                <table className="ops-table reports-daily-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Pedidos</th>
                      <th>Unidades</th>
                      <th>Total vendido</th>
                      <th>Utilidad</th>
                      <th>Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((row) => {
                      const isExpanded = expandedDateKey === row.dateKey;
                      return (
                        <Fragment key={row.dateKey}>
                          <tr className={isExpanded ? "is-selected" : undefined}>
                            <td>
                              <button
                                type="button"
                                className="reports-day-button"
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedDateKey((current) =>
                                    current === row.dateKey ? null : row.dateKey
                                  )
                                }
                              >
                                <span>{row.dateLabel}</span>
                                <small>{isExpanded ? "Ocultar detalle" : "Ver detalle"}</small>
                              </button>
                            </td>
                            <td>{numberFormatter.format(row.orders.length)}</td>
                            <td>{numberFormatter.format(row.summary.totalUnits)}</td>
                            <td><strong>{formatCop(row.summary.totalSoldCop)}</strong></td>
                            <td>{formatCop(row.summary.profitCop)}</td>
                            <td>{formatCop(row.summary.pendingCop)}</td>
                          </tr>
                          {isExpanded ? (
                            <tr className="reports-inline-detail-row">
                              <td colSpan={6} className="reports-inline-detail-cell">
                                <div className="reports-inline-detail">
                                  <div className="ops-card__header reports-day-detail-header">
                                    <div>
                                      <span>Detalle del dia</span>
                                      <h2>{row.dateLabel}</h2>
                                    </div>
                                    <button
                                      type="button"
                                      className="ops-button"
                                      onClick={() => setExpandedDateKey(null)}
                                    >
                                      Cerrar
                                    </button>
                                  </div>
                                  <table className="ops-table reports-orders-table">
                                    <thead>
                                      <tr>
                                        <th>Pedido</th>
                                        <th>Cliente</th>
                                        <th>Productos</th>
                                        <th>Total</th>
                                        <th>Utilidad</th>
                                        <th>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.orders.map((order) => {
                                        const profitCop = getOrderProfitCop(order);
                                        return (
                                          <tr key={order.id}>
                                            <td>
                                              <Link
                                                href={`/admin/seguimiento?order=${order.id}`}
                                                className="ops-order-link"
                                              >
                                                {order.id}
                                              </Link>
                                            </td>
                                            <td>{order.customerName}</td>
                                            <td>{order.productName}</td>
                                            <td><strong>{formatCop(order.totalCop)}</strong></td>
                                            <td>
                                              {profitCop === null ? "Sin costo" : formatCop(profitCop)}
                                            </td>
                                            <td>
                                              <span className={`ops-status ops-status--${order.statusCode}`}>
                                                {order.statusLabel}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
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
                <h2>No hay ventas en este rango</h2>
              </div>
            )}
          </section>

        </>
      ) : (
        <section className="ops-card ops-table-card">
          <div className="ops-card__header reports-monthly-header">
            <div>
              <h2>Ventas por mes</h2>
              <span>Total anual: {formatCop(yearlySummary.totalSoldCop)}</span>
            </div>
            <label>
              <span>Anno</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ops-table-scroll">
            <table className="ops-table reports-monthly-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Pedidos</th>
                  <th>Unidades</th>
                  <th>Total vendido</th>
                  <th>Utilidad</th>
                  <th>Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.monthLabel}>
                    <td className="reports-month-name">{row.monthLabel}</td>
                    <td>{numberFormatter.format(row.orders.length)}</td>
                    <td>{numberFormatter.format(row.summary.totalUnits)}</td>
                    <td><strong>{formatCop(row.summary.totalSoldCop)}</strong></td>
                    <td>{formatCop(row.summary.profitCop)}</td>
                    <td>{formatCop(row.summary.pendingCop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
