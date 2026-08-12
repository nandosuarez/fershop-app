"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatCop } from "@/lib/commerce";
import { getAvailableOperationalActions, getAvailablePaymentOptions } from "@/lib/operations";
import type { DashboardOrder } from "@/lib/types";

interface ApiErrorPayload {
  message?: string;
}

interface OrderApiPayload {
  order: DashboardOrder;
}

interface TrackingWorkbenchProps {
  initialOrderId?: string;
}

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function TrackingWorkbench({ initialOrderId = "" }: TrackingWorkbenchProps) {
  const [order, setOrder] = useState<DashboardOrder | null>(null);
  const [paymentAmountCop, setPaymentAmountCop] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"payment" | "action" | "comment" | "notification" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const paymentOptions = useMemo(() => (order ? getAvailablePaymentOptions(order) : []), [order]);
  const actions = useMemo(() => (order ? getAvailableOperationalActions(order) : []), [order]);
  const paidCop =
    order?.payments
      .filter((payment) => payment.statusCode === "received")
      .reduce((sum, payment) => sum + payment.amountCop, 0) ?? 0;
  const pendingCop = order ? order.dueTodayCop + order.dueOnArrivalCop : 0;
  const latestNotification = order?.notifications[0] ?? null;
  const pendingNotification = order?.notifications.find((notification) => notification.statusCode === "draft");

  useEffect(() => {
    if (!initialOrderId) {
      setError("No encontramos el numero del pedido.");
      setIsLoading(false);
      return;
    }
    void refreshOrder();
  }, [initialOrderId]);

  useEffect(() => {
    setPaymentAmountCop(0);
  }, [order?.id, order?.statusCode, order?.dueTodayCop, order?.dueOnArrivalCop]);

  async function refreshOrder() {
    setError(null);
    try {
      const response = await fetch(`/api/orders/${initialOrderId}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos cargar el pedido.");
      }
      const payload = (await response.json()) as OrderApiPayload;
      setOrder(payload.order);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos cargar el pedido.");
    } finally {
      setIsLoading(false);
    }
  }

  async function postOrderChange(
    endpoint: string,
    body: Record<string, unknown> | undefined,
    action: typeof busyAction,
    successMessage: string
  ) {
    if (!order) {
      return;
    }
    setBusyAction(action);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/${endpoint}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos guardar el cambio.");
      }
      const payload = (await response.json()) as OrderApiPayload;
      setOrder(payload.order);
      setFeedback(successMessage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el cambio.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePayment() {
    const option = paymentOptions[0];
    if (!option || paymentAmountCop <= 0) {
      setError("Escribe el valor recibido.");
      return;
    }
    await postOrderChange(
      "payments",
      { kind: option.kind, amountCop: paymentAmountCop },
      "payment",
      "Pago registrado."
    );
  }

  async function handleOperationalAction() {
    const action = actions[0];
    if (!action) {
      return;
    }
    await postOrderChange(
      "actions",
      { actionType: action.type },
      "action",
      `${action.label} registrado.`
    );
  }

  async function handleComment() {
    if (!comment.trim()) {
      return;
    }
    await postOrderChange(
      "comments",
      { comment, author: "Jose FerShop" },
      "comment",
      "Comentario publicado."
    );
    setComment("");
  }

  async function handleNotification() {
    await postOrderChange("notifications", undefined, "notification", "Cliente marcado como notificado.");
  }

  if (isLoading) {
    return <div className="ops-card order-detail-loading">Cargando pedido...</div>;
  }

  if (!order) {
    return (
      <div className="ops-card ops-empty-state">
        <h2>No pudimos abrir este pedido</h2>
        {error ? <p>{error}</p> : null}
        <Link href="/admin/pedidos" className="ops-button">Volver a pedidos</Link>
      </div>
    );
  }

  const items = order.items ?? [];
  const timeline = [...order.timeline].reverse();

  return (
    <>
      <header className="order-detail-header">
        <div className="order-detail-heading">
          <Link href="/admin/pedidos" aria-label="Volver a pedidos">&larr;</Link>
          <div>
            <div className="order-detail-heading__title">
              <h1>Pedido {order.id}</h1>
              <span className={`ops-status ops-status--${order.statusCode}`}>{order.statusLabel}</span>
            </div>
            <p>{formatOrderDate(order.createdAtIso)} · {order.customerName}</p>
          </div>
        </div>
        <Link
          href={`/admin/nuevo-pedido?editar=${encodeURIComponent(order.id)}`}
          className="ops-button"
        >
          Editar pedido
        </Link>
      </header>

      {feedback ? <div className="ops-success-notice order-detail-notice" role="status">{feedback}</div> : null}
      {error ? <div className="order-form-error order-detail-notice" role="alert">{error}</div> : null}

      <div className="order-detail-grid">
        <div className="order-detail-main">
          <section className="ops-card order-status-card">
            <div className="order-status-card__top">
              <div>
                <span className="order-detail-label">Estado actual</span>
                <strong>{order.currentStageTitle}</strong>
              </div>
              <span className={`ops-status ops-status--${order.statusCode}`}>{order.statusLabel}</span>
            </div>

            <div className="order-next-step">
              <span>Siguiente paso</span>
              <strong>{order.nextActionLabel}</strong>
              {actions[0] ? (
                <button
                  type="button"
                  className="ops-button ops-button--primary"
                  disabled={busyAction !== null}
                  onClick={() => void handleOperationalAction()}
                >
                  {busyAction === "action" ? "Guardando..." : actions[0].label}
                </button>
              ) : null}
            </div>

            <div className="order-detail-products">
              {items.map((item) => (
                <div key={item.productId} className="order-detail-product">
                  <span className="ops-product-thumb">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      item.productName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div>
                    <strong>{item.productName}</strong>
                    <small>
                      {item.saleMode === "preorder" ? "Pago 50/50" : "Salida de inventario"}
                    </small>
                  </div>
                  <span>{formatCop(item.unitPriceCop)} × {item.quantity}</span>
                  <strong>{formatCop(item.lineTotalCop)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="ops-card order-payment-card">
            <div className="order-detail-card-header">
              <div>
                <span className={pendingCop > 0 ? "order-payment-badge is-pending" : "order-payment-badge is-paid"}>
                  {pendingCop > 0 ? "Pago pendiente" : "Pagado"}
                </span>
                <h2>Pago</h2>
              </div>
            </div>
            <div className="order-payment-summary">
              <div><span>Total</span><strong>{formatCop(order.totalCop)}</strong></div>
              <div><span>Pagado</span><strong>{formatCop(paidCop)}</strong></div>
              <div className="order-payment-summary__pending"><span>Pendiente</span><strong>{formatCop(pendingCop)}</strong></div>
            </div>
            {paymentOptions[0] ? (
              <div className="order-payment-action">
                <label>
                  <span>Pago recibido</span>
                  <span className="money-input">
                    <span>$</span>
                    <input
                      type="number"
                      min={1}
                      max={pendingCop}
                      step={1000}
                      value={paymentAmountCop || ""}
                      onChange={(event) => setPaymentAmountCop(Math.max(0, Number(event.target.value) || 0))}
                    />
                  </span>
                </label>
                <button
                  type="button"
                  className="ops-button ops-button--primary"
                  disabled={busyAction !== null}
                  onClick={() => void handlePayment()}
                >
                  {busyAction === "payment" ? "Guardando..." : "Registrar pago"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="order-timeline-section">
            <h2>Cronologia</h2>
            <div className="ops-card order-comment-box">
              <span className="ops-avatar">JF</span>
              <textarea
                rows={2}
                maxLength={1000}
                value={comment}
                placeholder="Deja un comentario del seguimiento..."
                onChange={(event) => setComment(event.target.value)}
              />
              <button
                type="button"
                className="ops-button ops-button--primary"
                disabled={!comment.trim() || busyAction !== null}
                onClick={() => void handleComment()}
              >
                {busyAction === "comment" ? "Publicando..." : "Publicar"}
              </button>
            </div>

            <div className="order-timeline">
              {timeline.map((event) => (
                <article key={event.id} className={event.type === "comment" ? "order-timeline-item is-comment" : "order-timeline-item"}>
                  <span className="order-timeline-item__dot" />
                  <div>
                    <div className="order-timeline-item__header">
                      <strong>{event.title}</strong>
                      <small>{event.atLabel}</small>
                    </div>
                    <p>{event.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="order-detail-side">
          <section className="ops-card order-side-card">
            <div className="order-detail-card-header"><h2>Cliente</h2></div>
            <div className="order-side-card__body">
              <strong className="order-customer-name">{order.customerName}</strong>
              <div>
                <h3>Informacion de contacto</h3>
                {order.customerEmail ? <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a> : null}
                <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
              </div>
              <div>
                <h3>Direccion de envio</h3>
                <p>{order.customerAddress || order.customerCity}</p>
              </div>
            </div>
          </section>

          <section className="ops-card order-side-card">
            <div className="order-detail-card-header">
              <h2>Notificacion</h2>
              <span className={pendingNotification ? "notification-state is-pending" : "notification-state is-sent"}>
                {pendingNotification ? "Pendiente" : "Notificado"}
              </span>
            </div>
            <div className="order-side-card__body notification-detail">
              {latestNotification ? (
                <>
                  <div>
                    <h3>{latestNotification.triggerLabel}</h3>
                    <p>{latestNotification.channelLabel} · {latestNotification.sentAtLabel}</p>
                  </div>
                  <p>{latestNotification.messagePreview}</p>
                  {pendingNotification ? (
                    <button
                      type="button"
                      className="ops-button"
                      disabled={busyAction !== null}
                      onClick={() => void handleNotification()}
                    >
                      {busyAction === "notification" ? "Guardando..." : "Marcar como notificado"}
                    </button>
                  ) : null}
                </>
              ) : (
                <p>No hay notificaciones registradas.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
