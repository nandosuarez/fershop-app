"use client";

import { useMemo, useState } from "react";

import { ProductPriceCalculator } from "@/components/product-price-calculator";
import { formatCop } from "@/lib/commerce";
import type { Product, ProductCategory, ProductCategoryOption } from "@/lib/types";

interface ProductsWorkbenchProps {
  initialProducts: Product[];
  initialCategories: ProductCategoryOption[];
}

interface ApiErrorPayload {
  message?: string;
}

export function ProductsWorkbench({ initialProducts, initialCategories }: ProductsWorkbenchProps) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>(initialCategories[0]?.id ?? "");
  const [costCop, setCostCop] = useState(0);
  const [shippingCostCop, setShippingCostCop] = useState(0);
  const [priceCop, setPriceCop] = useState(0);
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

  function openCreateModal() {
    setEditingProductId(null);
    setName("");
    setCategory(categories[0]?.id ?? "");
    setCostCop(0);
    setShippingCostCop(0);
    setPriceCop(0);
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
      setError(null);
    }
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
          <div className="ops-table-scroll">
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
                {products.map((product) => (
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
          </div>
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
                  <small>JPG, PNG o WebP</small>
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

              <label className="product-form-field">
                <span>Costo del producto</span>
                <span className="product-money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={costCop || ""}
                    placeholder="0"
                    onChange={(event) => setCostCop(Math.max(0, Number(event.target.value) || 0))}
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>Costo de envio</span>
                <span className="product-money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={shippingCostCop || ""}
                    placeholder="0"
                    onChange={(event) =>
                      setShippingCostCop(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </span>
              </label>

              <label className="product-form-field product-form-field--wide">
                <span>Precio de venta</span>
                <span className="product-money-input">
                  <span>$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={priceCop || ""}
                    placeholder="0"
                    onChange={(event) => setPriceCop(Math.max(0, Number(event.target.value) || 0))}
                  />
                </span>
              </label>

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
    </>
  );
}
