"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListSearch } from "@/components/list-search";
import { formatCop, getOrderProfitCop } from "@/lib/commerce";
import { matchesSearch } from "@/lib/search";
import type { DashboardOrder } from "@/lib/types";

interface OrdersWorkbenchProps {
  orders: DashboardOrder[];
  createdOrderId?: string;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function OrdersWorkbench({ orders, createdOrderId }: OrdersWorkbenchProps) {
  const [search, setSearch] = useState("");
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesSearch(search, [
          order.id,
          order.customerName,
          order.customerPhone,
          order.customerCity,
          order.productName,
          order.statusLabel,
          formatDate(order.createdAtIso),
          order.totalCop,
        ])
      ),
    [orders, search]
  );

  return (
    <main className="ops-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">{orders.length} abiertos</p>
          <h1>Pedidos</h1>
        </div>
        <Link href="/admin/nuevo-pedido" className="ops-button ops-button--primary">
          <span aria-hidden="true">+</span> Crear pedido
        </Link>
      </div>

      {createdOrderId ? (
        <div className="ops-success-notice" role="status">
          Pedido {createdOrderId} guardado correctamente.
        </div>
      ) : null}

      <section className="ops-card ops-table-card">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar pedido, cliente o producto"
          resultLabel={`${filteredOrders.length} resultado${filteredOrders.length === 1 ? "" : "s"}`}
        />
        {filteredOrders.length ? (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Utilidad</th>
                  <th>Pendiente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const profitCop = getOrderProfitCop(order);
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/seguimiento?order=${order.id}`} className="ops-order-link">
                          {order.id}
                        </Link>
                      </td>
                      <td>{order.customerName}</td>
                      <td>
                        <span className="ops-product-summary">{order.productName}</span>
                        <small>{order.quantity} unidad(es)</small>
                      </td>
                      <td>{formatDate(order.createdAtIso)}</td>
                      <td>{formatCop(order.totalCop)}</td>
                      <td>
                        {profitCop === null ? (
                          <span className="ops-profit ops-profit--unknown">Sin costo</span>
                        ) : (
                          <strong className={`ops-profit ${profitCop < 0 ? "ops-profit--negative" : ""}`}>
                            {formatCop(profitCop)}
                          </strong>
                        )}
                      </td>
                      <td>
                        <strong>{formatCop(order.dueTodayCop + order.dueOnArrivalCop)}</strong>
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
        ) : (
          <div className="ops-empty-state">
            <h2>{search ? "No encontramos pedidos" : "No hay pedidos abiertos"}</h2>
            {search ? (
              <button type="button" className="ops-button" onClick={() => setSearch("")}>
                Limpiar busqueda
              </button>
            ) : (
              <Link href="/admin/nuevo-pedido" className="ops-button ops-button--primary">
                Crear pedido
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
