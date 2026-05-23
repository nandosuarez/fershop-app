const companyLogo = document.querySelector("[data-public-store-company-logo]");
const companyBrand = document.querySelector("[data-public-store-company-brand]");
const companyTagline = document.querySelector("[data-public-store-company-tagline]");
const defaultTrmNode = document.querySelector("[data-store-default-trm]");
const defaultMarginNode = document.querySelector("[data-store-default-margin]");

const searchInput = document.getElementById("public-store-search-input");
const productsSummaryNode = document.getElementById("public-store-products-summary");
const productsContainer = document.getElementById("public-store-products");
const cartItemsContainer = document.getElementById("public-store-cart-items");
const cartCountNode = document.getElementById("public-store-cart-count");
const cartTotalNode = document.getElementById("public-store-cart-total");
const clearCartButton = document.getElementById("public-store-clear-cart");
const checkoutForm = document.getElementById("public-store-checkout-form");
const checkoutSubmit = document.getElementById("public-store-submit");
const statusNode = document.getElementById("public-store-status");

const PUBLIC_STORE_CART_STORAGE_PREFIX = "fershop_public_store_cart_v1";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const state = {
  slug: "",
  company: null,
  defaults: null,
  products: [],
  cart: [],
  isSubmitting: false,
};

function formatCop(value) {
  const number = Number(value || 0);
  return copFormatter.format(Number.isFinite(number) ? number : 0);
}

function formatUsd(value) {
  const number = Number(value || 0);
  return usdFormatter.format(Number.isFinite(number) ? number : 0);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(message, tone = "info") {
  if (!statusNode) {
    return;
  }
  statusNode.textContent = String(message || "");
  statusNode.classList.remove("is-success", "is-error");
  if (tone === "success") {
    statusNode.classList.add("is-success");
  } else if (tone === "error") {
    statusNode.classList.add("is-error");
  }
}

function getSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "tienda") {
    return parts[1];
  }
  return "";
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Math.trunc(toNumber(value, fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCartStorageKey() {
  return `${PUBLIC_STORE_CART_STORAGE_PREFIX}:${state.slug || "default"}`;
}

function persistCart() {
  try {
    window.localStorage.setItem(getCartStorageKey(), JSON.stringify(state.cart));
  } catch (_error) {
    // Ignore storage write errors.
  }
}

function restoreCart() {
  let restored = [];
  try {
    const raw = window.localStorage.getItem(getCartStorageKey());
    const payload = raw ? JSON.parse(raw) : [];
    if (Array.isArray(payload)) {
      restored = payload
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const productId = toInteger(item.product_id, 0);
          const quantity = toInteger(item.quantity, 0);
          const unitSalePriceCop = toNumber(item.unit_sale_price_cop, 0);
          if (productId <= 0 || quantity <= 0) {
            return null;
          }
          return {
            product_id: productId,
            name: String(item.name || "Producto"),
            quantity,
            unit_sale_price_cop: Math.max(unitSalePriceCop, 0),
          };
        })
        .filter(Boolean);
    }
  } catch (_error) {
    restored = [];
  }
  state.cart = restored;
}

function getProductById(productId) {
  return state.products.find((item) => Number(item.id) === Number(productId)) || null;
}

function getProductStockLimit(product) {
  if (!product || !product.inventory_enabled) {
    return Number.POSITIVE_INFINITY;
  }
  const currentStock = toInteger(product.current_stock, 0);
  return currentStock > 0 ? currentStock : 0;
}

function clampQuantityByStock(product, quantity) {
  const safeQuantity = Math.max(0, toInteger(quantity, 0));
  const stockLimit = getProductStockLimit(product);
  if (Number.isFinite(stockLimit)) {
    return Math.min(safeQuantity, Math.max(0, stockLimit));
  }
  return safeQuantity;
}

function reconcileCart() {
  state.cart = state.cart
    .map((cartItem) => {
      const product = getProductById(cartItem.product_id);
      if (!product) {
        return null;
      }
      const quantity = clampQuantityByStock(product, cartItem.quantity);
      if (quantity <= 0) {
        return null;
      }
      return {
        product_id: Number(product.id),
        name: String(product.name || "Producto"),
        quantity,
        unit_sale_price_cop: Math.max(toNumber(product.suggested_sale_price_cop, 0), 0),
      };
    })
    .filter(Boolean);
  persistCart();
}

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const rawText = await response.text();
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (_error) {
      throw new Error("El servidor devolvio una respuesta no valida.");
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || "No fue posible completar la operacion.");
  }

  return payload;
}

function applyBranding(company, defaults) {
  const brandName = company?.brand_name || company?.name || "FerShop";
  const tagline =
    company?.tagline || "Compra directo desde el catalogo y recibe confirmacion de tu pedido.";
  const logoPath = company?.logo_path || "/static/assets/fershop-logo-crop.jpg";
  document.title = `Tienda | ${brandName}`;

  if (companyLogo) {
    companyLogo.src = logoPath;
    companyLogo.alt = `Logo ${brandName}`;
  }
  if (companyBrand) {
    companyBrand.textContent = brandName;
  }
  if (companyTagline) {
    companyTagline.textContent = tagline;
  }
  if (defaultTrmNode) {
    defaultTrmNode.textContent = formatCop(defaults?.exchange_rate_cop || 0);
  }
  if (defaultMarginNode) {
    defaultMarginNode.textContent = `${toNumber(defaults?.desired_margin_percent || 0)}%`;
  }
}

function getFilteredProducts() {
  const query = String(searchInput?.value || "")
    .trim()
    .toLowerCase();
  if (!query) {
    return state.products;
  }
  return state.products.filter((item) => {
    const haystack = [
      item.name,
      item.reference,
      item.category,
      item.store,
      item.description,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });
}

function renderProductsSummary(filteredProducts) {
  if (!productsSummaryNode) {
    return;
  }
  const total = state.products.length;
  const shown = filteredProducts.length;
  const query = String(searchInput?.value || "").trim();
  if (!total) {
    productsSummaryNode.textContent = "No hay productos publicados por ahora.";
    return;
  }
  if (!query) {
    productsSummaryNode.textContent = `${total} producto(s) disponibles para compra online.`;
    return;
  }
  productsSummaryNode.textContent = `${shown} de ${total} producto(s) coinciden con tu busqueda.`;
}

function renderProducts() {
  if (!productsContainer) {
    return;
  }
  const products = getFilteredProducts();
  renderProductsSummary(products);
  if (!products.length) {
    productsContainer.className = "catalog-empty";
    productsContainer.innerHTML = "<p>No encontramos productos para ese filtro.</p>";
    return;
  }

  productsContainer.className = "public-store-products";
  productsContainer.innerHTML = products
    .map((item) => {
      const stockLimit = getProductStockLimit(item);
      const outOfStock = Number.isFinite(stockLimit) && stockLimit <= 0;
      const cartItem = state.cart.find((entry) => Number(entry.product_id) === Number(item.id));
      const currentQty = outOfStock ? 0 : Math.max(1, Number(cartItem?.quantity || 1));
      const maxAttr = Number.isFinite(stockLimit) ? `max="${stockLimit}"` : "";
      const stockLabel = !item.inventory_enabled
        ? "Importacion"
        : outOfStock
          ? "Sin stock"
          : `Stock tienda: ${stockLimit}`;
      const cardClass = outOfStock ? "public-store-product-card is-out-of-stock" : "public-store-product-card";

      return `
        <article class="${cardClass}">
          ${
            item.image_data_url
              ? `<img src="${item.image_data_url}" alt="${escapeHtml(item.name)}" />`
              : '<div class="public-store-image-placeholder" aria-hidden="true">Sin foto</div>'
          }
          <div class="public-store-product-content">
            <h3>${escapeHtml(item.name)}</h3>
            <p class="public-store-product-meta">
              ${escapeHtml(item.reference || "Sin referencia")} - ${escapeHtml(
                item.category || "Sin categoria"
              )} - ${escapeHtml(item.store || "Sin tienda")}
            </p>
            <p>${escapeHtml(item.description || "Producto disponible para compra online.")}</p>
            <div class="public-store-price-row">
              <strong>${formatCop(item.suggested_sale_price_cop)}</strong>
              <span>${formatUsd(item.price_usd_net)} + tax</span>
            </div>
            <div class="public-store-product-footer">
              <span class="catalog-chip ${outOfStock ? "catalog-chip-muted" : ""}">${stockLabel}</span>
              <label class="public-store-qty-label">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  value="${currentQty}"
                  ${maxAttr}
                  data-store-qty-input="${item.id}"
                  ${outOfStock ? "disabled" : ""}
                />
              </label>
              <button
                type="button"
                class="secondary"
                data-store-add-product="${item.id}"
                ${outOfStock ? "disabled" : ""}
              >
                ${outOfStock ? "Sin stock" : "Agregar"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function calculateCartTotal() {
  return state.cart.reduce((total, item) => {
    const quantity = toInteger(item.quantity, 0);
    const unitSale = toNumber(item.unit_sale_price_cop, 0);
    return total + unitSale * quantity;
  }, 0);
}

function syncCartControls() {
  if (checkoutSubmit) {
    checkoutSubmit.disabled = state.isSubmitting || state.cart.length === 0;
  }
  if (clearCartButton) {
    clearCartButton.disabled = state.isSubmitting || state.cart.length === 0;
  }
}

function renderCart() {
  if (!cartItemsContainer || !cartCountNode || !cartTotalNode) {
    return;
  }
  const itemCount = state.cart.reduce((total, item) => total + toInteger(item.quantity, 0), 0);
  cartCountNode.textContent = `${itemCount} producto(s)`;
  cartTotalNode.textContent = formatCop(calculateCartTotal());
  syncCartControls();

  if (!state.cart.length) {
    cartItemsContainer.className = "catalog-empty";
    cartItemsContainer.innerHTML = "<p>Aun no agregas productos al carrito.</p>";
    return;
  }

  cartItemsContainer.className = "public-store-cart-items";
  cartItemsContainer.innerHTML = state.cart
    .map((item) => {
      const product = getProductById(item.product_id);
      const stockLimit = getProductStockLimit(product);
      const maxAttr = Number.isFinite(stockLimit) ? `max="${stockLimit}"` : "";
      const lineTotal = toNumber(item.unit_sale_price_cop, 0) * toInteger(item.quantity, 0);
      return `
        <article class="public-store-cart-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${formatCop(item.unit_sale_price_cop)} x ${toInteger(item.quantity, 0)}</p>
            <p class="public-store-cart-subtotal">Subtotal: <strong>${formatCop(lineTotal)}</strong></p>
          </div>
          <div class="public-store-cart-actions">
            <button type="button" data-cart-dec="${item.product_id}" aria-label="Restar">-</button>
            <input
              type="number"
              min="1"
              step="1"
              value="${toInteger(item.quantity, 1)}"
              ${maxAttr}
              data-cart-qty-input="${item.product_id}"
              aria-label="Cantidad de ${escapeHtml(item.name)}"
            />
            <button type="button" data-cart-inc="${item.product_id}" aria-label="Sumar">+</button>
            <button type="button" data-cart-remove="${item.product_id}" aria-label="Quitar">Quitar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function addProductToCart(productId, quantity) {
  const product = getProductById(productId);
  if (!product) {
    setStatus("Este producto ya no esta disponible.", "error");
    return;
  }

  const requestedQuantity = Math.max(1, toInteger(quantity, 1));
  const stockLimit = getProductStockLimit(product);
  if (Number.isFinite(stockLimit) && stockLimit <= 0) {
    setStatus("Este producto no tiene stock disponible.", "error");
    return;
  }

  const existing = state.cart.find((item) => Number(item.product_id) === Number(productId));
  const baseQuantity = existing ? toInteger(existing.quantity, 0) : 0;
  const clampedNextQuantity = clampQuantityByStock(product, baseQuantity + requestedQuantity);
  if (clampedNextQuantity <= 0) {
    setStatus("No fue posible agregar este producto en este momento.", "error");
    return;
  }

  if (existing) {
    existing.quantity = clampedNextQuantity;
  } else {
    state.cart.push({
      product_id: Number(product.id),
      name: String(product.name || "Producto"),
      quantity: clampedNextQuantity,
      unit_sale_price_cop: Math.max(toNumber(product.suggested_sale_price_cop, 0), 0),
    });
  }

  persistCart();
  renderProducts();
  renderCart();

  if (Number.isFinite(stockLimit) && clampedNextQuantity < baseQuantity + requestedQuantity) {
    setStatus(`${product.name} agregado. Solo quedan ${stockLimit} unidad(es).`, "success");
    return;
  }
  setStatus(`${product.name} agregado al carrito.`, "success");
}

function updateCartQuantity(productId, nextQuantity) {
  const target = state.cart.find((item) => Number(item.product_id) === Number(productId));
  if (!target) {
    return;
  }
  const product = getProductById(productId);
  if (!product) {
    state.cart = state.cart.filter((item) => Number(item.product_id) !== Number(productId));
    persistCart();
    renderProducts();
    renderCart();
    return;
  }

  const clampedQuantity = clampQuantityByStock(product, nextQuantity);
  if (clampedQuantity <= 0) {
    state.cart = state.cart.filter((item) => Number(item.product_id) !== Number(productId));
  } else {
    target.quantity = clampedQuantity;
  }

  persistCart();
  renderProducts();
  renderCart();
}

function clearCart() {
  if (!state.cart.length) {
    return;
  }
  state.cart = [];
  persistCart();
  renderProducts();
  renderCart();
  setStatus("Carrito vaciado.", "success");
}

async function loadStore() {
  state.slug = getSlugFromPath();
  if (!state.slug) {
    throw new Error("No encontramos una tienda valida para este enlace.");
  }

  const payload = await requestJson(`/api/public/store/${encodeURIComponent(state.slug)}`);
  state.company = payload.company || null;
  state.defaults = payload.defaults || null;
  state.products = Array.isArray(payload.items) ? payload.items : [];
  applyBranding(state.company, state.defaults);
  restoreCart();
  reconcileCart();
  renderProducts();
  renderCart();
  setStatus("Catalogo listo. Puedes agregar productos al carrito.");
}

function readCheckoutPayload() {
  const data = new FormData(checkoutForm);
  const advanceRaw = String(data.get("advance_paid_cop") || "").trim();
  const advanceValue = toNumber(advanceRaw, 0);

  return {
    customer: {
      name: String(data.get("name") || "").trim(),
      identification: String(data.get("identification") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      whatsapp_phone: String(data.get("whatsapp_phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      city: String(data.get("city") || "").trim(),
      address: String(data.get("address") || "").trim(),
      notes: "",
      whatsapp_opt_in: true,
    },
    cart: state.cart.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      unit_sale_price_cop: Number(item.unit_sale_price_cop || 0),
    })),
    advance_paid_cop: advanceRaw ? Math.max(advanceValue, 0) : null,
    notes: String(data.get("notes") || "").trim(),
  };
}

if (
  productsContainer &&
  cartItemsContainer &&
  cartCountNode &&
  cartTotalNode &&
  checkoutForm &&
  checkoutSubmit &&
  statusNode
) {
  productsContainer.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-store-add-product]");
    if (!addButton) {
      return;
    }
    const productId = toInteger(addButton.getAttribute("data-store-add-product"), 0);
    const qtyInput = productsContainer.querySelector(`[data-store-qty-input="${productId}"]`);
    const quantity = qtyInput instanceof HTMLInputElement ? toInteger(qtyInput.value, 1) : 1;
    addProductToCart(productId, quantity);
  });

  productsContainer.addEventListener("change", (event) => {
    const qtyInput = event.target.closest("[data-store-qty-input]");
    if (!qtyInput || !(qtyInput instanceof HTMLInputElement)) {
      return;
    }
    const productId = toInteger(qtyInput.getAttribute("data-store-qty-input"), 0);
    const product = getProductById(productId);
    const nextQuantity = Math.max(1, clampQuantityByStock(product, qtyInput.value));
    qtyInput.value = String(nextQuantity);
  });

  cartItemsContainer.addEventListener("click", (event) => {
    const decButton = event.target.closest("[data-cart-dec]");
    if (decButton) {
      const productId = toInteger(decButton.getAttribute("data-cart-dec"), 0);
      const item = state.cart.find((entry) => Number(entry.product_id) === productId);
      updateCartQuantity(productId, toInteger(item?.quantity, 0) - 1);
      return;
    }

    const incButton = event.target.closest("[data-cart-inc]");
    if (incButton) {
      const productId = toInteger(incButton.getAttribute("data-cart-inc"), 0);
      const item = state.cart.find((entry) => Number(entry.product_id) === productId);
      updateCartQuantity(productId, toInteger(item?.quantity, 0) + 1);
      return;
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      const productId = toInteger(removeButton.getAttribute("data-cart-remove"), 0);
      updateCartQuantity(productId, 0);
    }
  });

  cartItemsContainer.addEventListener("change", (event) => {
    const qtyInput = event.target.closest("[data-cart-qty-input]");
    if (!qtyInput || !(qtyInput instanceof HTMLInputElement)) {
      return;
    }
    const productId = toInteger(qtyInput.getAttribute("data-cart-qty-input"), 0);
    updateCartQuantity(productId, qtyInput.value);
  });

  if (clearCartButton) {
    clearCartButton.addEventListener("click", clearCart);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderProducts();
    });
  }

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.cart.length) {
      setStatus("Agrega al menos un producto al carrito antes de confirmar.", "error");
      return;
    }

    const payload = readCheckoutPayload();
    state.isSubmitting = true;
    syncCartControls();
    setStatus("Enviando tu compra...");

    try {
      const response = await requestJson(
        `/api/public/store/${encodeURIComponent(state.slug)}/checkout`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      const orderId = response?.item?.id;
      const quoteId = response?.quote?.id;
      setStatus(
        `Compra confirmada.${orderId ? ` Codigo #${orderId}.` : ""}${
          quoteId ? ` Cotizacion #${quoteId}.` : ""
        }`,
        "success"
      );
      state.cart = [];
      persistCart();
      checkoutForm.reset();
      renderProducts();
      renderCart();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No fue posible confirmar la compra.", "error");
    } finally {
      state.isSubmitting = false;
      syncCartControls();
    }
  });

  syncCartControls();
  loadStore().catch((error) => {
    setStatus(error instanceof Error ? error.message : "No fue posible cargar la tienda.", "error");
    if (checkoutSubmit) {
      checkoutSubmit.disabled = true;
    }
    if (clearCartButton) {
      clearCartButton.disabled = true;
    }
    productsContainer.className = "catalog-empty";
    productsContainer.innerHTML = `<p>${escapeHtml(
      error instanceof Error ? error.message : "No fue posible cargar la tienda."
    )}</p>`;
  });
}
