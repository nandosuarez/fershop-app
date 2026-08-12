"use client";

import { useState } from "react";

import { formatCop } from "@/lib/commerce";
import type {
  ExpenseCategory,
  ExpensePaymentSource,
  ExpenseSnapshot,
} from "@/lib/types";

interface ExpensesWorkbenchProps {
  initialSnapshot: ExpenseSnapshot;
}

interface ApiErrorPayload {
  message?: string;
}

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "box_shipping", label: "Envio de cajas" },
  { value: "packaging", label: "Empaque" },
  { value: "local_transport", label: "Transporte local" },
  { value: "marketing", label: "Publicidad" },
  { value: "operations", label: "Operacion" },
  { value: "other", label: "Otro" },
];

function getTodayInColombia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatExpenseDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(`${date}T12:00:00-05:00`));
}

function formatOrderDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function ExpensesWorkbench({ initialSnapshot }: ExpensesWorkbenchProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("box_shipping");
  const [amountCop, setAmountCop] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayInColombia);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const numericAmount = Math.max(Math.round(Number(amountCop) || 0), 0);
  const paymentSource: ExpensePaymentSource =
    category === "box_shipping" ? "shipping_fund" : "general";
  const willCreateDeficit =
    paymentSource === "shipping_fund" && numericAmount > snapshot.metrics.shippingFundBalanceCop;

  function resetForm() {
    setDescription("");
    setCategory("box_shipping");
    setAmountCop("");
    setExpenseDate(getTodayInColombia());
    setNote("");
    setError(null);
  }

  function openModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isSaving) {
      setIsModalOpen(false);
      setError(null);
    }
  }

  async function refreshSnapshot() {
    const response = await fetch("/api/expenses", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorPayload;
      throw new Error(payload.message || "No pudimos actualizar los gastos.");
    }
    const payload = (await response.json()) as { snapshot: ExpenseSnapshot };
    setSnapshot(payload.snapshot);
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Escribe el concepto del gasto.");
      return;
    }
    if (numericAmount <= 0) {
      setError("Escribe un valor mayor que cero.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          category,
          amountCop: numericAmount,
          paymentSource,
          expenseDate,
          note,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos guardar el gasto.");
      }
      await refreshSnapshot();
      setFeedback("Gasto registrado correctamente.");
      setIsModalOpen(false);
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el gasto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(expenseId: string, expenseDescription: string) {
    if (!window.confirm(`Eliminar el gasto "${expenseDescription}"?`)) {
      return;
    }
    setDeletingExpenseId(expenseId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos eliminar el gasto.");
      }
      await refreshSnapshot();
      setFeedback("Gasto eliminado correctamente.");
    } catch (caughtError) {
      setFeedback(caughtError instanceof Error ? caughtError.message : "No pudimos eliminar el gasto.");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  return (
    <>
      <main className="ops-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">Control de caja</p>
            <h1>Gastos</h1>
          </div>
          <button type="button" className="ops-button ops-button--primary" onClick={openModal}>
            <span aria-hidden="true">+</span> Registrar gasto
          </button>
        </div>

        {feedback ? (
          <p className="ops-success-notice" role="status">
            {feedback}
          </p>
        ) : null}

        <section className="expense-summary-grid" aria-label="Resumen de gastos">
          <article className="ops-card expense-summary-card">
            <span>Fondo acumulado</span>
            <strong>{formatCop(snapshot.metrics.shippingFundAccruedCop)}</strong>
            <small>Costo de envio reservado en ventas</small>
          </article>
          <article className="ops-card expense-summary-card">
            <span>Envios pagados</span>
            <strong>{formatCop(snapshot.metrics.shippingFundSpentCop)}</strong>
            <small>Descontado del fondo</small>
          </article>
          <article
            className={`ops-card expense-summary-card expense-summary-card--balance ${snapshot.metrics.shippingFundBalanceCop < 0 ? "is-negative" : ""}`}
          >
            <span>Saldo del fondo</span>
            <strong>{formatCop(snapshot.metrics.shippingFundBalanceCop)}</strong>
            <small>{snapshot.metrics.shippingFundBalanceCop < 0 ? "Faltante por cubrir" : "Disponible para proximos envios"}</small>
          </article>
          <article className="ops-card expense-summary-card">
            <span>Otros gastos</span>
            <strong>{formatCop(snapshot.metrics.generalExpensesCop)}</strong>
            <small>Pagados desde caja general</small>
          </article>
        </section>

        <div className="expense-workspace">
          <section className="ops-card ops-table-card expense-list-card">
            <div className="ops-card__header">
              <h2>Gastos registrados</h2>
              <strong>{formatCop(snapshot.metrics.totalExpensesCop)}</strong>
            </div>
            {snapshot.expenses.length ? (
              <div className="ops-table-scroll">
                <table className="ops-table expense-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Categoria</th>
                      <th>Pagado desde</th>
                      <th>Valor</th>
                      <th><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{formatExpenseDate(expense.expenseDate)}</td>
                        <td>
                          <strong>{expense.description}</strong>
                          {expense.note ? <small>{expense.note}</small> : null}
                        </td>
                        <td>{expense.categoryLabel}</td>
                        <td>
                          <span className={`expense-source expense-source--${expense.paymentSource}`}>
                            {expense.paymentSourceLabel}
                          </span>
                        </td>
                        <td><strong>{formatCop(expense.amountCop)}</strong></td>
                        <td>
                          <div className="product-row-actions">
                            <button
                              type="button"
                              disabled={deletingExpenseId === expense.id}
                              onClick={() => void handleDelete(expense.id, expense.description)}
                            >
                              {deletingExpenseId === expense.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="expense-empty-state">
                <strong>No hay gastos registrados</strong>
                <span>Usa Registrar gasto para agregar el primero.</span>
              </div>
            )}
          </section>

          <aside className="ops-card shipping-reconciliation">
            <div className="ops-card__header">
              <h2>Conciliacion de envios</h2>
            </div>
            <div className="shipping-reconciliation__totals">
              <div>
                <span>Aportes de productos</span>
                <strong>{formatCop(snapshot.metrics.shippingFundAccruedCop)}</strong>
              </div>
              <div>
                <span>Pagos de cajas</span>
                <strong>- {formatCop(snapshot.metrics.shippingFundSpentCop)}</strong>
              </div>
              <div className={snapshot.metrics.shippingFundBalanceCop < 0 ? "is-negative" : ""}>
                <span>Saldo</span>
                <strong>{formatCop(snapshot.metrics.shippingFundBalanceCop)}</strong>
              </div>
            </div>

            <div className="shipping-contributions">
              <div className="shipping-contributions__title">
                <strong>Aportes recientes</strong>
                <span>{snapshot.shippingContributions.length} movimientos</span>
              </div>
              {snapshot.shippingContributions.length ? (
                snapshot.shippingContributions.slice(0, 8).map((contribution) => (
                  <div key={contribution.id} className="shipping-contribution-row">
                    <div>
                      <strong>{contribution.orderId}</strong>
                      <span>{contribution.productName}</span>
                      <small>{formatOrderDate(contribution.orderCreatedAtIso)} · {contribution.quantity} unidad(es)</small>
                    </div>
                    <strong>+ {formatCop(contribution.amountCop)}</strong>
                  </div>
                ))
              ) : (
                <p className="shipping-contributions__empty">Los aportes apareceran al vender productos con costo de envio.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {isModalOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <form
            className="order-modal expense-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-form-title"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="order-modal__header">
              <h2 id="expense-form-title">Registrar gasto</h2>
              <button type="button" aria-label="Cerrar" onClick={closeModal}>&times;</button>
            </div>

            <div className="product-create-form expense-create-form">
              <label className="product-form-field product-form-field--wide">
                <span>Concepto</span>
                <input
                  autoFocus
                  value={description}
                  placeholder="Ej. Envio caja Miami a Colombia"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="product-form-field">
                <span>Categoria</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="product-form-field">
                <span>Fecha</span>
                <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
              </label>
              <label className="product-form-field product-form-field--wide">
                <span>Valor</span>
                <span className="product-money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountCop}
                    onChange={(event) => setAmountCop(event.target.value)}
                  />
                </span>
              </label>
              <div className="expense-payment-source product-form-field--wide">
                <span>Se descontara de</span>
                <strong>{paymentSource === "shipping_fund" ? "Fondo de envios" : "Caja general"}</strong>
              </div>
              {willCreateDeficit ? (
                <p className="expense-deficit-warning product-form-field--wide">
                  Este pago supera el saldo del fondo por {formatCop(numericAmount - snapshot.metrics.shippingFundBalanceCop)}. Se guardara y la conciliacion mostrara el faltante.
                </p>
              ) : null}
              <label className="product-form-field product-form-field--wide">
                <span>Nota (opcional)</span>
                <input value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
              {error ? <p className="order-form-error product-form-field--wide" role="alert">{error}</p> : null}
            </div>

            <div className="order-modal__footer">
              <span />
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ops-button ops-button--primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar gasto"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
