"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ProductPriceCalculator } from "@/components/product-price-calculator";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { formatCop } from "@/lib/commerce";
import type {
  CartItem,
  Customer,
  DashboardOrder,
  InventoryItem,
  OperationMutationResult,
  Product,
} from "@/lib/types";

interface ApiErrorPayload {
  message?: string;
}

function getOrderDateValue(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Bogota",
    })
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <span className="ops-product-thumb">
      {imageUrl ? <img src={imageUrl} alt="" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

interface NewOrderWorkbenchProps {
  products: Product[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  initialOrder?: DashboardOrder;
}

export function NewOrderWorkbench({
  products,
  customers,
  inventoryItems,
  initialOrder,
}: NewOrderWorkbenchProps) {
  const router = useRouter();
  const isEditing = Boolean(initialOrder);
  const cancelHref = initialOrder
    ? `/admin/seguimiento?order=${encodeURIComponent(initialOrder.id)}`
    : "/admin/pedidos";
  const [catalogProducts, setCatalogProducts] = useState(() =>
    products.map((product) => {
      const orderItem = initialOrder?.items?.find((item) => item.productId === product.id);
      return orderItem
        ? {
            ...product,
            priceCop: orderItem.unitPriceCop,
            costCop: orderItem.unitCostCop ?? product.costCop,
            shippingCostCop: orderItem.unitShippingCostCop ?? product.shippingCostCop,
            imageUrl: orderItem.imageUrl ?? product.imageUrl,
            tracksInventory: orderItem.saleMode === "immediate",
            saleMode: orderItem.saleMode,
            paymentPolicy: orderItem.paymentPolicy,
          }
        : product;
    })
  );
  const [items, setItems] = useState<CartItem[]>(() =>
    initialOrder?.items?.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })) ?? []
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (!initialOrder) {
      return null;
    }
    return (
      customers.find(
        (customer) =>
          customer.id === initialOrder.customerId ||
          customer.fullName.toLocaleLowerCase("es") ===
            initialOrder.customerName.toLocaleLowerCase("es")
      ) ?? {
        id: initialOrder.customerId ?? `order-${initialOrder.id}`,
        fullName: initialOrder.customerName,
        email: initialOrder.customerEmail ?? "",
        phone: initialOrder.customerPhone,
        address: initialOrder.customerAddress ?? "Por confirmar",
        city: initialOrder.customerCity,
        department: "",
        country: "Colombia",
      }
    );
  });
  const [paymentReceivedCop, setPaymentReceivedCop] = useState(0);
  const todayDate = getOrderDateValue(new Date().toISOString());
  const [orderDate, setOrderDate] = useState(() =>
    initialOrder ? getOrderDateValue(initialOrder.createdAtIso) : todayDate
  );
  const [purchaseWithoutAdvance, setPurchaseWithoutAdvance] = useState(
    Boolean(initialOrder?.purchaseWithoutAdvance)
  );
  const [activeModal, setActiveModal] = useState<"products" | "customers" | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [checkedProductIds, setCheckedProductIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingWithoutAdvance, setIsConfirmingWithoutAdvance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatorProductId, setCalculatorProductId] = useState<string | null>(null);

  const inventoryByProduct = useMemo(
    () => new Map(inventoryItems.map((item) => [item.product.id, item.availableQuantity])),
    [inventoryItems]
  );

  function getAvailableQuantity(productId: string) {
    const currentOrderQuantity =
      initialOrder?.items?.find((item) => item.productId === productId)?.quantity ?? 0;
    return (inventoryByProduct.get(productId) ?? 0) + currentOrderQuantity;
  }

  function productTracksInventory(productId: string) {
    return Boolean(
      catalogProducts.find((product) => product.id === productId)?.tracksInventory
    );
  }

  const selectedLines = useMemo(
    () =>
      items.flatMap((item) => {
        const product = catalogProducts.find((candidate) => candidate.id === item.productId);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    [catalogProducts, items]
  );

  const calculatorProduct = calculatorProductId
    ? catalogProducts.find((product) => product.id === calculatorProductId) ?? null
    : null;

  const totalCop = selectedLines.reduce(
    (sum, line) => sum + line.product.priceCop * line.quantity,
    0
  );
  const hasSelectedProducts = selectedLines.length > 0;
  const recordedPaidCop =
    initialOrder?.payments
      .filter((payment) => payment.statusCode === "received")
      .reduce((sum, payment) => sum + payment.amountCop, 0) ?? 0;
  const pendingCop = Math.max(
    totalCop - (isEditing ? recordedPaidCop : paymentReceivedCop),
    0
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase("es");
    if (!query) {
      return catalogProducts;
    }
    return catalogProducts.filter((product) =>
      `${product.name} ${product.categoryLabel}`.toLocaleLowerCase("es").includes(query)
    );
  }, [catalogProducts, productSearch]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase("es");
    if (!query) {
      return customers;
    }
    return customers.filter((customer) =>
      `${customer.fullName} ${customer.email} ${customer.phone}`
        .toLocaleLowerCase("es")
        .includes(query)
    );
  }, [customerSearch, customers]);

  function openProductSelector() {
    setCheckedProductIds(items.map((item) => item.productId));
    setProductSearch("");
    setActiveModal("products");
  }

  function confirmProducts() {
    setItems((current) =>
      checkedProductIds
        .filter(
          (productId) =>
            !productTracksInventory(productId) ||
            getAvailableQuantity(productId) > 0 ||
            current.some((item) => item.productId === productId)
        )
        .map((productId) => {
          const currentQuantity =
            current.find((item) => item.productId === productId)?.quantity ?? 1;
          return {
            productId,
            quantity: productTracksInventory(productId)
              ? Math.min(currentQuantity, Math.max(getAvailableQuantity(productId), 1))
              : currentQuantity,
          };
        })
    );
    setActiveModal(null);
  }

  function toggleProduct(productId: string) {
    setCheckedProductIds((current) =>
      current.includes(productId)
        ? current.filter((candidate) => candidate !== productId)
        : !productTracksInventory(productId) || getAvailableQuantity(productId) > 0
          ? [...current, productId]
          : current
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: productTracksInventory(productId)
                ? Math.min(
                    Math.max(1, Math.trunc(quantity || 1)),
                    Math.max(getAvailableQuantity(productId), 1)
                  )
                : Math.max(1, Math.trunc(quantity || 1)),
            }
          : item
      )
    );
  }

  function removeProduct(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleSubmit(confirmedWithoutAdvance = false) {
    if (!items.length) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (!selectedCustomer) {
      setError("Selecciona un cliente.");
      return;
    }
    if (!orderDate || orderDate > todayDate) {
      setError("Selecciona una fecha valida para el pedido.");
      return;
    }
    if (!isEditing && paymentReceivedCop > totalCop) {
      setError("El pago recibido no puede superar el total.");
      return;
    }
    if (isEditing && totalCop < recordedPaidCop) {
      setError(`El total no puede quedar por debajo de ${formatCop(recordedPaidCop)} ya pagados.`);
      return;
    }
    if (
      !isEditing &&
      hasSelectedProducts &&
      purchaseWithoutAdvance &&
      paymentReceivedCop === 0 &&
      !confirmedWithoutAdvance
    ) {
      setError(null);
      setIsConfirmingWithoutAdvance(true);
      return;
    }

    setIsSubmitting(true);
    setIsConfirmingWithoutAdvance(false);
    setError(null);

    try {
      const response = await fetch(
        initialOrder ? `/api/orders/${encodeURIComponent(initialOrder.id)}` : "/api/orders",
        {
        method: initialOrder ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedLines.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPriceCop: product.priceCop,
          })),
          orderDate,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.fullName,
          customerEmail: selectedCustomer.email,
          customerPhone: selectedCustomer.phone,
          customerAddress: `${selectedCustomer.address}, ${selectedCustomer.city}, ${selectedCustomer.department}`,
          customerCity: selectedCustomer.city,
          actualInitialPaymentCop: paymentReceivedCop,
          purchaseWithoutAdvance: hasSelectedProducts && purchaseWithoutAdvance,
        }),
        }
      );

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos guardar el pedido.");
      }

      const result = (await response.json()) as OperationMutationResult;
      router.push(
        initialOrder
          ? `/admin/seguimiento?order=${encodeURIComponent(result.order.id)}`
          : `/admin/pedidos?creado=${encodeURIComponent(result.order.id)}`
      );
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="ops-page order-create-page">
        <form
          id="new-order-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="order-create-header">
            <div className="order-create-title">
              <Link href={cancelHref} aria-label={isEditing ? "Volver al pedido" : "Volver a pedidos"}>
                <span aria-hidden="true">&larr;</span>
              </Link>
              <div>
                <p className="ops-kicker">Pedidos</p>
                <h1>{initialOrder ? `Editar ${initialOrder.id}` : "Crear pedido"}</h1>
              </div>
            </div>
            <div className="order-create-actions">
              <Link href={cancelHref} className="ops-button">
                Cancelar
              </Link>
              <button type="submit" className="ops-button ops-button--primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : initialOrder
                    ? "Guardar cambios"
                    : "Guardar pedido"}
              </button>
            </div>
          </div>

          <div className="order-create-grid">
            <div className="order-create-main">
              <section className="order-section">
                <div className="order-section__header">
                  <h2>Productos</h2>
                  <button type="button" className="ops-button" onClick={openProductSelector}>
                    <span aria-hidden="true">+</span> Agregar producto
                  </button>
                </div>

                {selectedLines.length ? (
                  <div className="selected-product-list">
                    {selectedLines.map(({ product, quantity }) => (
                      <div key={product.id} className="selected-product-row">
                        <ProductThumb name={product.name} imageUrl={product.imageUrl} />
                        <div className="selected-product-row__name">
                          <strong>{product.name}</strong>
                          <small>
                            {product.tracksInventory
                              ? `${getAvailableQuantity(product.id)} disponibles`
                              : "Pago 50/50, sin inventario"}
                          </small>
                          <button
                            type="button"
                            className="product-price-edit-button"
                            onClick={() => setCalculatorProductId(product.id)}
                          >
                            Calcular precio
                          </button>
                        </div>
                        <span className="selected-product-row__price">{formatCop(product.priceCop)}</span>
                        <label className="quantity-field">
                          <span className="sr-only">Cantidad de {product.name}</span>
                          <input
                            type="number"
                            min={1}
                            max={
                              product.tracksInventory
                                ? getAvailableQuantity(product.id)
                                : undefined
                            }
                            value={quantity}
                            onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
                          />
                        </label>
                        <strong className="selected-product-row__total">
                          {formatCop(product.priceCop * quantity)}
                        </strong>
                        <button
                          type="button"
                          className="remove-line-button"
                          aria-label={`Quitar ${product.name}`}
                          onClick={() => removeProduct(product.id)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="order-empty-products" onClick={openProductSelector}>
                    <span aria-hidden="true">+</span>
                    Agregar productos al pedido
                  </button>
                )}
              </section>

              <section className="order-section payment-section">
                <div className="order-section__header">
                  <h2>Pago</h2>
                </div>
                <div className="payment-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatCop(totalCop)}</strong>
                  </div>
                  <div className="payment-summary__total">
                    <span>Total</span>
                    <strong>{formatCop(totalCop)}</strong>
                  </div>
                  {initialOrder ? (
                    <div>
                      <span>Pagado</span>
                      <strong>{formatCop(recordedPaidCop)}</strong>
                    </div>
                  ) : (
                    <label className="payment-entry">
                      <span>Pago recibido</span>
                      <span className="money-input">
                        <span>$</span>
                        <FormattedNumberInput
                          min={0}
                          max={totalCop || undefined}
                          value={paymentReceivedCop}
                          placeholder="0"
                          disabled={purchaseWithoutAdvance}
                          onValueChange={setPaymentReceivedCop}
                        />
                      </span>
                    </label>
                  )}
                  {hasSelectedProducts && !initialOrder?.deliveredAtIso ? (
                    <label className="no-advance-option">
                      <input
                        type="checkbox"
                        checked={purchaseWithoutAdvance}
                        onChange={(event) => {
                          setPurchaseWithoutAdvance(event.target.checked);
                          if (event.target.checked) {
                            setPaymentReceivedCop(0);
                          }
                        }}
                      />
                      <span>
                        <strong>Comprar sin anticipo</strong>
                        <small>El total quedara pendiente</small>
                      </span>
                    </label>
                  ) : null}
                  <div className="payment-summary__pending">
                    <span>Pendiente despues de pagar</span>
                    <strong>{formatCop(pendingCop)}</strong>
                  </div>
                </div>
              </section>

              {error ? <p className="order-form-error" role="alert">{error}</p> : null}
            </div>

            <aside className="order-customer-column">
              <section className="order-section order-date-section">
                <label>
                  <span>Fecha del pedido</span>
                  <input
                    type="date"
                    required
                    max={todayDate}
                    value={orderDate}
                    onChange={(event) => setOrderDate(event.target.value)}
                  />
                </label>
              </section>

              <section className="order-section customer-section">
                <div className="order-section__header">
                  <h2>Cliente</h2>
                  {selectedCustomer ? (
                    <button
                      type="button"
                      className="ops-text-button"
                      onClick={() => {
                        setCustomerSearch("");
                        setActiveModal("customers");
                      }}
                    >
                      Cambiar
                    </button>
                  ) : null}
                </div>

                {selectedCustomer ? (
                  <div className="selected-customer">
                    <strong className="selected-customer__name">{selectedCustomer.fullName}</strong>
                    <div>
                      <h3>Informacion de contacto</h3>
                      {selectedCustomer.email ? (
                        <a href={`mailto:${selectedCustomer.email}`}>{selectedCustomer.email}</a>
                      ) : (
                        <span>Sin correo</span>
                      )}
                      <a href={`tel:${selectedCustomer.phone}`}>{selectedCustomer.phone}</a>
                    </div>
                    <div>
                      <h3>Direccion de envio</h3>
                      <p>{selectedCustomer.address}</p>
                      <p>
                        {selectedCustomer.postalCode ? `${selectedCustomer.postalCode} ` : ""}
                        {selectedCustomer.city}, {selectedCustomer.department}
                      </p>
                      <p>{selectedCustomer.country}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="customer-search-trigger"
                    onClick={() => {
                      setCustomerSearch("");
                      setActiveModal("customers");
                    }}
                  >
                    <span aria-hidden="true">&#9906;</span>
                    Buscar o seleccionar cliente
                  </button>
                )}
              </section>
            </aside>
          </div>
        </form>
      </main>

      {isConfirmingWithoutAdvance ? (
        <div className="order-modal-backdrop" role="presentation">
          <section
            className="order-modal no-advance-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="no-advance-confirm-title"
          >
            <div className="order-modal__header">
              <h2 id="no-advance-confirm-title">Crear pedido sin anticipo</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setIsConfirmingWithoutAdvance(false)}
              >
                &times;
              </button>
            </div>
            <div className="no-advance-confirm-body">
              <p>El pedido quedara listo para comprar y no se registrara ningun pago.</p>
              <div>
                <span>Total pendiente</span>
                <strong>{formatCop(totalCop)}</strong>
              </div>
            </div>
            <div className="order-modal__footer">
              <span />
              <div>
                <button
                  type="button"
                  className="ops-button"
                  onClick={() => setIsConfirmingWithoutAdvance(false)}
                >
                  Volver
                </button>
                <button
                  type="button"
                  className="ops-button ops-button--primary"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit(true)}
                >
                  {isSubmitting ? "Guardando..." : "Si, crear sin anticipo"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeModal === "products" ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="order-modal order-modal--products" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
            <div className="order-modal__header">
              <h2 id="product-modal-title">Seleccionar productos</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setActiveModal(null)}>
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
              <span>Inventario</span>
              <span>Precio</span>
            </div>
            <div className="product-picker-list">
              {filteredProducts.map((product) => (
                <label key={product.id} className="product-picker-row">
                  <input
                    type="checkbox"
                    checked={checkedProductIds.includes(product.id)}
                    disabled={
                      product.tracksInventory &&
                      getAvailableQuantity(product.id) <= 0 &&
                      !checkedProductIds.includes(product.id)
                    }
                    onChange={() => toggleProduct(product.id)}
                  />
                  <ProductThumb name={product.name} imageUrl={product.imageUrl} />
                  <span className="product-picker-row__name">{product.name}</span>
                  <small>
                    {product.tracksInventory
                      ? getAvailableQuantity(product.id)
                      : "No aplica"}
                  </small>
                  <strong>{formatCop(product.priceCop)}</strong>
                </label>
              ))}
            </div>
            <div className="order-modal__footer">
              <span>{checkedProductIds.length} seleccionado(s)</span>
              <div>
                <button type="button" className="ops-button" onClick={() => setActiveModal(null)}>
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

      {activeModal === "customers" ? (
        <div className="order-modal-backdrop" role="presentation">
          <section className="order-modal order-modal--customers" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
            <div className="order-modal__header">
              <h2 id="customer-modal-title">Seleccionar cliente</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setActiveModal(null)}>
                &times;
              </button>
            </div>
            <div className="order-modal__search">
              <span aria-hidden="true">&#9906;</span>
              <input
                autoFocus
                value={customerSearch}
                placeholder="Buscar por nombre, correo o telefono"
                onChange={(event) => setCustomerSearch(event.target.value)}
              />
            </div>
            <div className="customer-picker-list">
              {filteredCustomers.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setActiveModal(null);
                  }}
                >
                  <span className="ops-avatar">
                    {customer.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{customer.fullName}</strong>
                    <small>{customer.email || "Sin correo"}</small>
                  </span>
                  <small>{customer.phone}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {calculatorProduct ? (
        <ProductPriceCalculator
          product={calculatorProduct}
          onClose={() => setCalculatorProductId(null)}
          onUpdated={(updatedProduct) => {
            const currentOrderItem = initialOrder?.items?.find(
              (item) => item.productId === updatedProduct.id
            );
            const productForOrder = currentOrderItem
              ? {
                  ...updatedProduct,
                  tracksInventory: currentOrderItem.saleMode === "immediate",
                  saleMode: currentOrderItem.saleMode,
                  paymentPolicy: currentOrderItem.paymentPolicy,
                }
              : updatedProduct;
            setCatalogProducts((current) =>
              current.map((product) =>
                product.id === updatedProduct.id ? productForOrder : product
              )
            );
            setCalculatorProductId(null);
          }}
        />
      ) : null}
    </>
  );
}
