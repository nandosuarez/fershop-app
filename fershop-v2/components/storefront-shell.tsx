"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCop, getPaymentPolicyLabel, getSaleModeLabel, summarizeCart } from "@/lib/commerce";
import type { CartItem, Product, ProductCategory, SaleMode } from "@/lib/types";

type ModeFilter = "all" | SaleMode;
type CategoryFilter = "all" | ProductCategory;

interface StorefrontShellProps {
  products: Product[];
  compact?: boolean;
}

export function StorefrontShell({ products, compact = false }: StorefrontShellProps) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          products.map((product) => [
            product.category,
            { value: product.category, label: product.categoryLabel },
          ])
        ).values()
      ),
    [products]
  );

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.trim().toLowerCase();
      const matchesQuery =
        !query ||
        [
          product.name,
          product.description,
          product.story,
          product.badge,
          product.categoryLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesMode = modeFilter === "all" || product.saleMode === modeFilter;
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesQuery && matchesMode && matchesCategory;
    });
  }, [categoryFilter, modeFilter, products, search]);

  const summary = useMemo(() => summarizeCart(cart), [cart]);

  function addToCart(productId: string) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity: 1 }];
      }
      return current.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  return (
    <section className={`storefront-shell${compact ? " storefront-shell--compact" : ""}`}>
      <div className="storefront-shell__controls">
        <label className="field-chip field-chip--search">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Vestido, denim, set..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="chip-group">
          {[
            { value: "all", label: "Todo" },
            { value: "immediate", label: "Entrega inmediata" },
            { value: "preorder", label: "Pedido 50/50" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={modeFilter === option.value ? "chip is-active" : "chip"}
              onClick={() => setModeFilter(option.value as ModeFilter)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="chip-group">
          <button
            type="button"
            className={categoryFilter === "all" ? "chip is-active" : "chip"}
            onClick={() => setCategoryFilter("all")}
          >
            Todas las categorias
          </button>
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={categoryFilter === category.value ? "chip is-active" : "chip"}
              onClick={() => setCategoryFilter(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="storefront-shell__grid">
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-card__visual">
                <span className="product-card__badge">{product.badge}</span>
                <span className="product-card__mode">{getSaleModeLabel(product.saleMode)}</span>
              </div>

              <div className="product-card__body">
                <div className="product-card__meta">
                  <span>{product.categoryLabel}</span>
                  <span>{product.leadTimeLabel}</span>
                </div>

                <h3>{product.name}</h3>
                <p>{product.description}</p>

                <div className="product-card__payment">
                  <strong>{getPaymentPolicyLabel(product.paymentPolicy)}</strong>
                  <span>
                    {product.paymentPolicy === "full_today"
                      ? `${formatCop(product.priceCop)} hoy`
                      : `${formatCop(Math.round(product.priceCop * 0.5))} hoy y ${formatCop(
                          Math.round(product.priceCop * 0.5)
                        )} al llegar`}
                  </span>
                </div>

                <div className="product-card__footer">
                  <div>
                    <strong>{formatCop(product.priceCop)}</strong>
                    <small>{product.materialNote}</small>
                  </div>
                  <div className="product-card__actions">
                    <Link href={`/productos/${product.slug}`} className="ghost-button">
                      Ver detalle
                    </Link>
                    <button type="button" className="primary-button" onClick={() => addToCart(product.id)}>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!visibleProducts.length ? (
            <article className="empty-card">
              <h3>No encontramos resultados</h3>
              <p>Ajusta los filtros o cambia el termino de busqueda para descubrir otras piezas.</p>
            </article>
          ) : null}
        </div>

        <aside className="bag-card">
          <div className="bag-card__head">
            <div>
              <p className="bag-label">Bolsa</p>
              <h3>Tu seleccion FerShop</h3>
            </div>
            <span>{summary.lines.length} referencias</span>
          </div>

          <div className="bag-card__summary">
            <div>
              <span>Total del pedido</span>
              <strong>{formatCop(summary.totalCop)}</strong>
            </div>
            <div>
              <span>Cobro hoy</span>
              <strong>{formatCop(summary.dueTodayCop)}</strong>
            </div>
            <div>
              <span>Saldo al llegar</span>
              <strong>{formatCop(summary.dueOnArrivalCop)}</strong>
            </div>
          </div>

          <p className="bag-card__note">
            {summary.immediateUnits} unidad(es) inmediatas y {summary.preorderUnits} unidad(es) por encargo.
          </p>

          <div className="bag-card__lines">
            {summary.lines.length ? (
              summary.lines.map((line) => (
                <div key={line.product.id} className="bag-line">
                  <div>
                    <strong>{line.product.name}</strong>
                    <small>{getPaymentPolicyLabel(line.product.paymentPolicy)}</small>
                  </div>
                  <div className="bag-line__controls">
                    <button type="button" onClick={() => updateQuantity(line.product.id, line.quantity - 1)}>
                      -
                    </button>
                    <span>{line.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(line.product.id, line.quantity + 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="bag-card__empty">
                Agrega productos para visualizar el mix entre entrega inmediata y pedido 50/50.
              </p>
            )}
          </div>

          <div className="bag-card__actions">
            <Link href="/checkout" className="primary-button primary-button--wide">
              Ir al cierre base
            </Link>
            <button type="button" className="ghost-button ghost-button--wide" onClick={() => setCart([])}>
              Vaciar bolsa
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
