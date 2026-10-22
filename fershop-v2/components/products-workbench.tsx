"use client";

import { useMemo, useState } from "react";

import {
  ProductPriceCalculator,
  type ProductPriceValues,
} from "@/components/product-price-calculator";
import { FormattedNumberInput } from "@/components/formatted-number-input";
import { ListSearch } from "@/components/list-search";
import { formatCop } from "@/lib/commerce";
import { matchesSearch } from "@/lib/search";
import type {
  Product,
  ProductCategory,
  ProductCategoryOption,
  ProductPricingCalculation,
} from "@/lib/types";

type ProductInputCurrency = "COP" | "USD";

const formatUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

interface ProductsWorkbenchProps {
  initialProducts: Product[];
  initialCategories: ProductCategoryOption[];
}

interface ApiErrorPayload {
  message?: string;
}

export function ProductsWorkbench({ initialProducts, initialCategories }: ProductsWorkbenchProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>(initialCategories[0]?.id ?? "");
  const [costCop, setCostCop] = useState(0);
  const [shippingCostCop, setShippingCostCop] = useState(0);
  const [priceCop, setPriceCop] = useState(0);
  const [inputCurrency, setInputCurrency] = useState<ProductInputCurrency>("COP");
  const [draftPricingCalculation, setDraftPricingCalculation] =
    useState<ProductPricingCalculation>();
  const [isFormCalculatorOpen, setIsFormCalculatorOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [calculatorProductId, setCalculatorProductId] = useState<string | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const categoryLabel = useMemo(
    () => categories.find((item) => item.id === category)?.label ?? "",
    [category]
  );

  const editingProduct = editingProductId
    ? products.find((product) => product.id === editingProductId) ?? null
    : null;
  const calculatorProduct = calculatorProductId
    ? products.find((product) => product.id === calculatorProductId) ?? null
    : null;
  const formCalculatorProduct = {
    id: editingProductId ?? "new-product",
    name: name.trim() || "Nuevo producto",
    costCop,
    shippingCostCop,
    priceCop,
    pricingCalculation: draftPricingCalculation,
  };
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        matchesSearch(search, [
          product.name,
          product.categoryLabel,
          product.priceCop,
          product.costCop,
          product.shippingCostCop,
          product.tracksInventory ? "maneja inventario disponible" : "sin inventario 50/50",
        ])
      ),
    [products, search]
  );

  function openCreateModal() {
    setEditingProductId(null);
    setName("");
    setCategory(categories[0]?.id ?? "");
    setCostCop(0);
    setShippingCostCop(0);
    setPriceCop(0);
    setInputCurrency("COP");
    setDraftPricingCalculation(undefined);
    setIsFormCalculatorOpen(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    setError(null);
    setIsModalOpen(true);
  }

  function openCategoriesModal() {
    setCategoryError(null);
    setNewCategoryLabel("");
    setEditingCategoryId(null);
    setIsCategoriesModalOpen(true);
  }

  async function categoryRequest(
    url: string,
    method: "POST" | "PUT" | "DELETE",
    label?: string
  ) {
    const response = await fetch(url, {
      method,
      headers: label === undefined ? undefined : { "Content-Type": "application/json" },
      body: label === undefined ? undefined : JSON.stringify({ label }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorPayload;
      throw new Error(payload.message || "No pudimos guardar la categoria.");
    }
    return (await response.json()) as { category?: ProductCategoryOption };
  }

  async function createCategory() {
    if (!newCategoryLabel.trim()) {
      setCategoryError("Escribe el nombre de la categoria.");
      return;
    }
    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      const payload = await categoryRequest("/api/categories", "POST", newCategoryLabel);
      if (payload.category) {
        setCategories((current) => [...current, payload.category!]);
        setCategory(payload.category.id);
      }
      setNewCategoryLabel("");
      setProductFeedback("Categoria creada correctamente.");
    } catch (caughtError) {
      setCategoryError(
        caughtError instanceof Error ? caughtError.message : "No pudimos guardar la categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function saveCategory(categoryId: string) {
    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      const payload = await categoryRequest(
        `/api/categories/${encodeURIComponent(categoryId)}`,
        "PUT",
        editingCategoryLabel
      );
      if (payload.category) {
        setCategories((current) =>
          current.map((item) => (item.id === categoryId ? payload.category! : item))
        );
        setProducts((current) =>
          current.map((product) =>
            product.category === categoryId
              ? { ...product, categoryLabel: payload.category!.label }
              : product
          )
        );
      }
      setEditingCategoryId(null);
      setProductFeedback("Categoria actualizada correctamente.");
    } catch (caughtError) {
      setCategoryError(
        caughtError instanceof Error ? caughtError.message : "No pudimos guardar la categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function removeCategory(categoryId: string) {
    setIsSavingCategory(true);
    setCategoryError(null);
    try {
      await categoryRequest(`/api/categories/${encodeURIComponent(categoryId)}`, "DELETE");
      setCategories((current) => current.filter((item) => item.id !== categoryId));
      setCategory((current) =>
        current === categoryId
          ? categories.find((item) => item.id !== categoryId)?.id ?? ""
          : current
      );
      setProductFeedback("Categoria eliminada correctamente.");
    } catch (caughtError) {
      setCategoryError(
        caughtError instanceof Error ? caughtError.message : "No pudimos eliminar la categoria."
      );
    } finally {
      setIsSavingCategory(false);
    }
  }

  function openEditModal(product: Product) {
    setEditingProductId(product.id);
    setName(product.name);
    setCategory(product.category);
    setCostCop(product.costCop ?? 0);
    setShippingCostCop(product.shippingCostCop ?? 0);
    setPriceCop(product.priceCop);
    setInputCurrency(product.pricingCalculation ? "USD" : "COP");
    setDraftPricingCalculation(product.pricingCalculation);
    setIsFormCalculatorOpen(false);
    setImageFile(null);
    setImagePreviewUrl(product.imageUrl ?? null);
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isSaving) {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setIsModalOpen(false);
      setEditingProductId(null);
      setImageFile(null);
      setImagePreviewUrl(null);
      setDraftPricingCalculation(undefined);
      setIsFormCalculatorOpen(false);
      setError(null);
    }
  }

  function chooseInputCurrency(currency: ProductInputCurrency) {
    setInputCurrency(currency);
    setError(null);
    if (currency === "USD") {
      setIsFormCalculatorOpen(true);
    }
  }

  function applyCalculatedPrice(values: ProductPriceValues) {
    setCostCop(values.costCop);
    setShippingCostCop(values.shippingCostCop);
    setPriceCop(values.priceCop);
    setDraftPricingCalculation(values.pricingCalculation);
    setInputCurrency("USD");
    setIsFormCalculatorOpen(false);
    setError(null);
  }

  function selectImage(file: File | null) {
    if (!file) {
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("La imagen debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 8 MB.");
      return;
    }
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  async function uploadImage() {
    if (!imageFile) {
      return editingProduct?.imageUrl;
    }
    const formData = new FormData();
    formData.append("image", imageFile);
    const response = await fetch("/api/products/images", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = (await response.json()) as ApiErrorPayload;
      throw new Error(payload.message || "No pudimos guardar la imagen.");
    }
    const payload = (await response.json()) as { imageUrl: string };
    return payload.imageUrl;
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }
    if (priceCop <= 0) {
      setError("Escribe el precio de venta.");
      return;
    }
    if (costCop <= 0) {
      setError("Escribe el costo del producto.");
      return;
    }
    if (inputCurrency === "USD" && !draftPricingCalculation) {
      setError("Usa la calculadora para convertir los valores en dolares.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const imageUrl = await uploadImage();
      const response = await fetch(
        editingProductId
          ? `/api/products/${encodeURIComponent(editingProductId)}`
          : "/api/products",
        {
        method: editingProductId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageUrl,
          category,
          costCop,
          shippingCostCop,
          priceCop,
          pricingCalculation:
            inputCurrency === "USD" ? draftPricingCalculation : undefined,
        }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos guardar el producto.");
      }

      const payload = (await response.json()) as { product: Product };
      const wasEditing = Boolean(editingProductId);
      setProducts((current) =>
        editingProductId
          ? current.map((product) =>
              product.id === payload.product.id ? payload.product : product
            )
          : [payload.product, ...current]
      );
      setProductFeedback(
        `${payload.product.name} fue ${wasEditing ? "actualizado" : "creado"} correctamente.`
      );
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setIsModalOpen(false);
      setEditingProductId(null);
      setImageFile(null);
      setImagePreviewUrl(null);
      setDraftPricingCalculation(undefined);
      setIsFormCalculatorOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el producto.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="ops-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">{products.length} productos</p>
            <h1>Productos</h1>
          </div>
          <div className="ops-page-actions">
            <button type="button" className="ops-button" onClick={openCategoriesModal}>
              Administrar categorias
            </button>
            <button type="button" className="ops-button ops-button--primary" onClick={openCreateModal}>
              <span aria-hidden="true">+</span> Agregar producto
            </button>
          </div>
        </div>

        {productFeedback ? (
          <p className="ops-success-notice" role="status">
            {productFeedback}
          </p>
        ) : null}

        <section className="ops-card ops-table-card">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto o categoria"
            resultLabel={`${filteredProducts.length} resultado${filteredProducts.length === 1 ? "" : "s"}`}
          />
          {filteredProducts.length ? <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Costo producto</th>
                  <th>Envio</th>
                  <th>Precio de venta</th>
                  <th>Inventario</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="ops-product-cell">
                        <span className="ops-product-thumb">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" />
                          ) : (
                            product.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.categoryLabel}</small>
                        </div>
                      </div>
                    </td>
                    <td>{product.costCop ? formatCop(product.costCop) : "Sin registrar"}</td>
                    <td>{product.shippingCostCop !== undefined ? formatCop(product.shippingCostCop) : "Sin registrar"}</td>
                    <td>
                      <strong>{formatCop(product.priceCop)}</strong>
                    </td>
                    <td>
                      <span
                        className={`inventory-badge${product.tracksInventory ? " is-available" : ""}`}
                      >
                        {product.tracksInventory ? "Si" : "No"}
                      </span>
                    </td>
                    <td>
                      <div className="product-row-actions">
                        <button type="button" onClick={() => setCalculatorProductId(product.id)}>
                          Calcular
                        </button>
                        <button type="button" onClick={() => openEditModal(product)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : (
            <div className="ops-empty-state">
              <h2>No encontramos productos</h2>
              <button type="button" className="ops-button" onClick={() => setSearch("")}>
                Limpiar busqueda
              </button>
            </div>
          )}
        </section>
      </main>

      {isModalOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <form
            className="order-modal product-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="order-modal__header">
              <h2 id="product-form-title">
                {editingProduct ? "Editar producto" : "Agregar producto"}
              </h2>
              <button type="button" aria-label="Cerrar" onClick={closeModal}>
                &times;
              </button>
            </div>

            <div className="product-create-form">
              <label className="product-image-field product-form-field--wide">
                <span className="product-image-preview">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Vista previa del producto" />
                  ) : (
                    <span aria-hidden="true">+</span>
                  )}
                </span>
                <span>
                  <strong>Imagen del producto</strong>
                  <small>JPG, PNG o WebP · maximo 8 MB</small>
                </span>
                <span className="ops-button">Seleccionar imagen</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="product-form-field product-form-field--wide">
                <span>Nombre</span>
                <input
                  autoFocus
                  value={name}
                  placeholder="Nombre del producto"
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="product-form-field">
                <span>Categoria</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="product-currency-field product-form-field--wide">
                <div>
                  <strong>Moneda de los valores</strong>
                  <small>El producto siempre se guardara finalmente en pesos colombianos.</small>
                </div>
                <div className="product-currency-options" role="group" aria-label="Moneda de los valores">
                  <button
                    type="button"
                    className={inputCurrency === "COP" ? "is-active" : ""}
                    aria-pressed={inputCurrency === "COP"}
                    onClick={() => chooseInputCurrency("COP")}
                  >
                    <strong>COP</strong>
                    <span>Ingresar en pesos</span>
                  </button>
                  <button
                    type="button"
                    className={inputCurrency === "USD" ? "is-active" : ""}
                    aria-pressed={inputCurrency === "USD"}
                    onClick={() => chooseInputCurrency("USD")}
                  >
                    <strong>USD</strong>
                    <span>Convertir con calculadora</span>
                  </button>
                </div>
              </div>

              {inputCurrency === "COP" ? (
                <>
                  <label className="product-form-field">
                    <span>Costo del producto</span>
                    <span className="product-money-input">
                      <span>$</span>
                      <FormattedNumberInput
                        min={1}
                        value={costCop}
                        placeholder="0"
                        onValueChange={setCostCop}
                      />
                    </span>
                  </label>

                  <label className="product-form-field">
                    <span>Costo de envio</span>
                    <span className="product-money-input">
                      <span>$</span>
                      <FormattedNumberInput
                        min={0}
                        value={shippingCostCop}
                        placeholder="0"
                        onValueChange={setShippingCostCop}
                      />
                    </span>
                  </label>

                  <label className="product-form-field product-form-field--wide">
                    <span>Precio de venta</span>
                    <span className="product-money-input">
                      <span>$</span>
                      <FormattedNumberInput
                        min={1}
                        value={priceCop}
                        placeholder="0"
                        onValueChange={setPriceCop}
                      />
                    </span>
                  </label>
                </>
              ) : (
                <section className="product-usd-summary product-form-field--wide">
                  <div className="product-usd-summary__header">
                    <div>
                      <span>Conversion a pesos</span>
                      <strong>
                        {draftPricingCalculation
                          ? "Valores listos para guardar"
                          : "Completa la calculadora en USD"}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="ops-button"
                      onClick={() => setIsFormCalculatorOpen(true)}
                    >
                      {draftPricingCalculation ? "Revisar calculo" : "Abrir calculadora"}
                    </button>
                  </div>

                  <div className="product-usd-summary__values">
                    <div>
                      <span>Costo producto</span>
                      <strong>{costCop > 0 ? formatCop(costCop) : "Pendiente"}</strong>
                    </div>
                    <div>
                      <span>Costo envio</span>
                      <strong>{formatCop(shippingCostCop)}</strong>
                    </div>
                    <div>
                      <span>Precio de venta</span>
                      <strong>{priceCop > 0 ? formatCop(priceCop) : "Pendiente"}</strong>
                    </div>
                  </div>

                  {draftPricingCalculation ? (
                    <p>
                      Compra {formatUsd.format(draftPricingCalculation.purchasePriceUsd)} · Envio{" "}
                      {formatUsd.format(draftPricingCalculation.shippingUsd)} · TRM{" "}
                      {formatCop(draftPricingCalculation.exchangeRateCop)}
                    </p>
                  ) : (
                    <p>La calculadora convertira costo, envio y precio de venta a COP.</p>
                  )}
                </section>
              )}

              <span className="sr-only" aria-live="polite">
                Categoria seleccionada: {categoryLabel}
              </span>

              {error ? (
                <p className="order-form-error product-form-field--wide" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="order-modal__footer">
              <span />
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="ops-button ops-button--primary" disabled={isSaving}>
                  {isSaving
                    ? "Guardando..."
                    : editingProduct
                      ? "Guardar cambios"
                      : "Guardar producto"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {isCategoriesModalOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <section
            className="order-modal categories-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="categories-modal-title"
          >
            <div className="order-modal__header">
              <h2 id="categories-modal-title">Categorias</h2>
              <button
                type="button"
                aria-label="Cerrar"
                disabled={isSavingCategory}
                onClick={() => setIsCategoriesModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="categories-manager">
              <form
                className="category-create-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createCategory();
                }}
              >
                <input
                  autoFocus
                  value={newCategoryLabel}
                  placeholder="Nueva categoria"
                  onChange={(event) => setNewCategoryLabel(event.target.value)}
                />
                <button
                  type="submit"
                  className="ops-button ops-button--primary"
                  disabled={isSavingCategory}
                >
                  Agregar
                </button>
              </form>

              {categoryError ? (
                <p className="order-form-error" role="alert">
                  {categoryError}
                </p>
              ) : null}

              <div className="category-list">
                {categories.map((item) => {
                  const productCount = products.filter(
                    (product) => product.category === item.id
                  ).length;
                  const isEditing = editingCategoryId === item.id;
                  return (
                    <div className="category-row" key={item.id}>
                      {isEditing ? (
                        <input
                          value={editingCategoryLabel}
                          onChange={(event) => setEditingCategoryLabel(event.target.value)}
                        />
                      ) : (
                        <div>
                          <strong>{item.label}</strong>
                          <small>{productCount} producto{productCount === 1 ? "" : "s"}</small>
                        </div>
                      )}
                      <div>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isSavingCategory}
                              onClick={() => void saveCategory(item.id)}
                            >
                              Guardar
                            </button>
                            <button type="button" onClick={() => setEditingCategoryId(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(item.id);
                                setEditingCategoryLabel(item.label);
                                setCategoryError(null);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="category-delete-button"
                              disabled={isSavingCategory}
                              onClick={() => void removeCategory(item.id)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="order-modal__footer">
              <span />
              <div>
                <button
                  type="button"
                  className="ops-button"
                  disabled={isSavingCategory}
                  onClick={() => setIsCategoriesModalOpen(false)}
                >
                  Cerrar
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
          onUpdated={(updatedProduct) => {
            setProducts((current) =>
              current.map((product) =>
                product.id === updatedProduct.id ? updatedProduct : product
              )
            );
            setProductFeedback(`${updatedProduct.name} fue actualizado correctamente.`);
            setCalculatorProductId(null);
          }}
        />
      ) : null}

      {isFormCalculatorOpen ? (
        <ProductPriceCalculator
          product={formCalculatorProduct}
          onClose={() => setIsFormCalculatorOpen(false)}
          onApply={applyCalculatedPrice}
        />
      ) : null}
    </>
  );
}
