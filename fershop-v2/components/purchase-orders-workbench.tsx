"use client";

import { useMemo, useState } from "react";

import { FormattedNumberInput } from "@/components/formatted-number-input";
import { ListSearch } from "@/components/list-search";
import { ProductPriceCalculator } from "@/components/product-price-calculator";
import { formatCop } from "@/lib/commerce";
import { matchesSearch } from "@/lib/search";
import type { Product, PurchaseOrder } from "@/lib/types";

interface PurchaseOrdersWorkbenchProps {
  products: Product[];
  initialPurchaseOrders: PurchaseOrder[];
}

interface DraftPurchaseLine {
  quantity: number;
  unitCostCop: number;
  unitShippingCostCop: number;
}

interface ApiErrorPayload {
  message?: string;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <span className="ops-product-thumb">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" />
      ) : (
        product.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export function PurchaseOrdersWorkbench({
  products,
  initialPurchaseOrders,
}: PurchaseOrdersWorkbenchProps) {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [orderSearch, setOrderSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [draftLines, setDraftLines] = useState<Record<string, DraftPurchaseLine>>({});
  const [checkedProductIds, setCheckedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [calculatorProductId, setCalculatorProductId] = useState<string | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedLines = useMemo(
    () =>
      catalogProducts.flatMap((product) => {
        const line = draftLines[product.id];
        return line ? [{ product, ...line }] : [];
      }),
    [catalogProducts, draftLines]
  );
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase("es");
    return query
      ? catalogProducts.filter((product) =>
          `${product.name} ${product.categoryLabel}`
            .toLocaleLowerCase("es")
            .includes(query)
        )
      : catalogProducts;
  }, [catalogProducts, productSearch]);
  const filteredPurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter((order) =>
        matchesSearch(orderSearch, [
          order.id,
          order.supplier,
          order.statusLabel,
          formatDate(order.createdAtIso),
          order.totalUnits,
          order.totalCostCop,
          ...order.items.map((item) => item.productName),
        ])
      ),
    [orderSearch, purchaseOrders]
  );
  const calculatorProduct = calculatorProductId
    ? catalogProducts.find((product) => product.id === calculatorProductId) ?? null
    : null;
  const draftTotal = selectedLines.reduce(
    (sum, line) =>
      sum + (line.unitCostCop + line.unitShippingCostCop) * line.quantity,
    0
  );
  const receivingOrder = receivingOrderId
    ? purchaseOrders.find((order) => order.id === receivingOrderId) ?? null
    : null;

  function openCreate() {
    setSupplier("");
    setDraftLines({});
    setCheckedProductIds([]);
    setProductSearch("");
    setError(null);
    setIsCreateOpen(true);
  }

  function closeCreate() {
    if (!isSaving) {
      setIsCreateOpen(false);
      setIsProductPickerOpen(false);
      setCalculatorProductId(null);
      setError(null);
    }
  }

  function openProductPicker() {
    setCheckedProductIds(Object.keys(draftLines));
    setProductSearch("");
    setError(null);
    setIsProductPickerOpen(true);
  }

  function toggleProduct(productId: string) {
    setCheckedProductIds((current) =>
      current.includes(productId)
        ? current.filter((candidate) => candidate !== productId)
        : [...current, productId]
    );
  }

  function confirmProducts() {
    setDraftLines((current) => {
      const next: Record<string, DraftPurchaseLine> = {};
      checkedProductIds.forEach((productId) => {
        const product = catalogProducts.find((candidate) => candidate.id === productId);
        if (!product) {
          return;
        }
        next[productId] = current[productId] ?? {
          quantity: 1,
          unitCostCop: product.costCop ?? 0,
          unitShippingCostCop: product.shippingCostCop ?? 0,
        };
      });
      return next;
    });
    setIsProductPickerOpen(false);
  }

  function updateLine(productId: string, patch: Partial<DraftPurchaseLine>) {
    setDraftLines((current) => {
      const line = current[productId];
      return line
        ? { ...current, [productId]: { ...line, ...patch } }
        : current;
    });
  }

  function removeLine(productId: string) {
    setDraftLines((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([candidate]) => candidate !== productId)
      )
    );
  }

  function handleProductUpdated(updatedProduct: Product) {
    setCatalogProducts((current) =>
      current.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
    setDraftLines((current) => {
      const line = current[updatedProduct.id];
      return line
        ? {
            ...current,
            [updatedProduct.id]: {
              ...line,
              unitCostCop: updatedProduct.costCop ?? 0,
              unitShippingCostCop: updatedProduct.shippingCostCop ?? 0,
            },
          }
        : current;
    });
    setCalculatorProductId(null);
  }

  async function createOrder() {
    if (!supplier.trim()) {
      setError("Escribe el proveedor.");
      return;
    }
    if (!selectedLines.length) {
      setError("Agrega al menos un producto.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier,
          items: selectedLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            unitCostCop: line.unitCostCop,
            unitShippingCostCop: line.unitShippingCostCop,
          })),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos crear la orden de compra.");
      }
      const payload = (await response.json()) as { purchaseOrder: PurchaseOrder };
      setPurchaseOrders((current) => [payload.purchaseOrder, ...current]);
      setFeedback(`${payload.purchaseOrder.id} fue creada y sus unidades ingresaron al inventario.`);
      setIsCreateOpen(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No pudimos crear la orden de compra."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function receiveOrder() {
    if (!receivingOrder) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/purchase-orders/${encodeURIComponent(receivingOrder.id)}/receive`,
        { method: "POST" }
      );
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos recibir la orden.");
      }
      const payload = (await response.json()) as { purchaseOrder: PurchaseOrder };
      setPurchaseOrders((current) =>
        current.map((order) =>
          order.id === payload.purchaseOrder.id ? payload.purchaseOrder : order
        )
      );
      setFeedback(`${payload.purchaseOrder.id} ingreso al inventario.`);
      setReceivingOrderId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos recibir la orden.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="ops-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">{purchaseOrders.length} ordenes</p>
            <h1>Ordenes de compra</h1>
          </div>
          <button type="button" className="ops-button ops-button--primary" onClick={openCreate}>
            <span aria-hidden="true">+</span> Nueva orden
          </button>
        </div>

        {feedback ? <p className="ops-success-notice" role="status">{feedback}</p> : null}
        {error && !isCreateOpen && !receivingOrder ? (
          <p className="order-form-error">{error}</p>
        ) : null}

        <section className="ops-card ops-table-card">
          <ListSearch
            value={orderSearch}
            onChange={setOrderSearch}
            placeholder="Buscar orden, proveedor o producto"
            resultLabel={`${filteredPurchaseOrders.length} resultado${filteredPurchaseOrders.length === 1 ? "" : "s"}`}
          />
          {filteredPurchaseOrders.length ? (
            <div className="ops-table-scroll">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Proveedor</th>
                    <th>Productos</th>
                    <th>Unidades</th>
                    <th>Costo total</th>
                    <th>Estado</th>
                    <th><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchaseOrders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.id}</strong><small>{formatDate(order.createdAtIso)}</small></td>
                      <td>{order.supplier}</td>
                      <td className="ops-product-summary">
                        {order.items
                          .map((item) => `${item.productName} x ${item.quantity}`)
                          .join(", ")}
                      </td>
                      <td>{order.totalUnits}</td>
                      <td><strong>{formatCop(order.totalCostCop)}</strong></td>
                      <td>
                        <span className={order.statusCode === "received" ? "inventory-badge is-available" : "inventory-badge is-pending"}>
                          {order.statusLabel}
                        </span>
                      </td>
                      <td>
                        {order.statusCode === "ordered" ? (
                          <div className="product-row-actions">
                            <button type="button" onClick={() => {
                              setError(null);
                              setReceivingOrderId(order.id);
                            }}>
                              Recibir inventario
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ops-empty-state">
              <strong>{orderSearch ? "No encontramos ordenes" : "No hay ordenes de compra"}</strong>
              {orderSearch ? (
                <button type="button" className="ops-button" onClick={() => setOrderSearch("")}>
                  Limpiar busqueda
                </button>
              ) : (
                <button type="button" className="ops-button ops-button--primary" onClick={openCreate}>
                  Crear primera orden
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {isCreateOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <form
            className="order-modal purchase-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-order-title"
            onSubmit={(event) => {
              event.preventDefault();
              void createOrder();
            }}
          >
            <div className="order-modal__header">
              <h2 id="purchase-order-title">Nueva orden de compra</h2>
              <button type="button" aria-label="Cerrar" onClick={closeCreate}>
                &times;
              </button>
            </div>

            <div className="purchase-order-form">
              <label className="product-form-field">
                <span>Proveedor</span>
                <input
                  autoFocus
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                />
              </label>

              <section className="purchase-order-products">
                <div className="purchase-order-products__header">
                  <h3>Productos</h3>
                  <button type="button" className="ops-button" onClick={openProductPicker}>
                    <span aria-hidden="true">+</span> Agregar producto
                  </button>
                </div>

                {selectedLines.length ? (
                  <div className="purchase-order-selected-list">
                    {selectedLines.map((line) => (
                      <div key={line.product.id} className="purchase-order-selected-row">
                        <ProductThumb product={line.product} />
                        <div className="purchase-order-selected-row__name">
                          <strong>{line.product.name}</strong>
                          <button
                            type="button"
                            className="product-price-edit-button"
                            onClick={() => setCalculatorProductId(line.product.id)}
                          >
                            Calcular precio
                          </button>
                        </div>
                        <label className="purchase-order-line-field">
                          <span>Cantidad</span>
                          <input
                            aria-label={`Cantidad de ${line.product.name}`}
                            type="number"
                            min={1}
                            step={1}
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.product.id, {
                                quantity: Math.max(
                                  1,
                                  Math.trunc(Number(event.target.value) || 1)
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="purchase-order-line-field">
                          <span>Costo unidad</span>
                          <FormattedNumberInput
                            aria-label={`Costo de ${line.product.name}`}
                            min={0}
                            value={line.unitCostCop}
                            onValueChange={(value) =>
                              updateLine(line.product.id, {
                                unitCostCop: value,
                              })
                            }
                          />
                        </label>
                        <label className="purchase-order-line-field">
                          <span>Envio unidad</span>
                          <FormattedNumberInput
                            aria-label={`Envio de ${line.product.name}`}
                            min={0}
                            value={line.unitShippingCostCop}
                            onValueChange={(value) =>
                              updateLine(line.product.id, {
                                unitShippingCostCop: value,
                              })
                            }
                          />
                        </label>
                        <div className="purchase-order-line-total">
                          <span>Total</span>
                          <strong>
                            {formatCop(
                              (line.unitCostCop + line.unitShippingCostCop) *
                                line.quantity
                            )}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="remove-line-button"
                          aria-label={`Quitar ${line.product.name}`}
                          onClick={() => removeLine(line.product.id)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="order-empty-products"
                    onClick={openProductPicker}
                  >
                    <span aria-hidden="true">+</span>
                    Agregar productos a la orden
                  </button>
                )}
              </section>

              {error ? <p className="order-form-error" role="alert">{error}</p> : null}
            </div>

            <div className="order-modal__footer">
              <strong>{formatCop(draftTotal)}</strong>
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={closeCreate}>
                  Cancelar
                </button>
                <button type="submit" className="ops-button ops-button--primary" disabled={isSaving || !selectedLines.length}>
                  {isSaving ? "Guardando..." : "Crear orden"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {isProductPickerOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <section
            className="order-modal order-modal--products"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-product-picker-title"
          >
            <div className="order-modal__header">
              <h2 id="purchase-product-picker-title">Seleccionar productos</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setIsProductPickerOpen(false)}>
                &times;
              </button>
            </div>
            <div className="order-modal__search">
              <span aria-hidden="true">&#9906;</span>
              <input
                autoFocus
                value={productSearch}
                placeholder="Buscar productos"
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            <div className="product-picker-head">
              <span>Producto</span>
              <span>Costo</span>
              <span>Precio venta</span>
            </div>
            <div className="product-picker-list">
              {filteredProducts.map((product) => (
                <label key={product.id} className="product-picker-row">
                  <input
                    type="checkbox"
                    checked={checkedProductIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <ProductThumb product={product} />
                  <span className="product-picker-row__name">{product.name}</span>
                  <small>
                    {formatCop((product.costCop ?? 0) + (product.shippingCostCop ?? 0))}
                  </small>
                  <strong>{formatCop(product.priceCop)}</strong>
                </label>
              ))}
            </div>
            <div className="order-modal__footer">
              <span>{checkedProductIds.length} seleccionado(s)</span>
              <div>
                <button type="button" className="ops-button" onClick={() => setIsProductPickerOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ops-button ops-button--primary"
                  disabled={!checkedProductIds.length}
                  onClick={confirmProducts}
                >
                  Agregar
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {receivingOrder ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="order-modal receive-order-modal" role="dialog" aria-modal="true" aria-labelledby="receive-order-title">
            <div className="order-modal__header">
              <h2 id="receive-order-title">Recibir {receivingOrder.id}</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setReceivingOrderId(null)}>&times;</button>
            </div>
            <div className="no-advance-confirm-body">
              <p>Se sumaran estas unidades al inventario disponible.</p>
              <div><span>Unidades que ingresan</span><strong>{receivingOrder.totalUnits}</strong></div>
              {error ? <p className="order-form-error" role="alert">{error}</p> : null}
            </div>
            <div className="order-modal__footer">
              <span />
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={() => setReceivingOrderId(null)}>Cancelar</button>
                <button type="button" className="ops-button ops-button--primary" disabled={isSaving} onClick={() => void receiveOrder()}>
                  {isSaving ? "Recibiendo..." : "Confirmar entrada"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {calculatorProduct ? (
        <ProductPriceCalculator
          product={calculatorProduct}
          onClose={() => setCalculatorProductId(null)}
          onUpdated={handleProductUpdated}
        />
      ) : null}
    </>
  );
}
