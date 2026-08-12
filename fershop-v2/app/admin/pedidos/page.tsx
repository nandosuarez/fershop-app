import Link from "next/link";

import { formatCop, getOrderProfitCop } from "@/lib/commerce";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string }>;
}) {
  const params = await searchParams;
  const snapshot = await getOperationsSnapshot();
  const orders = snapshot.orders.filter((order) => order.statusCode !== "delivered");

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

      {params.creado ? (
        <div className="ops-success-notice" role="status">
          Pedido {params.creado} guardado correctamente.
        </div>
      ) : null}

      <section className="ops-card ops-table-card">
        {orders.length ? (
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
                {orders.map((order) => (
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
                      {getOrderProfitCop(order) === null ? (
                        <span className="ops-profit ops-profit--unknown">Sin costo</span>
                      ) : (
                        <strong
                          className={`ops-profit ${getOrderProfitCop(order)! < 0 ? "ops-profit--negative" : ""}`}
                        >
                          {formatCop(getOrderProfitCop(order)!)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ops-empty-state">
            <h2>No hay pedidos abiertos</h2>
            <Link href="/admin/nuevo-pedido" className="ops-button ops-button--primary">
              Crear pedido
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
