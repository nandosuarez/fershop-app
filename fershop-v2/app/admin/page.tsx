import Link from "next/link";

import { formatCop, getOrderProfitCop } from "@/lib/commerce";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const snapshot = await getOperationsSnapshot();
  const openOrders = snapshot.orders.filter((order) => order.statusCode !== "delivered");
  const totalProfitCop = snapshot.orders.reduce(
    (total, order) => total + (getOrderProfitCop(order) ?? 0),
    0
  );

  return (
    <main className="ops-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Operacion</p>
          <h1>Inicio</h1>
        </div>
        <Link href="/admin/nuevo-pedido" className="ops-button ops-button--primary">
          <span aria-hidden="true">+</span> Crear pedido
        </Link>
      </div>

      <section className="ops-stat-grid" aria-label="Resumen">
        <article className="ops-stat-card">
          <span>Pedidos abiertos</span>
          <strong>{snapshot.metrics.activeOrders}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Pendiente por cobrar</span>
          <strong>{formatCop(snapshot.metrics.pendingTodayCop + snapshot.metrics.pendingArrivalCop)}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Utilidad total</span>
          <strong>{formatCop(totalProfitCop)}</strong>
        </article>
        <article className="ops-stat-card">
          <span>Listos para entrega</span>
          <strong>{snapshot.metrics.readyToDispatch}</strong>
        </article>
      </section>

      <section className="ops-card">
        <div className="ops-card__header">
          <h2>Pedidos recientes</h2>
          <Link href="/admin/pedidos" className="ops-text-link">
            Ver todos
          </Link>
        </div>
        <div className="ops-compact-list">
          <div className="ops-compact-list__head" aria-hidden="true">
            <span>Pedido</span>
            <span>Productos</span>
            <span>Pendiente</span>
            <span>Utilidad</span>
          </div>
          {openOrders.slice(0, 5).map((order) => (
            <Link key={order.id} href={`/admin/seguimiento?order=${order.id}`}>
              <div>
                <strong>{order.id}</strong>
                <span>{order.customerName}</span>
              </div>
              <div>
                <span>{order.productName}</span>
                <small>{order.statusLabel}</small>
              </div>
              <strong>{formatCop(order.dueTodayCop + order.dueOnArrivalCop)}</strong>
              {getOrderProfitCop(order) === null ? (
                <span className="ops-profit ops-profit--unknown">Sin costo</span>
              ) : (
                <strong
                  className={`ops-profit ${getOrderProfitCop(order)! < 0 ? "ops-profit--negative" : ""}`}
                >
                  {formatCop(getOrderProfitCop(order)!)}
                </strong>
              )}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
