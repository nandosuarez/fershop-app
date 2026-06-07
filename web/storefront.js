const companyLogo = document.querySelector("[data-public-store-company-logo]");
const companyBrand = document.querySelector("[data-public-store-company-brand]");
const companyTagline = document.querySelector("[data-public-store-company-tagline]");
const defaultTrmNode = document.querySelector("[data-store-default-trm]");
const defaultMarginNode = document.querySelector("[data-store-default-margin]");
const defaultPreorderAdvanceNode = document.querySelector("[data-store-preorder-advance]");

const searchInput = document.getElementById("public-store-search-input");
const filterButtons = Array.from(document.querySelectorAll("[data-store-filter]"));
const productsSummaryNode = document.getElementById("public-store-products-summary");
const productsContainer = document.getElementById("public-store-products");
const cartItemsContainer = document.getElementById("public-store-cart-items");
const cartCountNode = document.getElementById("public-store-cart-count");
const cartTotalNode = document.getElementById("public-store-cart-total");
const payTodayTotalNode = document.getElementById("public-store-pay-today-total");
const balanceTotalNode = document.getElementById("public-store-balance-total");
const clearCartButton = document.getElementById("public-store-clear-cart");
const checkoutForm = document.getElementById("public-store-checkout-form");
const checkoutSubmit = document.getElementById("public-store-submit");
const statusNode = document.getElementById("public-store-status");

const PUBLIC_STORE_CART_STORAGE_PREFIX = "fershop_public_store_cart_v2";

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
  activeFilter: "all",
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

function getProductAvailabilityType(product) {
  return String(product?.availability_type || "").trim().toLowerCase() === "immediate"
    ? "immediate"
    : "preorder";
}

function getProductAvailabilityLabel(product) {
  return String(product?.availability_label || "").trim() || "Pedido 50/50";
}

function getProductTermsLabel(product) {
  const label = String(product?.payment_terms_label || "").trim();
  if (label) {
    return label;
  }
  return getProductAvailabilityType(product) === "immediate"
    ? "Pagas el 100% hoy para confirmar el despacho."
    : "Pagas el 50% hoy y el saldo cuando llegue a Colombia.";
}

function getProductDueTodayUnit(product) {
  const dueToday = toNumber(product?.payment_due_today_cop, NaN);
  if (Number.isFinite(dueToday)) {
    return Math.max(dueToday, 0);
  }
  if (getProductAvailabilityType(product) === "immediate") {
    return Math.max(toNumber(product?.suggested_sale_price_cop, 0), 0);
  }
  return Math.max(toNumber(product?.suggested_advance_cop, 0), 0);
}

function getProductBalanceUnit(product) {
  const balance = toNumber(product?.payment_balance_on_arrival_cop, NaN);
  if (Number.isFinite(balance)) {
    return Math.max(balance, 0);
  }
  const salePrice = Math.max(toNumber(product?.suggested_sale_price_cop, 0), 0);
  return Math.max(salePrice - getProductDueTodayUnit(product), 0);
}

function getProductById(productId) {
  return state.products.find((item) => Number(item.id) === Number(productId)) || null;
}

function isImmediateProduct(product) {
  return getProductAvailabilityType(product) === "immediate";
}

function isOutOfStock(product) {
  return isImmediateProduct(product) && toInteger(product?.current_stock, 0) <= 0;
}

function getProductStockLimit(product) {
  if (!isImmediateProduct(product)) {
    return Number.POSITIVE_INFINITY;
  }
  const currentStock = toInteger(product?.current_stock, 0);
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

function buildCartEntry(product, quantity) {
  return {
    product_id: Number(product.id),
    name: String(product.name || "Producto"),
    quantity: Math.max(1, toInteger(quantity, 1)),
    unit_sale_price_cop: Math.max(toNumber(product.suggested_sale_price_cop, 0), 0),
    availability_type: getProductAvailabilityType(product),
    availability_label: getProductAvailabilityLabel(product),
    payment_due_today_unit_cop: getProductDueTodayUnit(product),
    payment_balance_unit_cop: getProductBalanceUnit(product),
  };
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
          if (productId <= 0 || quantity <= 0) {
            return null;
          }
          return {
            product_id: productId,
            name: String(item.name || "Producto"),
            quantity,
            unit_sale_price_cop: Math.max(toNumber(item.unit_sale_price_cop, 0), 0),
            availability_type: String(item.availability_type || "preorder"),
            availability_label: String(item.availability_label || "Pedido 50/50"),
            payment_due_today_unit_cop: Math.max(toNumber(item.payment_due_today_unit_cop, 0), 0),
            payment_balance_unit_cop: Math.max(toNumber(item.payment_balance_unit_cop, 0), 0),
          };
        })
        .filter(Boolean);
    }
  } catch (_error) {
    restored = [];
  }
  state.cart = restored;
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
      return buildCartEntry(product, quantity);
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
    company?.tagline || "Compra directo desde el catalogo y elige entre entrega inmediata o pedido 50/50.";
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
  if (defaultPreorderAdvanceNode) {
    defaultPreorderAdvanceNode.textContent = `${toNumber(defaults?.preorder_advance_percent || defaults?.advance_percent || 0)}%`;
  }
}

function getSearchFilteredProducts() {
  const query = String(searchInput?.value || "")
    .trim()
    .toLowerCase();
  if (!query) {
    return state.products.slice();
  }
  return state.products.filter((item) => {
    const haystack = [
      item.name,
      item.reference,
      item.category,
      item.store,
      item.description,
      item.availability_label,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });
}

function sortProducts(items) {
  return items.slice().sort((left, right) => {
    const leftType = getProductAvailabilityType(left);
    const rightType = getProductAvailabilityType(right);
    const leftRank = leftType === "immediate" ? (isOutOfStock(left) ? 2 : 0) : 1;
    const rightRank = rightType === "immediate" ? (isOutOfStock(right) ? 2 : 0) : 1;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return String(left?.name || "").localeCompare(String(right?.name || ""), "es", {
      sensitivity: "base",
    });
  });
}

function getVisibleProducts() {
  const products = getSearchFilteredProducts();
  if (state.activeFilter === "all") {
    return sortProducts(products);
  }
  return sortProducts(products.filter((item) => getProductAvailabilityType(item) === state.activeFilter));
}

function renderFilterButtons() {
  filterButtons.forEach((button) => {
    const isActive = button.getAttribute("data-store-filter") === state.activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderProductsSummary(visibleProducts) {
  if (!productsSummaryNode) {
    return;
  }
  const query = String(searchInput?.value || "").trim();
  const totalProducts = state.products.length;
  const immediateTotal = state.products.filter((item) => isImmediateProduct(item)).length;
  const preorderTotal = totalProducts - immediateTotal;

  if (!totalProducts) {
    productsSummaryNode.textContent = "No hay productos publicados por ahora.";
    return;
  }

  if (!query && state.activeFilter === "all") {
    productsSummaryNode.textContent = `${totalProducts} producto(s): ${immediateTotal} de entrega inmediata y ${preorderTotal} por pedido 50/50.`;
    return;
  }

  const filterLabel =
    state.activeFilter === "immediate"
      ? "entrega inmediata"
      : state.activeFilter === "preorder"
        ? "pedido 50/50"
        : "catalogo";
  productsSummaryNode.textContent = `${visibleProducts.length} producto(s) visibles en ${filterLabel}.`;
}

function getSectionTitle(type) {
  return type === "immediate" ? "Entrega inmediata" : "Pedido 50/50";
}

function getSectionCopy(type) {
  return type === "immediate"
    ? "Referencias con stock disponible para compra y salida rapida."
    : "Referencias por encargo con 50% hoy y saldo al llegar a Colombia.";
}

function buildProductCardHtml(item) {
  const outOfStock = isOutOfStock(item);
  const cartItem = state.cart.find((entry) => Number(entry.product_id) === Number(item.id));
  const currentQty = outOfStock ? 0 : Math.max(1, Number(cartItem?.quantity || 1));
  const stockLimit = getProductStockLimit(item);
  const maxAttr = Number.isFinite(stockLimit) ? `max="${stockLimit}"` : "";
  const dueToday = getProductDueTodayUnit(item);
  const balanceLater = getProductBalanceUnit(item);
  const paymentLaterLabel = balanceLater > 0 ? `Luego ${formatCop(balanceLater)}` : "Sin saldo posterior";
  const availabilityType = getProductAvailabilityType(item);
  const availabilityChipClass = outOfStock
    ? "catalog-chip catalog-chip-muted"
    : availabilityType === "immediate"
      ? "catalog-chip catalog-chip-success"
      : "catalog-chip";
  const actionLabel = outOfStock
    ? "Sin stock"
    : availabilityType === "immediate"
      ? "Comprar hoy"
      : "Pedir 50/50";

  return `
    <article class="public-store-product-card${outOfStock ? " is-out-of-stock" : ""}">
      ${
        item.image_data_url
          ? `<img src="${item.image_data_url}" alt="${escapeHtml(item.name)}" />`
          : '<div class="public-store-image-placeholder" aria-hidden="true">Sin foto</div>'
      }
      <div class="public-store-product-content">
        <div class="public-store-product-top">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p class="public-store-product-meta">
              ${escapeHtml(item.reference || "Sin referencia")} - ${escapeHtml(
                item.category || "Sin categoria"
              )} - ${escapeHtml(item.store || "Sin tienda")}
            </p>
          </div>
          <span class="${availabilityChipClass}">${escapeHtml(
            String(item.availability_label || "Pedido 50/50")
          )}</span>
        </div>
        <p>${escapeHtml(item.description || "Producto disponible para compra online.")}</p>
        <div class="public-store-price-row">
          <strong>${formatCop(item.suggested_sale_price_cop)}</strong>
          <span>${formatUsd(item.price_usd_net)} + tax</span>
        </div>
        <div class="public-store-payment-strip">
          <span>Hoy ${formatCop(dueToday)}</span>
          <span>${paymentLaterLabel}</span>
        </div>
        <p class="public-store-payment-note">${escapeHtml(getProductTermsLabel(item))}</p>
        <div class="public-store-product-footer">
          <span class="catalog-chip${outOfStock ? " catalog-chip-muted" : ""}">${escapeHtml(
            String(item.stock_status_label || "")
          )}</span>
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
            ${actionLabel}
          </button>
        </div>
      </div>
    </article>
  `;
}

function buildSectionHtml(type, items) {
  if (!items.length) {
    return "";
  }
  return `
    <section class="public-store-section">
      <div class="panel-header-inline public-store-section-head">
        <div>
          <h3>${getSectionTitle(type)}</h3>
          <p>${getSectionCopy(type)}</p>
        </div>
        <span class="catalog-chip">${items.length} referencia(s)</span>
      </div>
      <div class="public-store-section-products">
        ${items.map((item) => buildProductCardHtml(item)).join("")}
      </div>
    </section>
  `;
}

function renderProducts() {
  if (!productsContainer) {
    return;
  }

  renderFilterButtons();
  const visibleProducts = getVisibleProducts();
  renderProductsSummary(visibleProducts);

  if (!visibleProducts.length) {
    productsContainer.className = "catalog-empty";
    productsContainer.innerHTML = "<p>No encontramos productos para ese filtro.</p>";
    return;
  }

  const immediateItems = visibleProducts.filter((item) => isImmediateProduct(item));
  const preorderItems = visibleProducts.filter((item) => !isImmediateProduct(item));
  const sections = [];

  if (state.activeFilter === "all" || state.activeFilter === "immediate") {
    sections.push(buildSectionHtml("immediate", immediateItems));
  }
  if (state.activeFilter === "all" || state.activeFilter === "preorder") {
    sections.push(buildSectionHtml("preorder", preorderItems));
  }

  productsContainer.className = "public-store-sections";
  productsContainer.innerHTML = sections.join("");
}

function calculateCartSummary() {
  return state.cart.reduce(
    (summary, item) => {
      const quantity = toInteger(item.quantity, 0);
      const unitSale = Math.max(toNumber(item.unit_sale_price_cop, 0), 0);
      const dueToday = Math.max(toNumber(item.payment_due_today_unit_cop, 0), 0) * quantity;
      const balanceLater = Math.max(toNumber(item.payment_balance_unit_cop, 0), 0) * quantity;
      const lineTotal = unitSale * quantity;
      summary.itemsCount += quantity;
      summary.grandTotalCop += lineTotal;
      summary.dueTodayCop += dueToday;
      summary.balanceOnArrivalCop += balanceLater;
      if (String(item.availability_type || "") === "immediate") {
        summary.immediateTotalCop += lineTotal;
      } else {
        summary.preorderTotalCop += lineTotal;
      }
      return summary;
    },
    {
      itemsCount: 0,
      grandTotalCop: 0,
      dueTodayCop: 0,
      balanceOnArrivalCop: 0,
      immediateTotalCop: 0,
      preorderTotalCop: 0,
    }
  );
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
  if (!cartItemsContainer || !cartCountNode || !cartTotalNode || !payTodayTotalNode || !balanceTotalNode) {
    return;
  }

  const summary = calculateCartSummary();
  cartCountNode.textContent = `${summary.itemsCount} producto(s)`;
  cartTotalNode.textContent = formatCop(summary.grandTotalCop);
  payTodayTotalNode.textContent = formatCop(summary.dueTodayCop);
  balanceTotalNode.textContent = formatCop(summary.balanceOnArrivalCop);
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
      const quantity = toInteger(item.quantity, 1);
      const lineTotal = Math.max(toNumber(item.unit_sale_price_cop, 0), 0) * quantity;
      const lineDueToday = Math.max(toNumber(item.payment_due_today_unit_cop, 0), 0) * quantity;
      const lineBalanceLater = Math.max(toNumber(item.payment_balance_unit_cop, 0), 0) * quantity;
      return `
        <article class="public-store-cart-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.availability_label || "Pedido")} - ${formatCop(
              item.unit_sale_price_cop
            )} x ${quantity}</p>
            <p class="public-store-cart-subtotal">Total: <strong>${formatCop(lineTotal)}</strong></p>
            <p class="public-store-cart-payment">Hoy ${formatCop(lineDueToday)}${
              lineBalanceLater > 0 ? ` - Luego ${formatCop(lineBalanceLater)}` : " - Sin saldo posterior"
            }</p>
          </div>
          <div class="public-store-cart-actions">
            <button type="button" data-cart-dec="${item.product_id}" aria-label="Restar">-</button>
            <input
              type="number"
              min="1"
              step="1"
              value="${quantity}"
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
    Object.assign(existing, buildCartEntry(product, clampedNextQuantity));
  } else {
    state.cart.push(buildCartEntry(product, clampedNextQuantity));
  }

  persistCart();
  renderProducts();
  renderCart();

  if (Number.isFinite(stockLimit) && clampedNextQuantity < baseQuantity + requestedQuantity) {
    setStatus(`${product.name} agregado. Solo quedan ${stockLimit} unidad(es).`, "success");
    return;
  }
  setStatus(`${product.name} agregado al pedido.`, "success");
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
    Object.assign(target, buildCartEntry(product, clampedQuantity));
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
  setStatus("Catalogo listo. Puedes elegir entre entrega inmediata o pedido 50/50.");
}

function readCheckoutPayload() {
  const data = new FormData(checkoutForm);
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
    advance_paid_cop: 0,
    notes: String(data.get("notes") || "").trim(),
  };
}

if (
  productsContainer &&
  cartItemsContainer &&
  cartCountNode &&
  cartTotalNode &&
  payTodayTotalNode &&
  balanceTotalNode &&
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

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextFilter = String(button.getAttribute("data-store-filter") || "all").trim();
      if (!nextFilter || nextFilter === state.activeFilter) {
        return;
      }
      state.activeFilter = nextFilter;
      renderProducts();
    });
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.cart.length) {
      setStatus("Agrega al menos un producto al carrito antes de enviar el pedido.", "error");
      return;
    }

    const payload = readCheckoutPayload();
    state.isSubmitting = true;
    syncCartControls();
    setStatus("Enviando tu pedido...");

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
      const expectedToday = Math.max(toNumber(response?.payment_summary?.expected_due_today_cop, 0), 0);
      const expectedBalance = Math.max(
        toNumber(response?.payment_summary?.expected_balance_on_arrival_cop, 0),
        0
      );
      let successMessage = `Pedido recibido.${orderId ? ` Codigo #${orderId}.` : ""}${
        quoteId ? ` Cotizacion #${quoteId}.` : ""
      }`;
      if (expectedToday > 0) {
        successMessage += ` Cobro esperado hoy: ${formatCop(expectedToday)}.`;
      }
      if (expectedBalance > 0) {
        successMessage += ` Saldo al llegar: ${formatCop(expectedBalance)}.`;
      }
      setStatus(successMessage, "success");
      state.cart = [];
      persistCart();
      checkoutForm.reset();
      renderProducts();
      renderCart();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No fue posible enviar el pedido.", "error");
    } finally {
      state.isSubmitting = false;
      syncCartControls();
    }
  });

  renderFilterButtons();
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
