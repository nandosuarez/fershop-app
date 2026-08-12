import { workflowBlueprint } from "@/lib/catalog";
import { formatCop, getPaymentPolicyLabel, getSaleModeLabel } from "@/lib/commerce";
import type { OperationsSnapshot } from "@/lib/types";

interface AdminDashboardProps {
  snapshot: OperationsSnapshot;
}

export function AdminDashboard({ snapshot }: AdminDashboardProps) {
  const { orders, metrics } = snapshot;
  const focusOrder = orders.find((order) => order.statusCode !== "delivered") ?? orders[0];

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-mark">FS</span>
          <div>
            <strong>Centro operativo</strong>
            <small>Pedidos, pagos y seguimiento</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Modulos">
          <a href="#dashboard">Resumen</a>
          <a href="#workflow">Flujo</a>
          <a href="/admin/nuevo-pedido">Nuevo pedido</a>
          <a href="/admin/seguimiento">Seguimiento</a>
          <a href="#messages">Mensajes</a>
          <a href="#payments">Pagos</a>
        </nav>
      </aside>

      <div className="admin-main">
        <section id="dashboard" className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Operacion primero</p>
              <h1>Backend operativo para mover los pedidos que llegan por WhatsApp.</h1>
            </div>
            <span className="status-pill">Base operativa viva</span>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Pedidos activos</span>
              <strong>{metrics.activeOrders}</strong>
              <small>Casos que todavia necesitan una accion del equipo.</small>
            </article>
            <article className="metric-card">
              <span>Pendiente por cobrar hoy</span>
              <strong>{formatCop(metrics.pendingTodayCop)}</strong>
              <small>Lo que aun falta recaudar para liberar compras o despachos.</small>
            </article>
            <article className="metric-card">
              <span>Saldo futuro pendiente</span>
              <strong>{formatCop(metrics.pendingArrivalCop)}</strong>
              <small>Lo que sigue vivo para cuando esas compras lleguen a Colombia.</small>
            </article>
            <article className="metric-card">
              <span>Mensajes registrados</span>
              <strong>{metrics.notificationsLogged}</strong>
              <small>Notificaciones listas para apoyar el flujo por WhatsApp.</small>
            </article>
            <article className="metric-card">
              <span>Listos para compra</span>
              <strong>{metrics.readyToSource}</strong>
              <small>Pedidos con anticipo completo que ya pueden pasar a origen.</small>
            </article>
            <article className="metric-card">
              <span>Listos para entrega</span>
              <strong>{metrics.readyToDispatch}</strong>
              <small>Pedidos que ya pueden cerrarse con entrega o despacho.</small>
            </article>
          </div>
        </section>

        <section id="workflow" className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Flujo operativo</p>
              <h2>La secuencia que debe respetar el equipo</h2>
            </div>
            <p className="admin-panel__support">
              Pedido, cobro, compra, llegada, saldo y entrega. Cada paso ya vive en el backend.
            </p>
          </div>

          <div className="admin-cta-row">
            <a href="/admin/nuevo-pedido" className="primary-button">
              Crear pedido real
            </a>
            <a href="/admin/seguimiento" className="ghost-button">
              Mover un pedido en el flujo
            </a>
          </div>

          <div className="workflow-grid">
            {workflowBlueprint.map((step, index) => (
              <article key={step.key} className="workflow-step-card">
                <span className="workflow-step-card__index">{index + 1}</span>
                <div>
                  <p className="admin-eyebrow">{step.owner}</p>
                  <h3>{step.title}</h3>
                </div>
                <strong>{step.triggerLabel}</strong>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="queue" className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <p className="admin-eyebrow">Cola operativa</p>
              <h2>Que esta pidiendo el negocio ahora mismo</h2>
            </div>
          </div>

          {orders.length > 0 ? (
            <div className="order-board">
              {orders.map((order) => (
                <article key={order.id} className="order-card">
                  <div className="order-card__head">
                    <strong>{order.id}</strong>
                    <span>{order.statusLabel}</span>
                  </div>
                  <h3>{order.productName}</h3>
                  <p>
                    {order.customerName} | {order.customerCity}
                  </p>
                  <dl>
                    <div>
                      <dt>Modo</dt>
                      <dd>{getSaleModeLabel(order.saleMode)}</dd>
                    </div>
                    <div>
                      <dt>Pagos</dt>
                      <dd>{getPaymentPolicyLabel(order.paymentPolicy)}</dd>
                    </div>
                    <div>
                      <dt>Pendiente hoy</dt>
                      <dd>{formatCop(order.dueTodayCop)}</dd>
                    </div>
                    <div>
                      <dt>Saldo vivo</dt>
                      <dd>{formatCop(order.dueOnArrivalCop)}</dd>
                    </div>
                  </dl>
                  <strong className="order-card__next">{order.nextActionLabel}</strong>
                  <small>{order.etaLabel}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-card empty-card--compact">
              <h3>No hay pedidos cargados</h3>
              <p>El backend aun no tiene casos. Puedes crear el primero desde Nuevo pedido.</p>
            </div>
          )}
        </section>

        {focusOrder ? (
          <>
            <section id="focus-order" className="admin-panel">
              <div className="admin-panel__head">
                <div>
                  <p className="admin-eyebrow">Pedido en foco</p>
                  <h2>
                    {focusOrder.id} - {focusOrder.productName}
                  </h2>
                </div>
                <span className="status-pill">{focusOrder.currentStageTitle}</span>
              </div>

              <div className="focus-grid">
                <article className="detail-card focus-card">
                  <p className="admin-eyebrow">Resumen del caso</p>
                  <h3>Operacion del pedido</h3>
                  <div className="summary-grid">
                    <div>
                      <span>Clienta</span>
                      <strong>{focusOrder.customerName}</strong>
                      <small>{focusOrder.customerPhone}</small>
                    </div>
                    <div>
                      <span>Responsable</span>
                      <strong>{focusOrder.assignedTo}</strong>
                      <small>{focusOrder.statusLabel}</small>
                    </div>
                    <div>
                      <span>Pendiente hoy</span>
                      <strong>{formatCop(focusOrder.dueTodayCop)}</strong>
                      <small>Meta inicial: {formatCop(focusOrder.plannedDueTodayCop)}</small>
                    </div>
                    <div>
                      <span>Saldo futuro</span>
                      <strong>{formatCop(focusOrder.dueOnArrivalCop)}</strong>
                      <small>Meta final: {formatCop(focusOrder.plannedDueOnArrivalCop)}</small>
                    </div>
                  </div>

                  <div className="action-box">
                    <span>Siguiente accion</span>
                    <strong>{focusOrder.nextActionLabel}</strong>
                    <p>
                      El backend ya sabe en que etapa esta este pedido y que mensaje deberia salir despues.
                    </p>
                  </div>
                </article>

                <article className="detail-card focus-card">
                  <p className="admin-eyebrow">Timeline</p>
                  <h3>Todo lo que ya quedo registrado</h3>
                  <div className="timeline-list">
                    {focusOrder.timeline.map((event) => (
                      <div
                        key={event.id}
                        className={event.completed ? "timeline-item is-complete" : "timeline-item"}
                      >
                        <span className="timeline-item__dot" />
                        <div>
                          <strong>{event.title}</strong>
                          <small>{event.atLabel}</small>
                          <p>{event.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section className="admin-panel admin-panel--split">
              <article id="messages" className="detail-card">
                <p className="admin-eyebrow">Mensajes al cliente</p>
                <h3>Que se envio o quedo listo</h3>
                <div className="log-list">
                  {focusOrder.notifications.map((notification) => (
                    <div key={notification.id} className="log-row">
                      <div>
                        <strong>{notification.triggerLabel}</strong>
                        <small>
                          {notification.channelLabel} - {notification.sentAtLabel}
                        </small>
                      </div>
                      <span>{notification.statusLabel}</span>
                      <p>{notification.messagePreview}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article id="payments" className="detail-card">
                <p className="admin-eyebrow">Pagos del pedido</p>
                <h3>Anticipo, pago total o saldo</h3>
                <div className="log-list">
                  {focusOrder.payments.length > 0 ? (
                    focusOrder.payments.map((payment) => (
                      <div key={payment.id} className="log-row">
                        <div>
                          <strong>{payment.kind === "advance" ? "Cobro inicial" : "Segundo pago"}</strong>
                          <small>{payment.recordedAtLabel}</small>
                        </div>
                        <span>{payment.statusLabel}</span>
                        <p>
                          {formatCop(payment.amountCop)} - {payment.note}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="log-row">
                      <div>
                        <strong>Sin pagos registrados</strong>
                        <small>El pedido sigue esperando su primer movimiento de caja.</small>
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <article className="detail-card">
                <p className="admin-eyebrow">Reglas del sistema</p>
                <h3>Como esta pensando FerShop el backend</h3>
                <ul>
                  <li>Si el producto es inmediato, el cobro inicial cubre el 100% del pedido.</li>
                  <li>Si el producto es por encargo, el backend exige anticipo antes de registrar compra.</li>
                  <li>La llegada a Colombia abre el segundo pago y deja trazado el mensaje correcto.</li>
                  <li>La entrega solo se puede cerrar cuando el pedido ya esta listo para despacho.</li>
                  <li>Todos los cambios quedan guardados con pagos, timeline y notificaciones.</li>
                </ul>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
