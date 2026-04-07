const quoteForm = document.getElementById("quote-form");
const clientForm = document.getElementById("client-form");
const productForm = document.getElementById("product-form");
const productSelectOptions = document.getElementById("quote-products-options");
const clientSelectOptions = document.getElementById("clients-options");
const productSelect = document.getElementById("product-select");
const clientSelect = document.getElementById("client-select");
const addProductButton = document.getElementById("add-product-button");
const addQuoteItemButton = document.getElementById("add-quote-item-button");
const quoteLineItemsContainer = document.getElementById("quote-line-items");
const quoteLiveSummaryContainer = document.getElementById("quote-live-summary");
const quoteModeBadge = document.getElementById("quote-mode-badge");
const cancelEditButton = document.getElementById("cancel-edit-button");
const resultsContainer = document.getElementById("results");
const statusMessage = document.getElementById("status-message");
const historyContainer = document.getElementById("history");
const clientsListContainer = document.getElementById("clients-list");
const productsListContainer = document.getElementById("products-list");
const ordersListContainer = document.getElementById("orders-list");
const dashboardPeriodSelect = document.getElementById("dashboard-period");
const dashboardSummaryContainer = document.getElementById("dashboard-summary");
const dashboardExpensesContainer = document.getElementById("dashboard-expenses");
const dashboardClientsContainer = document.getElementById("dashboard-clients");
const dashboardProductsContainer = document.getElementById("dashboard-products");
const followupSummaryContainer = document.getElementById("followup-summary");
const followupAgendaContainer = document.getElementById("followup-agenda");
const followupPendingContainer = document.getElementById("followup-pending");
const followupPipelineContainer = document.getElementById("followup-pipeline");
const clientDetailSection = document.getElementById("client-detail-section");
const clientDetailContainer = document.getElementById("client-detail");
const clientDetailClearButton = document.getElementById("client-detail-clear");
const productDetailSection = document.getElementById("product-detail-section");
const productDetailContainer = document.getElementById("product-detail");
const productDetailClearButton = document.getElementById("product-detail-clear");
const moduleMenu = document.getElementById("module-menu");
const menuToggleButton = document.getElementById("menu-toggle-button");
const menuOverlay = document.getElementById("menu-overlay");
const modulePages = Array.from(document.querySelectorAll("[data-module-page]"));
const moduleLinks = Array.from(document.querySelectorAll("[data-module-link]"));
const expenseForm = document.getElementById("expense-form");
const expenseCategorySelect = document.getElementById("expense-category");
const expensesListContainer = document.getElementById("expenses-list");
const orderStatusForm = document.getElementById("order-status-form");
const orderStatusesListContainer = document.getElementById("order-statuses-list");
const orderStatusInsertAfterSelect = document.getElementById("order-status-insert-after");
const productCategoryForm = document.getElementById("product-category-form");
const productStoreForm = document.getElementById("product-store-form");
const productCategoriesListContainer = document.getElementById("product-categories-list");
const productStoresListContainer = document.getElementById("product-stores-list");
const productCategoryOptions = document.getElementById("product-categories-options");
const productStoreOptions = document.getElementById("product-stores-options");
const productCategoryInput = document.getElementById("product-category-input");
const productStoreInput = document.getElementById("product-store-input");
const pendingForm = document.getElementById("pending-form");
const pendingClientSelect = document.getElementById("pending-client-select");
const pendingCategoryInput = document.getElementById("pending-category-input");
const pendingStoreInput = document.getElementById("pending-store-input");
const pendingListContainer = document.getElementById("pending-list");
const pendingOriginBadge = document.getElementById("pending-origin-badge");
const saveButton = document.getElementById("save-button");
const brandLogo = document.querySelector(".brand-logo");
const brandKicker = document.querySelector(".brand-kicker");
const brandSubtitle = document.querySelector(".brand-subtitle");
const brandPill = document.querySelector(".brand-pill");
const heroEyebrow = document.querySelector(".eyebrow");
const heroCopy = document.querySelector(".hero-copy");
const heroCardLabel = document.querySelector(".hero-card span");
const heroCardTitle = document.querySelector(".hero-card strong");
const heroCardCopy = document.querySelector(".hero-card p");
const currentUserLabel = document.querySelector("[data-current-user]");
const logoutButton = document.getElementById("logout-button");
const purchaseTypeHelper = document.getElementById("purchase-type-helper");

const state = {
  session: null,
  lastPayload: null,
  lastResult: null,
  clients: [],
  products: [],
  productCategories: [],
  productStores: [],
  pendingRequests: [],
  pendingStatuses: [],
  pendingPriorities: [],
  orders: [],
  expenses: [],
  expenseCategories: [],
  orderStatuses: [],
  dashboardPeriod: "daily",
  dashboard: null,
  followup: null,
  activeModule: "dashboard",
  menuOpen: false,
  clientDetail: null,
  productDetail: null,
  pendingQuoteSeedId: null,
  quoteCalculationTimer: 0,
  quoteCalculationRequestId: 0,
  quoteLineItems: [],
  editingQuoteId: null,
  editingQuoteItemIndex: null,
};

const autocompleteControllers = [];

const quoteElements = quoteForm.elements;
const QUOTE_AUTO_CALC_FIELDS = new Set([
  "purchase_type",
  "quantity",
  "price_usd_net",
  "tax_usa_percent",
  "travel_cost_usd",
  "locker_shipping_usd",
  "exchange_rate_cop",
  "local_costs_cop",
  "desired_margin_percent",
  "advance_percent",
  "final_sale_price_cop",
  "final_advance_cop",
]);

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

const percentFormatter = new Intl.NumberFormat("es-CO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
});
const COMPACT_NAV_BREAKPOINT = 1100;

function normalizeAdminCopy() {
  const adminSection = document.getElementById("administracion");
  if (!adminSection || !orderStatusForm) {
    return;
  }

  const adminMenuLink = document.querySelector('.module-link[href="#administracion"] strong');
  if (adminMenuLink) {
    adminMenuLink.textContent = "Administracion";
  }

  const adminHeaders = adminSection.querySelectorAll(".panel-header");
  if (adminHeaders[0]) {
    const heading = adminHeaders[0].querySelector("h2");
    const copy = adminHeaders[0].querySelector("p");
    if (heading) {
      heading.textContent = "Administracion de estados";
    }
    if (copy) {
      copy.textContent = "Crea nuevos pasos del flujo y ubicalos en el orden correcto.";
    }
  }

  if (adminHeaders[1]) {
    const copy = adminHeaders[1].querySelector("p");
    if (copy) {
      copy.textContent = "Estos son los pasos secuenciales que hoy usa la operacion.";
    }
  }

  const formLabels = orderStatusForm.querySelectorAll("label > span");
  if (formLabels[1]) {
    formLabels[1].textContent = "Ubicar despues de";
  }
  if (formLabels[2]) {
    formLabels[2].textContent = "Descripcion";
  }

  const descriptionField = orderStatusForm.elements.namedItem("description");
  if (descriptionField) {
    descriptionField.placeholder = "Explica que significa este estado dentro de la operacion.";
  }

  const initialEmptyState = orderStatusesListContainer.querySelector("p");
  if (initialEmptyState) {
    initialEmptyState.textContent = "Aun no hay estados configurados.";
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function isCompactNavigation() {
  return window.innerWidth <= COMPACT_NAV_BREAKPOINT;
}

function setMenuOpen(isOpen) {
  const nextState = Boolean(isOpen) && isCompactNavigation();
  state.menuOpen = nextState;
  document.body.classList.toggle("menu-open", nextState);
  moduleMenu?.classList.toggle("is-open", nextState);
  menuOverlay?.classList.toggle("is-visible", nextState);
  menuToggleButton?.classList.toggle("is-active", nextState);
  if (menuToggleButton) {
    menuToggleButton.setAttribute("aria-expanded", nextState ? "true" : "false");
  }
}

function syncResponsiveShell() {
  if (!isCompactNavigation() && state.menuOpen) {
    setMenuOpen(false);
  }
}

const MODULE_ALIASES = {
  dashboard: "dashboard",
  seguimiento: "seguimiento",
  pendientes: "pendientes",
  comercial: "comercial",
  cotizacion: "comercial",
  historial: "comercial",
  clientes: "comercial",
  productos: "comercial",
  compras: "compras",
  gastos: "gastos",
  administracion: "administracion",
};

function resolveModuleFromHash(hashValue) {
  const cleanHash = String(hashValue || "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  return MODULE_ALIASES[cleanHash] || "dashboard";
}

function setActiveModule(moduleKey) {
  state.activeModule = moduleKey;

  modulePages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.modulePage === moduleKey);
  });

  moduleLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.moduleLink === moduleKey);
  });

  if (state.menuOpen) {
    setMenuOpen(false);
  }
}

function syncModuleFromHash() {
  const rawHash = String(window.location.hash || "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
  const moduleKey = resolveModuleFromHash(rawHash);
  setActiveModule(moduleKey);

  if (rawHash && rawHash !== moduleKey) {
    const target = document.getElementById(rawHash);
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
      });
    }
  }
}

function clientSearchLabel(client) {
  if (!client) {
    return "";
  }
  const parts = [client.name];
  if (client.phone) {
    parts.push(client.phone);
  }
  if (client.city) {
    parts.push(client.city);
  }
  return parts.filter(Boolean).join(" · ");
}

function productSearchLabel(product) {
  if (!product) {
    return "";
  }
  const parts = [productLabel(product)];
  if (product.store) {
    parts.push(product.store);
  }
  if (product.category) {
    parts.push(product.category);
  }
  return parts.filter(Boolean).join(" · ");
}

function updateSearchableOptions(dataList, items, labelBuilder) {
  if (!dataList) {
    return;
  }
  dataList.innerHTML = items
    .map((item) => `<option value="${escapeHtml(labelBuilder(item))}"></option>`)
    .join("");
}

function updateNameOptions(dataList, items) {
  if (!dataList) {
    return;
  }
  dataList.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.name)}"></option>`)
    .join("");
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es-CO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createAutocompleteController(input, config) {
  if (!input) {
    return null;
  }

  const {
    getItems,
    getLabel,
    getSearchText,
    onSelect,
    minChars = 1,
    maxItems = 8,
    emptyMessage = "Sin resultados",
  } = config;

  const host = input.closest(".inline-input-action") || input.parentElement;
  if (!host) {
    return null;
  }

  host.classList.add("autocomplete-host");
  const menu = document.createElement("div");
  menu.className = "autocomplete-menu";
  menu.hidden = true;
  host.appendChild(menu);

  let matches = [];

  function hide() {
    menu.hidden = true;
    host.classList.remove("is-open");
    menu.innerHTML = "";
    matches = [];
  }

  function selectItem(item) {
    input.value = getLabel(item);
    hide();
    if (onSelect) {
      onSelect(item);
    }
  }

  function render(query) {
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery.length < minChars) {
      hide();
      return;
    }

    matches = (getItems() || [])
      .filter((item) => normalizeSearchText(getSearchText(item)).includes(normalizedQuery))
      .slice(0, maxItems);

    if (!matches.length) {
      menu.hidden = false;
      host.classList.add("is-open");
      menu.innerHTML = `<button type="button" class="autocomplete-empty" tabindex="-1">${escapeHtml(
        emptyMessage
      )}</button>`;
      return;
    }

    menu.hidden = false;
    host.classList.add("is-open");
    menu.innerHTML = matches
      .map(
        (item, index) => `
          <button type="button" class="autocomplete-option" data-autocomplete-index="${index}">
            ${escapeHtml(getLabel(item))}
          </button>
        `
      )
      .join("");
  }

  input.addEventListener("input", () => {
    render(input.value);
  });

  input.addEventListener("focus", () => {
    render(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
      return;
    }

    if (event.key === "Enter" && matches.length) {
      event.preventDefault();
      selectItem(matches[0]);
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(hide, 120);
  });

  menu.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-autocomplete-index]");
    if (!option) {
      return;
    }
    const index = Number(option.getAttribute("data-autocomplete-index"));
    if (Number.isNaN(index) || !matches[index]) {
      return;
    }
    selectItem(matches[index]);
  });

  return {
    refresh() {
      render(input.value);
    },
    hide,
  };
}

function findClientBySearchValue(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) {
    return null;
  }
  const loweredValue = cleanValue.toLocaleLowerCase("es-CO");
  return (
    state.clients.find((item) => clientSearchLabel(item) === cleanValue) ||
    state.clients.find(
      (item) => String(item.name || "").trim().toLocaleLowerCase("es-CO") === loweredValue
    ) ||
    null
  );
}

function findProductBySearchValue(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) {
    return null;
  }
  const loweredValue = cleanValue.toLocaleLowerCase("es-CO");
  return (
    state.products.find((item) => productSearchLabel(item) === cleanValue) ||
    state.products.find((item) => productLabel(item) === cleanValue) ||
    state.products.find(
      (item) => String(item.name || "").trim().toLocaleLowerCase("es-CO") === loweredValue
    ) ||
    null
  );
}

function invalidateQuoteCalculation() {
  if (state.quoteCalculationTimer) {
    window.clearTimeout(state.quoteCalculationTimer);
    state.quoteCalculationTimer = 0;
  }
  state.quoteCalculationRequestId += 1;
  state.lastPayload = null;
  state.lastResult = null;
  renderQuoteLiveSummary();
  syncSaveButtonState();
}

function clearClientFromQuote() {
  setQuoteField("client_id", "");
  setQuoteField("client_name", "");
  renderQuoteLiveSummary();
}

function clearProductFromQuote() {
  setQuoteField("product_id", "");
  setQuoteField("product_name", "");
  setQuoteField("reference", "");
  setQuoteField("category", "");
  setQuoteField("store", "");
  setQuoteField("quantity", 1);
  if (productSelect) {
    productSelect.value = "";
  }
  renderQuoteLiveSummary();
}

function syncSaveButtonState() {
  if (!saveButton) {
    return;
  }
  saveButton.disabled = !state.quoteLineItems.length && !state.lastResult;
}

function ensureQuoteClientSelection(payload) {
  if (!payload.client_id || !payload.client_name) {
    throw new Error("Selecciona un cliente guardado.");
  }
}

function setQuoteItemEditorState(index = null) {
  state.editingQuoteItemIndex = Number.isInteger(index) && index >= 0 ? index : null;
  if (addQuoteItemButton) {
    addQuoteItemButton.textContent =
      state.editingQuoteItemIndex === null
        ? "Agregar producto a la cotizacion"
        : "Actualizar producto en la cotizacion";
  }
  renderQuoteLiveSummary();
}

function loadProductIntoCalculator(product) {
  if (!product) {
    return;
  }

  invalidateQuoteCalculation();
  setQuoteItemEditorState(null);
  setQuoteField("product_id", product.id);
  setQuoteField("product_name", product.name);
  setQuoteField("reference", product.reference || "");
  setQuoteField("category", product.category || "");
  setQuoteField("store", product.store || "");
  setQuoteField("quantity", 1);
  setQuoteField("price_usd_net", Number(product.price_usd_net || 0).toFixed(2));
  setQuoteField("tax_usa_percent", Number(product.tax_usa_percent || 0).toFixed(2));
  setQuoteField("locker_shipping_usd", Number(product.locker_shipping_usd || 0).toFixed(2));
  if (productSelect) {
    productSelect.value = productSearchLabel(product);
  }
  if (!quoteElements.namedItem("notes").value.trim() && product.notes) {
    setQuoteField("notes", product.notes);
  }
  renderQuoteLiveSummary();
  scheduleQuoteCalculation({ immediate: true });
}

function quoteLineSummary(item) {
  return item.quantity > 1 ? `${item.product_name} x${item.quantity}` : item.product_name;
}

function buildQuoteProductSummary(items) {
  if (!items.length) {
    return "";
  }
  if (items.length === 1) {
    return quoteLineSummary(items[0]);
  }
  if (items.length <= 3) {
    return items.map((item) => quoteLineSummary(item)).join(" + ");
  }
  return `${quoteLineSummary(items[0])} + ${items.length - 1} productos mas`;
}

function ensureQuoteItemText() {
  const field = quoteElements.namedItem("client_quote_items_text");
  if (!field) {
    return;
  }
  const shouldAutofill = !field.value.trim() || field.dataset.autoGenerated === "true";
  if (!shouldAutofill) {
    return;
  }
  field.value = state.quoteLineItems
    .map((item) => {
      const quantityPrefix = item.quantity > 1 ? `${item.quantity} x ` : "";
      return `${quantityPrefix}${productLabel(item)}`;
    })
    .join("\n");
  field.dataset.autoGenerated = state.quoteLineItems.length ? "true" : "";
}

function normalizeStoredQuoteItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const input = item.input && typeof item.input === "object" ? item.input : item;
  const result = item.result && typeof item.result === "object" ? item.result : null;
  const lineItem =
    Array.isArray(result?.line_items) && result.line_items.length ? result.line_items[0] : null;
  const finalData = result?.final || {};
  const costsData = result?.costs || {};
  const quantity = Number(item.quantity || input.quantity || lineItem?.quantity || 1);

  return {
    product_id: toNumberOrNull(item.product_id ?? input.product_id),
    product_name: String(item.product_name || input.product_name || "Producto").trim(),
    reference: String(item.reference || input.reference || lineItem?.reference || "").trim(),
    category: String(item.category || input.category || lineItem?.category || "").trim(),
    store: String(item.store || input.store || lineItem?.store || "").trim(),
    quantity: Math.max(1, quantity || 1),
    purchase_type: String(item.purchase_type || input.purchase_type || "online").trim().toLowerCase(),
    input,
    result,
    sale_price_cop: Number(item.sale_price_cop || finalData.sale_price_cop || 0),
    advance_cop: Number(item.advance_cop || finalData.advance_cop || 0),
    profit_cop: Number(item.profit_cop || finalData.profit_cop || 0),
    real_cost_cop: Number(item.real_cost_cop || costsData.real_total_cost_cop || 0),
  };
}

/* Duplicate legacy renderer kept commented out; the later definition is the active one.
function renderQuoteLineItems() {
  if (!quoteLineItemsContainer) {
    return;
  }

  if (!state.quoteLineItems.length) {
    quoteLineItemsContainer.className = "catalog-empty";
    quoteLineItemsContainer.innerHTML = "<p>Aun no has agregado productos a esta cotizacion.</p>";
    renderQuoteLiveSummary();
    return;
  }

  quoteLineItemsContainer.className = "quote-line-items";
  quoteLineItemsContainer.innerHTML = state.quoteLineItems
    .map(
      (item, index) => `
        <article class="quote-line-card">
          <div>
            <strong>${escapeHtml(productLabel(item))}</strong>
            <p>
              ${escapeHtml(item.category || "Sin categoria")}
              ${item.store ? ` · ${escapeHtml(item.store)}` : ""}
            </p>
          </div>
          <div class="quote-line-meta">
            <span>${formatUsd(item.unit_price_usd_net)} base</span>
            <span>${Number(item.unit_tax_usa_percent || 0)}% tax</span>
            <span>${formatUsd(item.unit_locker_shipping_usd)} envio</span>
          </div>
          <div class="quote-line-actions">
            <label>
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                step="1"
                value="${Number(item.quantity || 1)}"
                data-quote-line-quantity="${index}"
              />
            </label>
            <button
              type="button"
              class="history-action-button history-action-button-secondary"
              data-remove-quote-line="${index}"
            >
              Quitar
            </button>
          </div>
        </article>
      `
    )
    .join("");
}
*/

function syncQuoteBuilderState({ scheduleCalculation = true } = {}) {
  syncQuoteLineItemTotals();
  renderQuoteLineItems();
  ensureQuoteItemText();
  if (scheduleCalculation) {
    scheduleQuoteCalculation();
  }
}

function addProductToQuote(product, { quantity = 1, replace = false } = {}) {
  if (!product) {
    return;
  }

  invalidateQuoteCalculation();
  const nextItems = replace ? [] : [...state.quoteLineItems];
  const existing = nextItems.find((item) => String(item.product_id) === String(product.id));
  if (existing) {
    existing.quantity = Math.max(1, Number(existing.quantity || 0) + Number(quantity || 1));
  } else {
    const item = buildQuoteLineItemFromProduct(product);
    item.quantity = Math.max(1, Number(quantity || 1));
    nextItems.push(item);
  }

  state.quoteLineItems = nextItems;
  if (productSelect) {
    productSelect.value = "";
  }
  syncQuoteBuilderState();
}

function removeQuoteLineItem(index) {
  invalidateQuoteCalculation();
  state.quoteLineItems = state.quoteLineItems.filter((_, itemIndex) => itemIndex !== index);
  syncQuoteBuilderState();
}

function updateQuoteLineItemQuantity(index, quantityValue) {
  const quantity = Math.max(1, Number(quantityValue || 1));
  if (!state.quoteLineItems[index]) {
    return;
  }
  invalidateQuoteCalculation();
  state.quoteLineItems[index].quantity = quantity;
  syncQuoteBuilderState();
}

function resetQuoteEditingState() {
  state.editingQuoteId = null;
  if (quoteModeBadge) {
    quoteModeBadge.textContent = "Nueva cotizacion";
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = true;
  }
  saveButton.textContent = "Guardar cotizacion";
}

function applyQuoteRecordToForm(record) {
  const input = record.input || {};
  state.editingQuoteId = record.id;
  state.quoteLineItems = Array.isArray(input.line_items) && input.line_items.length
    ? input.line_items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        reference: item.reference || "",
        category: item.category || "",
        store: item.store || "",
        quantity: Number(item.quantity || 1),
        unit_price_usd_net: Number(item.unit_price_usd_net || 0),
        unit_tax_usa_percent: Number(item.unit_tax_usa_percent || 0),
        unit_locker_shipping_usd: Number(item.unit_locker_shipping_usd || 0),
      }))
    : [
        {
          product_id: input.product_id,
          product_name: input.product_name || record.product_name || "Producto",
          reference: "",
          category: "",
          store: "",
          quantity: 1,
          unit_price_usd_net: Number(input.price_usd_net || 0),
          unit_tax_usa_percent: Number(input.tax_usa_percent || 0),
          unit_locker_shipping_usd: Number(input.locker_shipping_usd || 0),
        },
      ];

  const client = state.clients.find((item) => String(item.id) === String(input.client_id));
  if (client) {
    clientSelect.value = clientSearchLabel(client);
  } else {
    clientSelect.value = input.client_name || record.client_name || "";
  }

  setQuoteField("client_id", input.client_id || "");
  setQuoteField("client_name", input.client_name || record.client_name || "");
  setQuoteField("purchase_type", input.purchase_type || "online");
  setQuoteField("travel_cost_usd", input.travel_cost_usd || 0);
  setQuoteField("exchange_rate_cop", input.exchange_rate_cop || 0);
  setQuoteField("local_costs_cop", input.local_costs_cop || 0);
  setQuoteField("desired_margin_percent", input.desired_margin_percent || 0);
  setQuoteField("advance_percent", input.advance_percent || 0);
  setQuoteField("final_sale_price_cop", input.final_sale_price_cop ?? "");
  setQuoteField("final_advance_cop", input.final_advance_cop ?? "");
  setQuoteField("client_quote_items_text", input.client_quote_items_text || "");
  const clientQuoteItemsField = quoteElements.namedItem("client_quote_items_text");
  if (clientQuoteItemsField) {
    clientQuoteItemsField.dataset.autoGenerated = input.client_quote_items_text ? "false" : "true";
  }
  setQuoteField("notes", input.notes || record.notes || "");

  syncPurchaseTypeUi();
  syncQuoteBuilderState({ scheduleCalculation: false });
  state.lastPayload = input;
  state.lastResult = record.result;
  renderResults(record.result);
  saveButton.disabled = false;

  if (quoteModeBadge) {
    quoteModeBadge.textContent = `Editando cotizacion #${record.id}`;
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = false;
  }
  saveButton.textContent = "Actualizar cotizacion";
  window.location.hash = "cotizacion";
}

function getQuoteField(name) {
  return quoteElements.namedItem(name);
}

function getPurchaseType() {
  return String(getQuoteField("purchase_type")?.value || "online").trim().toLowerCase() || "online";
}

function syncPurchaseTypeUi() {
  const purchaseType = getPurchaseType();
  const isTravel = purchaseType === "travel";
  const travelField = getQuoteField("travel_cost_usd");
  const localCostsField = getQuoteField("local_costs_cop");
  const lockerField = getQuoteField("locker_shipping_usd");

  if (travelField) {
    travelField.disabled = !isTravel;
  }
  if (localCostsField) {
    localCostsField.disabled = !isTravel;
  }
  if (purchaseTypeHelper) {
    purchaseTypeHelper.textContent = isTravel
      ? "Modo viaje: puedes sumar costo de viaje, gastos locales y tambien envio/casillero si una parte viene por esa via. En compras definiras si el producto viaja por casillero o por maleta."
      : "Modo online: se usa envio/casillero. El costo de viaje y los gastos locales no entran al calculo.";
  }
}

function shouldAutoCalculateQuote(target) {
  const fieldName = String(target?.name || "").trim();
  return QUOTE_AUTO_CALC_FIELDS.has(fieldName);
}

async function calculateQuoteFromForm({ manual = false } = {}) {
  if (state.quoteCalculationTimer) {
    window.clearTimeout(state.quoteCalculationTimer);
    state.quoteCalculationTimer = 0;
  }

  if (!quoteForm.checkValidity()) {
    if (manual) {
      quoteForm.reportValidity();
      statusMessage.textContent = "Completa los datos requeridos para calcular la cotizacion.";
    }
    return false;
  }

  const payload = readQuotePayload();
  try {
    ensureQuoteSelection(payload);
  } catch (error) {
    if (manual) {
      statusMessage.textContent = error.message;
    }
    return false;
  }

  const requestId = state.quoteCalculationRequestId + 1;
  state.quoteCalculationRequestId = requestId;
  saveButton.disabled = true;
  statusMessage.textContent = manual
    ? "Calculando cotizacion..."
    : "Actualizando cotizacion automaticamente...";

  try {
    const response = await requestJson("/api/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (requestId !== state.quoteCalculationRequestId) {
      return false;
    }

    state.lastPayload = payload;
    state.lastResult = response.result;

    renderResults(state.lastResult);
    statusMessage.textContent = manual
      ? "Resultado actualizado. Ya puedes guardar la cotizacion."
      : "Cotizacion actualizada automaticamente. Ya puedes guardar la cotizacion.";
    saveButton.disabled = false;
    return true;
  } catch (error) {
    if (requestId !== state.quoteCalculationRequestId) {
      return false;
    }

    statusMessage.textContent = error.message;
    resultsContainer.className = "results-empty";
    resultsContainer.innerHTML = "<p>No fue posible calcular con los datos enviados.</p>";
    return false;
  }
}

function scheduleQuoteCalculation({ immediate = false } = {}) {
  if (state.quoteCalculationTimer) {
    window.clearTimeout(state.quoteCalculationTimer);
    state.quoteCalculationTimer = 0;
  }

  const runCalculation = () => {
    state.quoteCalculationTimer = 0;
    void calculateQuoteFromForm();
  };

  if (immediate) {
    runCalculation();
    return;
  }

  state.quoteCalculationTimer = window.setTimeout(runCalculation, 320);
}

function applyCompanyBranding(session) {
  const company = session?.company || {};
  const user = session?.user || {};
  const brandName = company.brand_name || company.name || "Portal comercial";
  const companyName = company.name || brandName;
  const tagline = company.tagline || "Tu operacion comercial queda separada por empresa.";
  const logoPath = company.logo_path || "/static/assets/fershop-logo-crop.jpg";

  document.title = `${brandName} | Calculadora`;
  if (brandLogo) {
    brandLogo.src = logoPath;
    brandLogo.alt = `Logo ${brandName}`;
  }

  setText(brandKicker, brandName);
  setText(brandSubtitle, tagline);
  setText(brandPill, `${companyName} activa`);
  setText(heroEyebrow, companyName);
  setText(heroCopy, tagline);
  setText(heroCardLabel, "Empresa autenticada");
  setText(heroCardTitle, brandName);
  setText(
    heroCardCopy,
    "Esta sesion carga clientes, productos, cotizaciones, compras y estados solo de la empresa autenticada."
  );
  setText(currentUserLabel, user.display_name || user.username || "Usuario");
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseCurrencyInput(value) {
  const normalized = String(value ?? "").replace(/\D/g, "");

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function setQuoteField(name, value) {
  const field = quoteElements.namedItem(name);
  if (field) {
    field.value = value ?? "";
  }
}

function readQuotePayload() {
  const data = new FormData(quoteForm);
  const lineItems = state.quoteLineItems.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    reference: item.reference || "",
    category: item.category || "",
    store: item.store || "",
    quantity: Number(item.quantity || 1),
    unit_price_usd_net: Number(item.unit_price_usd_net || 0),
    unit_tax_usa_percent: Number(item.unit_tax_usa_percent || 0),
    unit_locker_shipping_usd: Number(item.unit_locker_shipping_usd || 0),
  }));
  return {
    product_id: lineItems.length === 1 ? toNumberOrNull(lineItems[0].product_id) : null,
    client_id: toNumberOrNull(data.get("client_id")),
    product_name: buildQuoteProductSummary(state.quoteLineItems),
    client_name: String(data.get("client_name") || "").trim(),
    purchase_type: String(data.get("purchase_type") || "online").trim().toLowerCase() || "online",
    notes: String(data.get("notes") || "").trim(),
    client_quote_items_text: String(data.get("client_quote_items_text") || "").trim(),
    line_items: lineItems,
    price_usd_net: Number(data.get("price_usd_net") || 0),
    tax_usa_percent: Number(data.get("tax_usa_percent") || 0),
    travel_cost_usd: Number(data.get("travel_cost_usd") || 0),
    locker_shipping_usd: Number(data.get("locker_shipping_usd") || 0),
    exchange_rate_cop: Number(data.get("exchange_rate_cop") || 0),
    local_costs_cop: Number(data.get("local_costs_cop") || 0),
    desired_margin_percent: Number(data.get("desired_margin_percent") || 0),
    advance_percent: Number(data.get("advance_percent") || 0),
    final_sale_price_cop: toNumberOrNull(data.get("final_sale_price_cop")),
    final_advance_cop: toNumberOrNull(data.get("final_advance_cop")),
  };
}

function readClientPayload() {
  const data = new FormData(clientForm);
  return {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    city: String(data.get("city") || "").trim(),
    address: String(data.get("address") || "").trim(),
    neighborhood: String(data.get("neighborhood") || "").trim(),
    preferred_contact_channel: String(data.get("preferred_contact_channel") || "").trim(),
    preferred_payment_method: String(data.get("preferred_payment_method") || "").trim(),
    interests: String(data.get("interests") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
  };
}

function readProductPayload() {
  const data = new FormData(productForm);
  return {
    name: String(data.get("name") || "").trim(),
    reference: String(data.get("reference") || "").trim(),
    category: String(data.get("category") || "").trim(),
    store: String(data.get("store") || "").trim(),
    price_usd_net: Number(data.get("price_usd_net") || 0),
    tax_usa_percent: Number(data.get("tax_usa_percent") || 0),
    locker_shipping_usd: Number(data.get("locker_shipping_usd") || 0),
    notes: String(data.get("notes") || "").trim(),
  };
}

function readPendingPayload() {
  const data = new FormData(pendingForm);
  return {
    client_id: toNumberOrNull(data.get("client_id")),
    client_name: String(pendingClientSelect?.value || "").trim(),
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || "").trim(),
    desired_store: String(data.get("desired_store") || "").trim(),
    desired_size: String(data.get("desired_size") || "").trim(),
    desired_color: String(data.get("desired_color") || "").trim(),
    quantity: Number(data.get("quantity") || 1),
    budget_cop: Number(data.get("budget_cop") || 0),
    priority_key: String(data.get("priority_key") || "normal").trim().toLowerCase() || "normal",
    status_key: "new",
    due_date: String(data.get("due_date") || "").trim(),
    reference_url: String(data.get("reference_url") || "").trim(),
    reference_notes: String(data.get("reference_notes") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
  };
}

function readExpensePayload() {
  const data = new FormData(expenseForm);
  return {
    expense_date: String(data.get("expense_date") || "").trim(),
    category_key: String(data.get("category_key") || "").trim(),
    concept: String(data.get("concept") || "").trim(),
    amount_cop: Number(data.get("amount_cop") || 0),
    notes: String(data.get("notes") || "").trim(),
  };
}

function readOrderStatusPayload() {
  const data = new FormData(orderStatusForm);
  return {
    label: String(data.get("label") || "").trim(),
    description: String(data.get("description") || "").trim(),
    insert_after_key: String(data.get("insert_after_key") || "").trim(),
  };
}

function formatCop(value) {
  return copFormatter.format(value || 0);
}

function formatUsd(value) {
  return usdFormatter.format(value || 0);
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "N/D";
  }
  return percentFormatter.format(value);
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return toDateInputValue(parsed);
}

function formatStoredDate(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "Pendiente";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return shortDateFormatter.format(new Date(year, month - 1, day));
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return dateFormatter.format(parsed);
}

function productLabel(product) {
  const productName = String(product?.name || product?.product_name || "").trim() || "Producto";
  const reference = String(product?.reference || "").trim();
  return reference ? `${productName} (${reference})` : productName;
}

function renderQuoteLiveSummary() {
  if (!quoteLiveSummaryContainer) {
    return;
  }

  const clientName = String(quoteElements.namedItem("client_name")?.value || clientSelect?.value || "").trim();
  const productName = String(
    quoteElements.namedItem("product_name")?.value || productSelect?.value || ""
  ).trim();
  const totalSale = state.quoteLineItems.reduce((total, item) => total + Number(item.sale_price_cop || 0), 0);
  const finalData = state.lastResult?.final || null;
  const workingValue = finalData ? formatCop(finalData.sale_price_cop) : "Sin calcular";
  const itemsLabel = state.quoteLineItems.length
    ? `${state.quoteLineItems.length} item${state.quoteLineItems.length === 1 ? "" : "s"}`
    : "Sin items";
  const editorLabel =
    state.editingQuoteItemIndex === null
      ? "Producto actual"
      : `Editando item ${state.editingQuoteItemIndex + 1}`;

  if (!clientName && !productName && !state.quoteLineItems.length && !finalData) {
    quoteLiveSummaryContainer.className = "quote-live-summary quote-live-summary-empty";
    quoteLiveSummaryContainer.innerHTML =
      "<p>Selecciona cliente y producto para empezar a cotizar con mas rapidez.</p>";
    return;
  }

  quoteLiveSummaryContainer.className = "quote-live-summary";
  quoteLiveSummaryContainer.innerHTML = `
    <div class="quote-live-summary-grid">
      <article class="quote-live-summary-card">
        <span>Cliente</span>
        <strong>${escapeHtml(clientName || "Sin seleccionar")}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>${escapeHtml(editorLabel)}</span>
        <strong>${escapeHtml(productName || "Carga un producto")}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>Calculo actual</span>
        <strong>${workingValue}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>Cotizacion armada</span>
        <strong>${escapeHtml(itemsLabel)}</strong>
        <small>${state.quoteLineItems.length ? formatCop(totalSale) : "Aun no hay total acumulado"}</small>
      </article>
    </div>
  `;
}

function updateExpenseCategoryOptions(items) {
  const currentValue = expenseCategorySelect.value;
  const options = ['<option value="">Selecciona una categoria</option>'];
  items.forEach((item) => {
    options.push(`<option value="${item.key}">${escapeHtml(item.label)}</option>`);
  });
  expenseCategorySelect.innerHTML = options.join("");
  if (items.some((item) => item.key === currentValue)) {
    expenseCategorySelect.value = currentValue;
  }
}

function updateSelectOptions(select, items, placeholder, labelBuilder) {
  const currentValue = select.value;
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`];
  items.forEach((item) => {
    options.push(`<option value="${item.id}">${escapeHtml(labelBuilder(item))}</option>`);
  });
  select.innerHTML = options.join("");
  if (items.some((item) => String(item.id) === currentValue)) {
    select.value = currentValue;
  }
}

function makeMetricCard(title, value, detail) {
  return `
    <article class="metric-card">
      <span>${title}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>
  `;
}

function makeDetailList(items, formatter) {
  return items
    .map(
      ([label, value]) => `
        <div class="detail-item">
          <span>${label}</span>
          <strong>${formatter(value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderResults(result) {
  const costs = result.costs;
  const suggested = result.suggested;
  const finalData = result.final;

  resultsContainer.className = "results-ready";
  resultsContainer.innerHTML = `
    <div class="metrics-grid">
      ${makeMetricCard("Costo real total", formatCop(costs.real_total_cost_cop), "Base total de la operación en COP")}
      ${makeMetricCard("Precio sugerido", formatCop(suggested.sale_price_cop), "Calculado según el margen objetivo")}
      ${makeMetricCard("Ganancia estimada", formatCop(suggested.profit_cop), "Antes de negociar ajustes finales")}
      ${makeMetricCard("ROI estimado", formatPercent(suggested.roi_percent), "Rentabilidad sobre tu capital")}
    </div>

    <div class="detail-grid">
      <section class="detail-panel">
        <h3>Desglose de costos</h3>
        <div class="detail-item">
          <span>Modalidad</span>
          <strong>${escapeHtml(costs.purchase_type_label || "Compra online")}</strong>
        </div>
        ${makeDetailList(
          [
            ["Precio con tax", costs.price_with_tax_usd],
            ["Costo total USD", costs.total_usd],
          ],
          formatUsd
        )}
        ${makeDetailList(
          [
            ["Viaje aplicado", costs.applied_travel_cost_usd],
            ["Envio aplicado", costs.applied_locker_shipping_usd],
          ],
          formatUsd
        )}
        ${makeDetailList(
          [
            ["Gastos locales", costs.applied_local_costs_cop],
            ["Viaje en COP", costs.travel_cost_cop],
            ["Casillero en COP", costs.locker_shipping_cop],
            ["Costo convertido en COP", costs.cost_in_cop],
            ["Costo real total", costs.real_total_cost_cop],
          ],
          formatCop
        )}
      </section>

      <section class="detail-panel">
        <h3>Escenario sugerido</h3>
        ${makeDetailList(
          [
            ["Precio sugerido", suggested.sale_price_cop],
            ["Ganancia", suggested.profit_cop],
            ["Anticipo sugerido", suggested.advance_cop],
            ["Capital propio", suggested.own_capital_cop],
          ],
          formatCop
        )}
        ${makeDetailList(
          [
            ["% capital propio", suggested.own_capital_percent],
            ["Markup", suggested.markup_percent],
            ["ROI", suggested.roi_percent],
          ],
          formatPercent
        )}
      </section>

      <section class="detail-panel detail-panel-highlight">
        <h3>Escenario final</h3>
        <p class="detail-note">
          ${
            finalData.uses_custom_sale_price || finalData.uses_custom_advance
              ? "Se aplicaron ajustes manuales al cierre comercial."
              : "Sin ajustes manuales: coincide con el escenario sugerido."
          }
        </p>
        ${makeDetailList(
          [
            ["Precio final", finalData.sale_price_cop],
            ["Ganancia final", finalData.profit_cop],
            ["Anticipo final", finalData.advance_cop],
            ["Capital propio final", finalData.own_capital_cop],
          ],
          formatCop
        )}
        ${makeDetailList(
          [
            ["Margen final", finalData.margin_percent],
            ["% anticipo final", finalData.advance_percent],
            ["% capital propio", finalData.own_capital_percent],
            ["Markup final", finalData.markup_percent],
            ["ROI final", finalData.roi_percent],
          ],
          formatPercent
        )}
      </section>
    </div>
  `;
  renderQuoteLiveSummary();
}

function renderHistory(items) {
  if (!items.length) {
    historyContainer.className = "history-empty";
    historyContainer.innerHTML = "<p>Aún no hay cotizaciones guardadas.</p>";
    return;
  }

  historyContainer.className = "history-table-wrap";
  historyContainer.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>Cliente</th>
          <th>Costo real</th>
          <th>Venta final</th>
          <th>Ganancia</th>
          <th>ROI</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const finalData = item.result.final;
            const costs = item.result.costs;
            return `
              <tr>
                <td>${dateFormatter.format(new Date(item.created_at))}</td>
                <td>${escapeHtml(item.product_name || "-")}</td>
                <td>${escapeHtml(item.client_name || "-")}</td>
                <td>${formatCop(costs.real_total_cost_cop)}</td>
                <td>${formatCop(finalData.sale_price_cop)}</td>
                <td>${formatCop(finalData.profit_cop)}</td>
                <td>${formatPercent(finalData.roi_percent)}</td>
                <td class="history-actions-cell">
                  <button
                    class="history-action-button history-action-button-secondary"
                    type="button"
                    data-edit-quote="${item.id}"
                    ${item.has_order ? "disabled" : ""}
                  >
                    ${item.has_order ? "Compra creada" : "Editar"}
                  </button>
                  <a class="history-action-button" href="/api/quotes/${item.id}/pdf">Descargar PDF</a>
                  <button class="history-action-button history-action-button-secondary" type="button" data-copy-quote="${item.id}">
                    Copiar WhatsApp
                  </button>
                  <button
                    class="history-action-button history-action-button-secondary"
                    type="button"
                    data-create-order="${item.id}"
                    data-quote-total="${finalData.sale_price_cop}"
                    data-quoted-advance="${finalData.advance_cop}"
                    ${item.has_order ? "disabled" : ""}
                  >
                    ${item.has_order ? "Compra creada" : "Pasar a compra"}
                  </button>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderClients(items) {
  if (!items.length) {
    clientsListContainer.className = "catalog-empty";
    clientsListContainer.innerHTML = "<p>Aún no hay clientes guardados.</p>";
    return;
  }

  clientsListContainer.className = "catalog-list";
  clientsListContainer.innerHTML = items
    .map(
      (client) => `
        <article class="catalog-card">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(client.name)}</h3>
              <p>${escapeHtml(client.city || "Ciudad no registrada")}</p>
            </div>
            <div class="catalog-card-actions">
              <button class="history-action-button history-action-button-secondary" type="button" data-view-client="${client.id}">
                Ver detalle
              </button>
              <button class="history-action-button history-action-button-secondary" type="button" data-use-client="${client.id}">
                Usar
              </button>
            </div>
          </div>
          <div class="catalog-card-meta">
            <span>${escapeHtml(client.phone || "Sin teléfono")}</span>
            <span>${escapeHtml(client.email || "Sin email")}</span>
            ${client.preferred_contact_channel ? `<span>${escapeHtml(client.preferred_contact_channel)}</span>` : ""}
            ${client.preferred_payment_method ? `<span>${escapeHtml(client.preferred_payment_method)}</span>` : ""}
            ${client.neighborhood ? `<span>${escapeHtml(client.neighborhood)}</span>` : ""}
          </div>
          ${
            client.address
              ? `<p class="catalog-card-note"><strong>Dirección:</strong> ${escapeHtml(client.address)}</p>`
              : ""
          }
          ${
            client.interests
              ? `<p class="catalog-card-note"><strong>Intereses:</strong> ${escapeHtml(client.interests)}</p>`
              : ""
          }
          ${client.notes ? `<p class="catalog-card-note">${escapeHtml(client.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderProducts(items) {
  if (!items.length) {
    productsListContainer.className = "catalog-empty";
    productsListContainer.innerHTML = "<p>Aún no hay productos guardados.</p>";
    return;
  }

  productsListContainer.className = "catalog-list";
  productsListContainer.innerHTML = items
    .map(
      (product) => `
        <article class="catalog-card">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(productLabel(product))}</h3>
              <p>${formatUsd(product.price_usd_net)} base + ${product.tax_usa_percent}% tax</p>
            </div>
            <div class="catalog-card-actions">
              <button class="history-action-button history-action-button-secondary" type="button" data-view-product="${product.id}">
                Ver detalle
              </button>
              <button class="history-action-button history-action-button-secondary" type="button" data-use-product="${product.id}">
                Usar
              </button>
            </div>
          </div>
          <div class="catalog-card-meta">
            <span>${escapeHtml(product.category || "Sin categoria")}</span>
            <span>${escapeHtml(product.store || "Sin tienda")}</span>
            <span>Casillero: ${formatUsd(product.locker_shipping_usd)}</span>
          </div>
          ${product.notes ? `<p class="catalog-card-note">${escapeHtml(product.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function buildPendingStatusOptions(selectedValue) {
  return (state.pendingStatuses || [])
    .map(
      (item) =>
        `<option value="${escapeHtml(item.key)}" ${item.key === selectedValue ? "selected" : ""}>${escapeHtml(
          item.label
        )}</option>`
    )
    .join("");
}

function renderPendingRequests(items) {
  if (!pendingListContainer) {
    return;
  }

  if (!items.length) {
    pendingListContainer.className = "catalog-empty";
    pendingListContainer.innerHTML = "<p>Aun no hay pendientes comerciales registrados.</p>";
    return;
  }

  const activeItems = items.filter(
    (item) => !["quoted", "discarded"].includes(String(item.status_key || "").trim().toLowerCase())
  );
  const searchingCount = items.filter((item) => item.status_key === "searching").length;
  const readyToQuoteCount = items.filter((item) => item.status_key === "ready_to_quote").length;
  const quotedCount = items.filter((item) => item.status_key === "quoted").length;

  pendingListContainer.className = "pending-list";
  pendingListContainer.innerHTML = `
    <section class="pending-summary-grid">
      ${makeMetricCard("Pendientes activos", String(activeItems.length), "Solicitudes que aun necesitan gestion comercial")}
      ${makeMetricCard("Buscando", String(searchingCount), "Referencias que aun estas rastreando")}
      ${makeMetricCard("Listos para cotizar", String(readyToQuoteCount), "Ya tienen contexto suficiente para pasar a cotizacion")}
      ${makeMetricCard("Cotizados", String(quotedCount), "Pendientes que ya se volvieron cotizacion")}
    </section>

    <div class="catalog-list">
      ${items
        .map(
          (item) => `
            <article class="catalog-card pending-card">
              <div class="catalog-card-top">
                <div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.client_name || "Cliente no registrado")}</p>
                </div>
                <div class="catalog-card-actions">
                  <span class="catalog-chip">${escapeHtml(item.status_label || item.status_key)}</span>
                  <span class="catalog-chip">${escapeHtml(item.priority_label || item.priority_key)}</span>
                </div>
              </div>

              <div class="catalog-card-meta">
                ${item.category ? `<span>${escapeHtml(item.category)}</span>` : ""}
                ${item.desired_store ? `<span>${escapeHtml(item.desired_store)}</span>` : ""}
                ${item.desired_size ? `<span>Talla: ${escapeHtml(item.desired_size)}</span>` : ""}
                ${item.desired_color ? `<span>${escapeHtml(item.desired_color)}</span>` : ""}
                <span>${Number(item.quantity || 1)} unidad${Number(item.quantity || 1) === 1 ? "" : "es"}</span>
                ${
                  Number(item.budget_cop || 0) > 0
                    ? `<span>Presupuesto: ${formatCop(item.budget_cop)}</span>`
                    : ""
                }
                ${item.due_date ? `<span>Compromiso: ${escapeHtml(formatStoredDate(item.due_date))}</span>` : ""}
              </div>

              ${
                item.reference_notes
                  ? `<p class="catalog-card-note"><strong>Referencia:</strong> ${escapeHtml(item.reference_notes)}</p>`
                  : ""
              }
              ${item.notes ? `<p class="catalog-card-note">${escapeHtml(item.notes)}</p>` : ""}
              ${
                item.reference_url
                  ? `<p class="catalog-card-note"><a href="${escapeHtml(item.reference_url)}" target="_blank" rel="noreferrer">Abrir referencia</a></p>`
                  : ""
              }

              <div class="pending-actions-row">
                <label class="pending-status-label">
                  <span>Estado</span>
                  <select data-pending-status-select="${item.id}">
                    ${buildPendingStatusOptions(item.status_key)}
                  </select>
                </label>
                <button
                  type="button"
                  class="history-action-button history-action-button-secondary"
                  data-save-pending-status="${item.id}"
                >
                  Guardar estado
                </button>
                ${
                  item.linked_quote_id
                    ? `
                      <button
                        type="button"
                        class="history-action-button history-action-button-secondary"
                        data-open-pending-quote="${item.linked_quote_id}"
                      >
                        Abrir cotizacion
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="history-action-button"
                        data-seed-pending-quote="${item.id}"
                      >
                        Pasar a cotizacion
                      </button>
                    `
                }
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderNamedCatalogList(container, items, emptyMessage) {
  if (!container) {
    return;
  }

  if (!items.length) {
    container.className = "catalog-empty";
    container.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  container.className = "catalog-list compact-list";
  container.innerHTML = items
    .map(
      (item) => `
        <article class="catalog-card compact-card">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderClientDetail(detail) {
  if (!clientDetailContainer) {
    return;
  }

  if (clientDetailClearButton) {
    clientDetailClearButton.disabled = !detail;
  }

  if (!detail) {
    clientDetailContainer.className = "catalog-empty";
    clientDetailContainer.innerHTML =
      "<p>Selecciona un cliente desde el listado o el dashboard para abrir su ficha comercial.</p>";
    return;
  }

  const client = detail.client || {};
  const summary = detail.summary || {};
  const topProducts = detail.top_products || [];
  const recentQuotes = detail.recent_quotes || [];
  const recentOrders = detail.recent_orders || [];

  clientDetailContainer.className = "client-detail-layout";
  clientDetailContainer.innerHTML = `
    <section class="client-detail-hero">
      <div>
        <p class="eyebrow">Ficha comercial</p>
        <h3>${escapeHtml(client.name || "Cliente sin nombre")}</h3>
        <p class="client-detail-copy">
          ${escapeHtml(client.city || "Ciudad no registrada")}
          ${client.neighborhood ? ` · ${escapeHtml(client.neighborhood)}` : ""}
          ${client.address ? ` · ${escapeHtml(client.address)}` : ""}
        </p>
      </div>
      <div class="client-detail-actions">
        <button class="primary" type="button" data-use-client-detail="${client.id}">Usar en cotizacion</button>
      </div>
    </section>

    <div class="metrics-grid client-detail-metrics">
      ${makeMetricCard("Cotizaciones", String(summary.quotes_count || 0), "Interacciones comerciales registradas")}
      ${makeMetricCard("Compras", String(summary.orders_count || 0), "Compras confirmadas por este cliente")}
      ${makeMetricCard("Vendido", formatCop(summary.sales_total_cop), "Valor total vendido a este cliente")}
      ${makeMetricCard("Recaudado", formatCop(summary.cash_in_total_cop), "Anticipos y pagos recibidos")}
      ${makeMetricCard("Cartera", formatCop(summary.accounts_receivable_cop), "Compras notificadas y pendientes de segundo pago")}
      ${makeMetricCard("Utilidad", formatCop(summary.gross_profit_cop), "Ganancia bruta generada")}
      ${makeMetricCard("Ticket promedio", formatCop(summary.average_ticket_cop), "Promedio por compra cerrada")}
      ${makeMetricCard("Conversion", formatPercent(summary.conversion_rate_percent), "Compras frente a cotizaciones")}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Datos del cliente</h3>
        ${makeDetailList(
          [
            ["Telefono", client.phone || "No registrado"],
            ["Email", client.email || "No registrado"],
            ["Canal preferido", client.preferred_contact_channel || "No definido"],
            ["Pago preferido", client.preferred_payment_method || "No definido"],
            ["Ultima cotizacion", formatStoredDate(summary.last_quote_at)],
            ["Ultima compra", formatStoredDate(summary.last_order_at)],
          ],
          (value) => escapeHtml(value)
        )}
        ${
          client.interests
            ? `<p class="catalog-card-note"><strong>Intereses:</strong> ${escapeHtml(client.interests)}</p>`
            : ""
        }
        ${client.notes ? `<p class="catalog-card-note">${escapeHtml(client.notes)}</p>` : ""}
      </section>

      <section class="detail-panel">
        <h3>Productos mas movidos</h3>
        ${
          topProducts.length
            ? topProducts
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.product_name)}</strong>
                        <p>${item.orders_count} compra(s) · ${item.quotes_count} cotizacion(es)</p>
                      </div>
                      <span>${formatCop(item.sales_total_cop || item.quoted_sales_total_cop)}</span>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Todavia no hay suficiente historial de productos para este cliente.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas cotizaciones</h3>
        ${
          recentQuotes.length
            ? recentQuotes
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.product_name || "Producto sin nombre")}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))} · ${item.has_order ? "Convertida en compra" : "Pendiente"}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay cotizaciones registradas para este cliente.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas compras</h3>
        ${
          recentOrders.length
            ? recentOrders
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.product_name || "Producto sin nombre")}</strong>
                        <p>${escapeHtml(item.status_label || "Sin estado")} · ${escapeHtml(
                          formatStoredDate(item.last_status_changed_at || item.created_at)
                        )}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                      <small>Pendiente: ${formatCop(item.balance_due_cop)}</small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay compras registradas para este cliente.</p>'
        }
      </section>
    </div>
  `;
}

async function loadClientDetail(clientId, options = {}) {
  const { shouldScroll = true } = options;
  if (!clientId) {
    state.clientDetail = null;
    renderClientDetail(null);
    return;
  }

  try {
    const payload = await requestJson(`/api/clients/${encodeURIComponent(clientId)}`);
    state.clientDetail = payload.item || null;
    renderClientDetail(state.clientDetail);
    if (shouldScroll && clientDetailSection) {
      clientDetailSection.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  } catch (error) {
    state.clientDetail = null;
    clientDetailContainer.className = "catalog-empty";
    clientDetailContainer.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function refreshActiveClientDetail() {
  const activeClientId = state.clientDetail?.client?.id;
  if (!activeClientId) {
    return;
  }

  await loadClientDetail(activeClientId, { shouldScroll: false });
}

function renderProductDetailLegacy(detail) {
  if (!productDetailContainer) {
    return;
  }

  if (productDetailClearButton) {
    productDetailClearButton.disabled = !detail;
  }

  if (!detail) {
    productDetailContainer.className = "catalog-empty";
    productDetailContainer.innerHTML =
      "<p>Selecciona un producto desde el catalogo o el dashboard para abrir su ficha comercial.</p>";
    return;
  }

  const product = detail.product || {};
  const summary = detail.summary || {};
  const topClients = detail.top_clients || [];
  const recentQuotes = detail.recent_quotes || [];
  const recentOrders = detail.recent_orders || [];

  productDetailContainer.className = "client-detail-layout";
  productDetailContainer.innerHTML = `
    <section class="client-detail-hero">
      <div>
        <p class="eyebrow">Ficha de producto</p>
        <h3>${escapeHtml(productLabel(product))}</h3>
        <p class="client-detail-copy">
          ${formatUsd(product.price_usd_net)} base
          · ${product.tax_usa_percent || 0}% tax
          · Viaje ${formatUsd(product.travel_cost_usd)}
          · Casillero ${formatUsd(product.locker_shipping_usd)}
        </p>
      </div>
      <div class="client-detail-actions">
        <button class="primary" type="button" data-use-product-detail="${product.id}">Usar en cotizacion</button>
      </div>
    </section>

    <div class="metrics-grid client-detail-metrics">
      ${makeMetricCard("Cotizaciones", String(summary.quotes_count || 0), "Veces que este producto fue cotizado")}
      ${makeMetricCard("Compras", String(summary.orders_count || 0), "Compras confirmadas con este producto")}
      ${makeMetricCard("Vendido", formatCop(summary.sales_total_cop), "Valor vendido de esta referencia")}
      ${makeMetricCard("Recaudado", formatCop(summary.cash_in_total_cop), "Anticipos y pagos recibidos")}
      ${makeMetricCard("Cartera", formatCop(summary.accounts_receivable_cop), "Compras notificadas y pendientes de segundo pago")}
      ${makeMetricCard("Utilidad", formatCop(summary.gross_profit_cop), "Ganancia bruta que ha generado")}
      ${makeMetricCard("Venta promedio", formatCop(summary.average_sale_price_cop), "Promedio por compra cerrada")}
      ${makeMetricCard("Conversion", formatPercent(summary.conversion_rate_percent), "Compras frente a cotizaciones")}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Ficha base</h3>
        ${makeDetailList(
          [
            ["Referencia", product.reference || "No registrada"],
            ["Costo local", formatCop(product.local_costs_cop)],
            ["Ultima cotizacion", formatStoredDate(summary.last_quote_at)],
            ["Ultima compra", formatStoredDate(summary.last_order_at)],
          ],
          (value) => escapeHtml(value)
        )}
        ${product.notes ? `<p class="catalog-card-note">${escapeHtml(product.notes)}</p>` : ""}
      </section>

      <section class="detail-panel">
        <h3>Clientes que mas lo compran</h3>
        ${
          topClients.length
            ? topClients
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name)}</strong>
                        <p>${item.orders_count} compra(s) · ${item.quotes_count} cotizacion(es)</p>
                      </div>
                      <span>${formatCop(item.sales_total_cop || item.quoted_sales_total_cop)}</span>
                      <small>Por cobrar: ${formatCop(item.accounts_receivable_cop)}</small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Todavia no hay suficiente historial de clientes para este producto.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas cotizaciones</h3>
        ${
          recentQuotes.length
            ? recentQuotes
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name || "Cliente sin nombre")}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))} · ${item.has_order ? "Convertida en compra" : "Pendiente"}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay cotizaciones registradas para este producto.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas compras</h3>
        ${
          recentOrders.length
            ? recentOrders
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name || "Cliente sin nombre")}</strong>
                        <p>${escapeHtml(item.status_label || "Sin estado")} · ${escapeHtml(
                          formatStoredDate(item.last_status_changed_at || item.created_at)
                        )}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                      <small>Pendiente: ${formatCop(item.balance_due_cop)}</small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay compras registradas para este producto.</p>'
        }
      </section>
    </div>
  `;
}

function renderProductDetail(detail) {
  if (!productDetailContainer) {
    return;
  }

  if (productDetailClearButton) {
    productDetailClearButton.disabled = !detail;
  }

  if (!detail) {
    productDetailContainer.className = "catalog-empty";
    productDetailContainer.innerHTML =
      "<p>Selecciona un producto desde el catalogo o el dashboard para abrir su ficha comercial.</p>";
    return;
  }

  const product = detail.product || {};
  const summary = detail.summary || {};
  const topClients = detail.top_clients || [];
  const recentQuotes = detail.recent_quotes || [];
  const recentOrders = detail.recent_orders || [];

  productDetailContainer.className = "client-detail-layout";
  productDetailContainer.innerHTML = `
    <section class="client-detail-hero">
      <div>
        <p class="eyebrow">Ficha de producto</p>
        <h3>${escapeHtml(productLabel(product))}</h3>
        <p class="client-detail-copy">
          ${escapeHtml(product.category || "Categoria no registrada")}
          · ${escapeHtml(product.store || "Tienda no registrada")}
          · ${formatUsd(product.price_usd_net)} base
          · ${product.tax_usa_percent || 0}% tax
        </p>
      </div>
      <div class="client-detail-actions">
        <button class="primary" type="button" data-use-product-detail="${product.id}">Usar en cotizacion</button>
      </div>
    </section>

    <div class="metrics-grid client-detail-metrics">
      ${makeMetricCard("Cotizaciones", String(summary.quotes_count || 0), "Veces que este producto fue cotizado")}
      ${makeMetricCard("Compras", String(summary.orders_count || 0), "Compras confirmadas con este producto")}
      ${makeMetricCard("Vendido", formatCop(summary.sales_total_cop), "Valor vendido de esta referencia")}
      ${makeMetricCard("Recaudado", formatCop(summary.cash_in_total_cop), "Anticipos y pagos recibidos")}
      ${makeMetricCard("Cartera", formatCop(summary.accounts_receivable_cop), "Compras notificadas y pendientes de segundo pago")}
      ${makeMetricCard("Utilidad", formatCop(summary.gross_profit_cop), "Ganancia bruta que ha generado")}
      ${makeMetricCard("Venta promedio", formatCop(summary.average_sale_price_cop), "Promedio por compra cerrada")}
      ${makeMetricCard("Conversion", formatPercent(summary.conversion_rate_percent), "Compras frente a cotizaciones")}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Ficha base</h3>
        ${makeDetailList(
          [
            ["Referencia", product.reference || "No registrada"],
            ["Categoria", product.category || "No registrada"],
            ["Tienda", product.store || "No registrada"],
            ["Envio casillero", formatUsd(product.locker_shipping_usd)],
            ["Ultima cotizacion", formatStoredDate(summary.last_quote_at)],
            ["Ultima compra", formatStoredDate(summary.last_order_at)],
          ],
          (value) => escapeHtml(value)
        )}
        ${product.notes ? `<p class="catalog-card-note">${escapeHtml(product.notes)}</p>` : ""}
      </section>

      <section class="detail-panel">
        <h3>Clientes que mas lo compran</h3>
        ${
          topClients.length
            ? topClients
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name)}</strong>
                        <p>${item.orders_count} compra(s) · ${item.quotes_count} cotizacion(es)</p>
                      </div>
                      <span>${formatCop(item.sales_total_cop || item.quoted_sales_total_cop)}</span>
                      <small>Por cobrar: ${formatCop(item.accounts_receivable_cop)}</small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Todavia no hay suficiente historial de clientes para este producto.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas cotizaciones</h3>
        ${
          recentQuotes.length
            ? recentQuotes
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name || "Cliente sin nombre")}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))} · ${item.has_order ? "Convertida en compra" : "Pendiente"}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay cotizaciones registradas para este producto.</p>'
        }
      </section>

      <section class="detail-panel">
        <h3>Ultimas compras</h3>
        ${
          recentOrders.length
            ? recentOrders
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.client_name || "Cliente sin nombre")}</strong>
                        <p>${escapeHtml(item.status_label || "Sin estado")} · ${escapeHtml(
                          formatStoredDate(item.last_status_changed_at || item.created_at)
                        )}</p>
                      </div>
                      <span>${formatCop(item.sale_price_cop)}</span>
                      <small>Pendiente: ${formatCop(item.balance_due_cop)}</small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay compras registradas para este producto.</p>'
        }
      </section>
    </div>
  `;
}

async function loadProductDetail(productId, options = {}) {
  const { shouldScroll = true } = options;
  if (!productId) {
    state.productDetail = null;
    renderProductDetail(null);
    return;
  }

  try {
    const payload = await requestJson(`/api/products/${encodeURIComponent(productId)}`);
    state.productDetail = payload.item || null;
    renderProductDetail(state.productDetail);
    if (shouldScroll && productDetailSection) {
      productDetailSection.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  } catch (error) {
    state.productDetail = null;
    productDetailContainer.className = "catalog-empty";
    productDetailContainer.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function refreshActiveProductDetail() {
  const activeProductId = state.productDetail?.product?.id;
  if (!activeProductId) {
    return;
  }

  await loadProductDetail(activeProductId, { shouldScroll: false });
}

function renderDashboard(summary) {
  if (!summary) {
    dashboardSummaryContainer.className = "results-empty";
    dashboardSummaryContainer.innerHTML = "<p>No hay datos disponibles para este periodo.</p>";
    dashboardExpensesContainer.className = "catalog-empty";
    dashboardExpensesContainer.innerHTML = "<p>No hay gastos para mostrar en este periodo.</p>";
    if (dashboardClientsContainer) {
      dashboardClientsContainer.className = "catalog-empty";
      dashboardClientsContainer.innerHTML = "<p>No hay datos de clientes disponibles.</p>";
    }
    if (dashboardProductsContainer) {
      dashboardProductsContainer.className = "catalog-empty";
      dashboardProductsContainer.innerHTML = "<p>No hay datos de productos disponibles.</p>";
    }
    return;
  }

  const metrics = summary.metrics || {};
  const period = summary.period || {};
  const clientInsights = summary.client_insights || {};
  const productInsights = summary.product_insights || {};
  const recentExpenses = summary.recent_expenses || [];
  const expensesByCategory = summary.expenses_by_category || [];

  dashboardSummaryContainer.className = "results-ready";
  dashboardSummaryContainer.innerHTML = `
    <div class="metrics-grid dashboard-metrics-grid">
      ${makeMetricCard("Vendido", formatCop(metrics.sales_total_cop), `${metrics.orders_count || 0} compras en el periodo`)}
      ${makeMetricCard("Recibido", formatCop(metrics.cash_in_total_cop), "Anticipos y pagos registrados")}
      ${makeMetricCard("Pendiente del periodo", formatCop(metrics.period_balance_due_cop), "Saldo aun abierto de estas compras")}
      ${makeMetricCard("Cartera por cobrar", formatCop(metrics.accounts_receivable_cop), "Solo compras notificadas y pendientes de segundo pago")}
      ${makeMetricCard("Utilidad bruta", formatCop(metrics.gross_profit_cop), "Antes de descontar gastos")}
      ${makeMetricCard("Gastos", formatCop(metrics.expenses_total_cop), "Salida real de dinero")}
      ${makeMetricCard("Utilidad neta", formatCop(metrics.net_profit_cop), "Bruta menos gastos")}
      ${makeMetricCard("Compras abiertas", String(metrics.open_orders_count || 0), "Seguimientos que siguen activos")}
    </div>

    <div class="detail-grid">
      <section class="detail-panel">
        <h3>Lectura del periodo</h3>
        <div class="detail-item">
          <span>Periodo consultado</span>
          <strong>${escapeHtml(period.period_label || "-")}</strong>
        </div>
        <div class="detail-item">
          <span>Desde</span>
          <strong>${escapeHtml(formatStoredDate(period.start_date || ""))}</strong>
        </div>
        <div class="detail-item">
          <span>Hasta</span>
          <strong>${escapeHtml(formatStoredDate(period.end_date || ""))}</strong>
        </div>
      </section>
    </div>
  `;

  if (!expensesByCategory.length && !recentExpenses.length) {
    dashboardExpensesContainer.className = "catalog-empty";
    dashboardExpensesContainer.innerHTML = "<p>Aun no hay gastos registrados en este periodo.</p>";
    renderDashboardClients(clientInsights);
    renderDashboardProducts(productInsights);
    return;
  }

  dashboardExpensesContainer.className = "dashboard-expense-layout";
  dashboardExpensesContainer.innerHTML = `
    <div class="dashboard-expense-categories">
      ${expensesByCategory.length
        ? expensesByCategory
            .map(
              (item) => `
                <article class="dashboard-expense-card">
                  <strong>${escapeHtml(item.category_label)}</strong>
                  <span>${formatCop(item.amount_cop)}</span>
                  <small>${item.count} movimiento(s)</small>
                </article>
              `
            )
            .join("")
        : '<p class="catalog-card-note">Sin gastos por categoria para este periodo.</p>'}
    </div>
    <div class="dashboard-recent-expenses">
      <h3>Ultimos gastos registrados</h3>
      ${
        recentExpenses.length
          ? recentExpenses
              .map(
                (item) => `
                  <article class="expense-row">
                    <div>
                      <strong>${escapeHtml(item.concept)}</strong>
                      <p>${escapeHtml(item.category_label)} · ${escapeHtml(
                        formatStoredDate(item.expense_date)
                      )}</p>
                    </div>
                    <span>${formatCop(item.amount_cop)}</span>
                  </article>
                `
              )
              .join("")
          : "<p class=\"catalog-card-note\">No hay movimientos recientes.</p>"
      }
    </div>
  `;

  renderDashboardClients(clientInsights);
  renderDashboardProducts(productInsights);
}

function renderExpenses(items) {
  if (!items.length) {
    expensesListContainer.className = "catalog-empty";
    expensesListContainer.innerHTML = "<p>Aun no hay gastos registrados.</p>";
    return;
  }

  expensesListContainer.className = "expenses-list";
  expensesListContainer.innerHTML = items
    .map(
      (item) => `
        <article class="expense-row expense-row-detailed">
          <div>
            <strong>${escapeHtml(item.concept)}</strong>
            <p>${escapeHtml(item.category_label)} · ${escapeHtml(formatStoredDate(item.expense_date))}</p>
            ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
          </div>
          <span>${formatCop(item.amount_cop)}</span>
        </article>
      `
    )
    .join("");
}

function renderRankingList(items, emptyMessage, renderer) {
  if (!items.length) {
    return `<p class="catalog-card-note">${emptyMessage}</p>`;
  }

  return `
    <div class="dashboard-ranking-list">
      ${items.slice(0, 6).map(renderer).join("")}
    </div>
  `;
}

function renderDashboardClients(insights) {
  if (!dashboardClientsContainer) {
    return;
  }

  const topBuyers = insights.top_buyers || [];
  const receivables = insights.receivables || [];

  if (!topBuyers.length && !receivables.length) {
    dashboardClientsContainer.className = "catalog-empty";
    dashboardClientsContainer.innerHTML = "<p>Aun no hay clientes con lectura gerencial.</p>";
    return;
  }

  dashboardClientsContainer.className = "dashboard-ranking-layout";
  dashboardClientsContainer.innerHTML = `
    <section class="dashboard-ranking-column">
      <h3>Clientes que mas compraron</h3>
      ${renderRankingList(
        topBuyers,
        "Todavia no hay compras suficientes para armar este ranking.",
        (item) => `
          <article class="dashboard-ranking-card">
            <div class="dashboard-ranking-head">
              <div>
                <strong>${escapeHtml(item.client_name)}</strong>
                <p>${item.orders_count} compra(s) en el periodo</p>
              </div>
              <span>${formatCop(item.sales_total_cop)}</span>
            </div>
            <small>
              Ticket promedio: ${formatCop(item.average_ticket_cop)} | Recaudado: ${formatCop(
                item.cash_in_total_cop
              )} | Utilidad: ${formatCop(item.gross_profit_cop)} | Por cobrar: ${formatCop(
                item.accounts_receivable_cop
              )}
            </small>
            ${
              item.client_id
                ? `<div class="dashboard-ranking-actions">
                    <button class="history-action-button history-action-button-secondary" type="button" data-view-client="${item.client_id}">
                      Ver ficha
                    </button>
                  </div>`
                : ""
            }
          </article>
        `
      )}
    </section>
    <section class="dashboard-ranking-column">
      <h3>Clientes con cartera por cobrar</h3>
      ${renderRankingList(
        receivables,
        "No hay cartera por cobrar en este momento.",
        (item) => `
          <article class="dashboard-ranking-card">
            <div class="dashboard-ranking-head">
              <div>
                <strong>${escapeHtml(item.client_name)}</strong>
                <p>${item.open_orders_count} compra(s) notificada(s)</p>
              </div>
              <span>${formatCop(item.accounts_receivable_cop)}</span>
            </div>
            <small>Ultima compra registrada: ${escapeHtml(formatStoredDate(item.last_order_at))}</small>
            ${
              item.client_id
                ? `<div class="dashboard-ranking-actions">
                    <button class="history-action-button history-action-button-secondary" type="button" data-view-client="${item.client_id}">
                      Ver ficha
                    </button>
                  </div>`
                : ""
            }
          </article>
        `
      )}
    </section>
  `;
}

function renderDashboardProducts(insights) {
  if (!dashboardProductsContainer) {
    return;
  }

  const topSellers = insights.top_sellers || [];
  const mostProfitable = insights.most_profitable || [];

  if (!topSellers.length && !mostProfitable.length) {
    dashboardProductsContainer.className = "catalog-empty";
    dashboardProductsContainer.innerHTML =
      "<p>Aun no hay productos con suficiente movimiento para este analisis.</p>";
    return;
  }

  dashboardProductsContainer.className = "dashboard-ranking-layout";
  dashboardProductsContainer.innerHTML = `
    <section class="dashboard-ranking-column">
      <h3>Productos mas vendidos</h3>
      ${renderRankingList(
        topSellers,
        "Todavia no hay ventas suficientes para este ranking.",
        (item) => `
          <article class="dashboard-ranking-card">
            <div class="dashboard-ranking-head">
              <div>
                <strong>${escapeHtml(item.product_name)}</strong>
                <p>${item.units_sold} venta(s) en el periodo</p>
              </div>
              <span>${formatCop(item.sales_total_cop)}</span>
            </div>
            <small>
              Ticket promedio: ${formatCop(item.average_sale_price_cop)} | Recaudado: ${formatCop(
                item.cash_in_total_cop
              )} | Pendiente: ${formatCop(item.period_balance_due_cop)}
            </small>
            ${
              item.product_id
                ? `<div class="dashboard-ranking-actions">
                    <button class="history-action-button history-action-button-secondary" type="button" data-view-product="${item.product_id}">
                      Ver ficha
                    </button>
                  </div>`
                : ""
            }
          </article>
        `
      )}
    </section>
    <section class="dashboard-ranking-column">
      <h3>Productos con mayor utilidad</h3>
      ${renderRankingList(
        mostProfitable,
        "Aun no hay utilidad suficiente para comparar productos.",
        (item) => `
          <article class="dashboard-ranking-card">
            <div class="dashboard-ranking-head">
              <div>
                <strong>${escapeHtml(item.product_name)}</strong>
                <p>${item.orders_count} compra(s) asociada(s)</p>
              </div>
              <span>${formatCop(item.gross_profit_cop)}</span>
            </div>
            <small>
              Margen bruto: ${formatPercent(item.gross_margin_percent)} | Vendido: ${formatCop(
                item.sales_total_cop
              )} | Ultimo movimiento: ${escapeHtml(formatStoredDate(item.last_order_at))}
            </small>
            ${
              item.product_id
                ? `<div class="dashboard-ranking-actions">
                    <button class="history-action-button history-action-button-secondary" type="button" data-view-product="${item.product_id}">
                      Ver ficha
                    </button>
                  </div>`
                : ""
            }
          </article>
        `
      )}
    </section>
  `;
}

function renderFollowup(summary) {
  if (!followupSummaryContainer || !followupAgendaContainer || !followupPendingContainer || !followupPipelineContainer) {
    return;
  }

  if (!summary) {
    followupSummaryContainer.className = "results-empty";
    followupSummaryContainer.innerHTML = "<p>No hay informacion de seguimiento disponible.</p>";
    followupAgendaContainer.className = "catalog-empty";
    followupAgendaContainer.innerHTML = "<p>Aun no hay acciones sugeridas para hoy.</p>";
    followupPendingContainer.className = "catalog-empty";
    followupPendingContainer.innerHTML = "<p>Aun no hay pendientes comerciales para mostrar.</p>";
    followupPipelineContainer.className = "catalog-empty";
    followupPipelineContainer.innerHTML = "<p>Aun no hay seguimiento comercial pendiente.</p>";
    return;
  }

  const metrics = summary.metrics || {};
  const pendingDashboard = summary.pending_dashboard || {};
  const quoteDashboard = summary.quote_dashboard || {};
  const orderDashboard = summary.order_dashboard || {};
  const agenda = summary.agenda?.today || [];

  followupSummaryContainer.className = "results-ready";
  followupSummaryContainer.innerHTML = `
    <div class="metrics-grid dashboard-metrics-grid">
      ${makeMetricCard("Pendientes activos", String(metrics.active_pending_count || 0), "Solicitudes que aun exigen gestion comercial")}
      ${makeMetricCard("Vencidos", String(metrics.overdue_pending_count || 0), "Pendientes cuyo compromiso ya se paso")}
      ${makeMetricCard("Para hoy", String(metrics.due_today_count || 0), "Compromisos con fecha de hoy")}
      ${makeMetricCard("Listos para cotizar", String(metrics.ready_to_quote_count || 0), "Pendientes que ya puedes mover a cotizacion")}
      ${makeMetricCard("Cotizaciones abiertas", String(metrics.open_quotes_count || 0), "Cotizaciones aun sin convertirse en compra")}
      ${makeMetricCard("Por seguir", String(metrics.quotes_followup_count || 0), "Cotizaciones abiertas con varios dias sin respuesta")}
      ${makeMetricCard("Compras activas", String(metrics.active_orders_count || 0), "Compras que siguen vivas en operacion")}
      ${makeMetricCard("Compras quietas", String(metrics.stalled_orders_count || 0), "Compras sin movimiento reciente")}
      ${makeMetricCard("Clientes por cobrar", String(metrics.clients_with_balance_count || 0), "Clientes ya notificados y pendientes de segundo pago")}
      ${makeMetricCard("Cartera por cobrar", formatCop(metrics.accounts_receivable_cop), "Saldo notificado pendiente de segundo pago")}
    </div>
  `;

  if (!agenda.length) {
    followupAgendaContainer.className = "catalog-empty";
    followupAgendaContainer.innerHTML = "<p>Aun no hay acciones sugeridas para hoy.</p>";
  } else {
    followupAgendaContainer.className = "followup-agenda-list";
    followupAgendaContainer.innerHTML = agenda
      .map(
        (item) => `
          <article class="dashboard-ranking-card followup-agenda-card">
            <div class="dashboard-ranking-head">
              <div>
                <strong>${escapeHtml(item.title || "Tarea operativa")}</strong>
                <p>${escapeHtml(item.summary || "")}</p>
              </div>
              <span>${escapeHtml(item.priority_label || item.priority_key || "")}</span>
            </div>
            <small>${escapeHtml(item.status_label || "")}</small>
            <div class="dashboard-ranking-actions">
              <button
                class="history-action-button history-action-button-secondary"
                type="button"
                data-open-followup-module="${escapeHtml(item.target_module || "seguimiento")}"
              >
                ${escapeHtml(item.action_label || "Abrir")}
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  const pendingSections = [
    {
      title: "Vencidos",
      empty: "No hay pendientes vencidos.",
      items: pendingDashboard.overdue || [],
    },
    {
      title: "Para hoy o muy cerca",
      empty: "No hay compromisos inmediatos.",
      items: [...(pendingDashboard.due_today || []), ...(pendingDashboard.due_soon || [])].slice(0, 6),
    },
    {
      title: "Listos para cotizar",
      empty: "Todavia no hay pendientes maduros para cotizacion.",
      items: pendingDashboard.ready_to_quote || [],
    },
  ];

  followupPendingContainer.className = "followup-board";
  followupPendingContainer.innerHTML = pendingSections
    .map(
      (section) => `
        <section class="dashboard-ranking-column">
          <h3>${escapeHtml(section.title)}</h3>
          ${
            section.items.length
              ? section.items
                  .map(
                    (item) => `
                      <article class="dashboard-ranking-card">
                        <div class="dashboard-ranking-head">
                          <div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <p>${escapeHtml(item.client_name || "Cliente sin nombre")}</p>
                          </div>
                          <span>${escapeHtml(item.priority_label || "")}</span>
                        </div>
                        <small>
                          ${escapeHtml(item.status_label || "")}
                          ${item.due_date ? ` | Compromiso: ${escapeHtml(formatStoredDate(item.due_date))}` : ""}
                        </small>
                        <div class="dashboard-ranking-actions">
                          <button
                            class="history-action-button history-action-button-secondary"
                            type="button"
                            data-open-followup-module="pendientes"
                          >
                            Abrir pendientes
                          </button>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<p class="catalog-card-note">${escapeHtml(section.empty)}</p>`
          }
        </section>
      `
    )
    .join("");

  const quoteCards = (quoteDashboard.needs_followup || []).slice(0, 4).map(
    (item) => `
      <article class="dashboard-ranking-card">
        <div class="dashboard-ranking-head">
          <div>
            <strong>${escapeHtml(item.product_name || "Cotizacion abierta")}</strong>
            <p>${escapeHtml(item.client_name || "Cliente sin nombre")}</p>
          </div>
          <span>${item.age_days} dia(s)</span>
        </div>
        <small>Sin respuesta hace ${item.age_days} dia(s) · ${formatCop(item.sale_price_cop)}</small>
        <div class="dashboard-ranking-actions">
          <button
            class="history-action-button history-action-button-secondary"
            type="button"
            data-open-followup-module="comercial"
          >
            Abrir cotizaciones
          </button>
        </div>
      </article>
    `
  );

  const stalledCards = (orderDashboard.stalled_orders || []).slice(0, 4).map(
    (item) => `
      <article class="dashboard-ranking-card">
        <div class="dashboard-ranking-head">
          <div>
            <strong>${escapeHtml(item.product_name || "Compra activa")}</strong>
            <p>${escapeHtml(item.client_name || "Cliente sin nombre")}</p>
          </div>
          <span>${item.stale_days} dia(s)</span>
        </div>
        <small>${escapeHtml(item.status_label || "")} sin movimiento hace ${item.stale_days} dia(s)</small>
        <div class="dashboard-ranking-actions">
          <button
            class="history-action-button history-action-button-secondary"
            type="button"
            data-open-followup-module="compras"
          >
            Abrir compras
          </button>
        </div>
      </article>
    `
  );

  const receivableCards = (orderDashboard.receivables || []).slice(0, 4).map(
    (item) => `
      <article class="dashboard-ranking-card">
        <div class="dashboard-ranking-head">
          <div>
            <strong>${escapeHtml(item.client_name || "Cliente sin nombre")}</strong>
            <p>${item.orders_count} compra(s) notificada(s) con segundo pago pendiente</p>
          </div>
          <span>${formatCop(item.balance_due_cop)}</span>
        </div>
        <small>Ultimo movimiento: ${escapeHtml(formatStoredDate(item.last_status_changed_at || ""))}</small>
        <div class="dashboard-ranking-actions">
          <button
            class="history-action-button history-action-button-secondary"
            type="button"
            data-open-followup-module="compras"
          >
            Abrir cartera
          </button>
        </div>
      </article>
    `
  );

  followupPipelineContainer.className = "followup-board";
  followupPipelineContainer.innerHTML = `
    <section class="dashboard-ranking-column">
      <h3>Cotizaciones por seguir</h3>
      ${quoteCards.length ? quoteCards.join("") : '<p class="catalog-card-note">No hay cotizaciones abiertas que pidan seguimiento inmediato.</p>'}
    </section>
    <section class="dashboard-ranking-column">
      <h3>Compras que requieren atencion</h3>
      ${stalledCards.length ? stalledCards.join("") : '<p class="catalog-card-note">No hay compras quietas en este momento.</p>'}
    </section>
    <section class="dashboard-ranking-column">
      <h3>Cartera por cobrar</h3>
      ${receivableCards.length ? receivableCards.join("") : '<p class="catalog-card-note">No hay cartera por cobrar en este momento.</p>'}
    </section>
  `;
}

function renderOrderStatusesAdmin(items) {
  if (!items.length) {
    orderStatusesListContainer.className = "catalog-empty";
    orderStatusesListContainer.innerHTML = "<p>Aún no hay estados configurados.</p>";
    return;
  }

  orderStatusesListContainer.className = "status-admin-list";
  orderStatusesListContainer.innerHTML = items
    .map(
      (status, index) => `
        <article class="status-admin-card">
          <div class="status-admin-order">${index + 1}</div>
          <div class="status-admin-copy">
            <h3>${escapeHtml(status.label)}</h3>
            <p>${escapeHtml(status.description || "Sin descripción adicional.")}</p>
            <small>Clave: ${escapeHtml(status.key)}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function buildTravelTransportOptions(selectedValue) {
  const options = [
    { value: "undecided", label: "Por definir" },
    { value: "locker", label: "Casillero" },
    { value: "luggage", label: "Maleta" },
  ];
  return options
    .map(
      (item) =>
        `<option value="${item.value}" ${item.value === selectedValue ? "selected" : ""}>${item.label}</option>`
    )
    .join("");
}

function describeOrderNextAction(order) {
  const balanceDue = Number(order.balance_due_cop || 0);
  const isTravelOrder = order.snapshot?.input?.purchase_type === "travel";
  const routeUndecided = isTravelOrder && (order.travel_transport_type || "undecided") === "undecided";

  if (order.status_key === "client_notified" && balanceDue > 0) {
    return {
      title: "Cobrar segundo pago",
      detail: "El cliente ya fue notificado y todavia tiene saldo pendiente.",
    };
  }

  if (routeUndecided) {
    return {
      title: "Definir ruta del viaje",
      detail: "Marca si este producto llega por casillero o en la maleta.",
    };
  }

  if (order.next_status_label) {
    return {
      title: `Avanzar a ${order.next_status_label}`,
      detail: `Estado actual: ${order.status_label}.`,
    };
  }

  return {
    title: "Flujo completado",
    detail: "Esta compra ya completo el ciclo operativo.",
  };
}

function renderOrders(items) {
  const visibleItems = items.filter((item) => item.status_key !== "cycle_closed");
  if (!visibleItems.length) {
    ordersListContainer.className = "catalog-empty";
    ordersListContainer.innerHTML = "<p>Aun no hay compras abiertas.</p>";
    ordersListContainer.innerHTML = "<p>Aún no hay compras creadas.</p>";
    return;
  }

  const pendingCollectionCount = visibleItems.filter(
    (item) => item.status_key === "client_notified" && Number(item.balance_due_cop || 0) > 0
  ).length;
  const travelRoutePendingCount = visibleItems.filter(
    (item) =>
      item.snapshot?.input?.purchase_type === "travel" &&
      (item.travel_transport_type || "undecided") === "undecided"
  ).length;
  const readyToAdvanceCount = visibleItems.filter(
    (item) =>
      item.next_status_key &&
      !(item.next_status_key === "second_payment_received" && Number(item.balance_due_cop || 0) > 0)
  ).length;
  const activeSalesTotal = visibleItems.reduce((total, item) => total + Number(item.sale_price_cop || 0), 0);

  ordersListContainer.className = "orders-list";
  ordersListContainer.innerHTML = `
    <section class="orders-board-summary">
      ${makeMetricCard("Compras activas", String(visibleItems.length), "Pedidos abiertos que debes mover en operacion")}
      ${makeMetricCard("Por cobrar", String(pendingCollectionCount), "Clientes notificados y pendientes de segundo pago")}
      ${makeMetricCard("Ruta por definir", String(travelRoutePendingCount), "Compras en viaje que aun no tienen casillero o maleta")}
      ${makeMetricCard("Listas para avanzar", String(readyToAdvanceCount), "Pedidos que ya pueden pasar al siguiente estado")}
      ${makeMetricCard("Venta activa", formatCop(activeSalesTotal), "Valor comprometido en compras aun abiertas")}
    </section>
    <div class="orders-card-grid">
      ${visibleItems
    .map((order) => {
      const nextAction = describeOrderNextAction(order);
      const secondPaymentBlocked =
        order.next_status_key === "second_payment_received" && Number(order.balance_due_cop || 0) > 0;
      return `
        <article class="order-card">
          <div class="order-card-top">
            <div>
              <h3>${escapeHtml(order.product_name)}</h3>
              <p>${escapeHtml(order.client_name || "Cliente no registrado")} · Desde cotización #${order.quote_id}</p>
            </div>
            <span class="order-status-badge">${escapeHtml(order.status_label)}</span>
          </div>

          <div class="order-next-step-card">
            <span>Proxima accion</span>
            <strong>${escapeHtml(nextAction.title)}</strong>
            <small>${escapeHtml(nextAction.detail)}</small>
          </div>

          <div class="order-metrics">
            <span>Venta: ${formatCop(order.sale_price_cop)}</span>
            <span>Anticipo cotizado: ${formatCop(order.quoted_advance_cop)}</span>
            <span>Anticipo real: ${formatCop(order.advance_paid_cop)}</span>
            <span>Segundo pago registrado: ${formatCop(order.second_payment_amount_cop)}</span>
            <span>Fecha segundo pago: ${formatStoredDate(order.second_payment_received_at)}</span>
            <span>Saldo: ${formatCop(order.balance_due_cop)}</span>
            <span>Último cambio: ${formatStoredDate(order.last_status_changed_at)}</span>
            ${
              order.snapshot?.input?.purchase_type === "travel"
                ? `<span>Ruta viaje: ${escapeHtml(order.travel_transport_label || "Por definir")}</span>`
                : ""
            }
          </div>

          ${
            order.snapshot?.input?.purchase_type === "travel"
              ? `
                <div class="order-payment-register">
                  <strong>Ruta del producto en viaje</strong>
                  <div class="order-payment-fields">
                    <label>
                      <span>Cómo viaja</span>
                      <select data-travel-transport-select="${order.id}">
                        ${buildTravelTransportOptions(order.travel_transport_type || "undecided")}
                      </select>
                    </label>
                    <button class="secondary" type="button" data-save-travel-transport="${order.id}">
                      Guardar ruta
                    </button>
                  </div>
                </div>
              `
              : ""
          }

          ${
            order.balance_due_cop > 0
              ? `
                <div class="order-payment-register">
                  <strong>Registrar segundo pago</strong>
                  <div class="order-payment-fields">
                    <label>
                      <span>Valor recibido</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        placeholder="Ej. 350000"
                        value="${escapeHtml(String(Math.round(order.balance_due_cop)))}"
                        data-second-payment-amount="${order.id}"
                      />
                    </label>
                    <label>
                      <span>Fecha del pago</span>
                      <input
                        type="date"
                        value="${escapeHtml(
                          order.second_payment_received_at
                            ? toDateInputValue(order.second_payment_received_at)
                            : toDateInputValue(new Date())
                        )}"
                        data-second-payment-date="${order.id}"
                      />
                    </label>
                    <button class="primary" type="button" data-register-second-payment="${order.id}">
                      Registrar segundo pago
                    </button>
                  </div>
                </div>
              `
              : `
                <p class="order-payment-note">
                  ${
                    order.second_payment_amount_cop > 0
                      ? `Saldo cubierto. Último segundo pago registrado el ${escapeHtml(
                          formatStoredDate(order.second_payment_received_at)
                        )}.`
                      : "No hay saldo pendiente por segundo pago."
                  }
                </p>
              `
          }

          <div class="order-status-update">
            <div class="order-status-summary">
              <strong>Estado actual</strong>
              <p>${escapeHtml(order.status_label)}</p>
            </div>
            ${
              order.next_status_key
                ? `<button
                    class="secondary"
                    type="button"
                    data-advance-order-status="${order.id}"
                    data-next-status-key="${escapeHtml(order.next_status_key)}"
                    ${secondPaymentBlocked ? "disabled" : ""}
                  >
                    Avanzar a ${escapeHtml(order.next_status_label)}
                  </button>`
                : `<span class="order-flow-complete">Flujo completado</span>`
            }
          </div>

          <div class="order-events">
            ${order.events
              .map(
                (event) => `
                  <article class="order-event">
                    <strong>${escapeHtml(event.status_label)}</strong>
                    <small>${dateFormatter.format(new Date(event.created_at))}</small>
                    ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}
                  </article>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("")}
    </div>
  `;
}

function clearPendingClientSelection() {
  if (pendingForm?.elements?.namedItem("client_id")) {
    pendingForm.elements.namedItem("client_id").value = "";
  }
}

function applyClientToPending(client) {
  if (!client || !pendingClientSelect || !pendingForm) {
    return;
  }
  pendingClientSelect.value = clientSearchLabel(client);
  pendingForm.elements.namedItem("client_id").value = client.id;
}

function clearPendingQuoteContext() {
  state.pendingQuoteSeedId = null;
  setQuoteField("pending_request_id", "");
  if (pendingOriginBadge) {
    pendingOriginBadge.hidden = true;
    pendingOriginBadge.textContent = "Desde pendiente";
  }
}

function setPendingQuoteContext(pending) {
  const pendingId = Number(pending?.id || 0);
  if (!pendingId) {
    clearPendingQuoteContext();
    return;
  }
  state.pendingQuoteSeedId = pendingId;
  setQuoteField("pending_request_id", pendingId);
  if (pendingOriginBadge) {
    pendingOriginBadge.hidden = false;
    pendingOriginBadge.textContent = `Desde pendiente #${pendingId}`;
  }
}

function buildPendingQuoteNotes(pending) {
  const lines = [];
  if (pending?.title) {
    lines.push(`Solicitud del cliente: ${pending.title}`);
  }
  if (pending?.category) {
    lines.push(`Categoria sugerida: ${pending.category}`);
  }
  if (pending?.desired_store) {
    lines.push(`Tienda deseada: ${pending.desired_store}`);
  }
  if (pending?.desired_size) {
    lines.push(`Talla / medida: ${pending.desired_size}`);
  }
  if (pending?.desired_color) {
    lines.push(`Color / estilo: ${pending.desired_color}`);
  }
  if (Number(pending?.quantity || 0) > 0) {
    lines.push(`Cantidad: ${Number(pending.quantity)}`);
  }
  if (Number(pending?.budget_cop || 0) > 0) {
    lines.push(`Presupuesto objetivo: ${formatCop(pending.budget_cop)}`);
  }
  if (pending?.reference_url) {
    lines.push(`Referencia: ${pending.reference_url}`);
  }
  if (pending?.reference_notes) {
    lines.push(`Detalle de referencia: ${pending.reference_notes}`);
  }
  if (pending?.notes) {
    lines.push(`Notas internas: ${pending.notes}`);
  }
  return lines.join("\n");
}

function resetQuoteComposerState() {
  resetQuoteEditingState();
  state.quoteLineItems = [];
  state.lastPayload = null;
  state.lastResult = null;
  quoteForm.reset();
  clientSelect.value = "";
  if (productSelect) {
    productSelect.value = "";
  }
  clearClientFromQuote();
  clearProductFromQuote();
  clearPendingQuoteContext();
  syncPurchaseTypeUi();
  renderQuoteLineItems();
  resultsContainer.className = "results-empty";
  resultsContainer.innerHTML =
    "<p>Cuando calcules, aqui veras el costo real, el precio sugerido y el escenario final.</p>";
  statusMessage.textContent = "Volviste al modo de nueva cotizacion.";
  renderQuoteLiveSummary();
  invalidateQuoteCalculation();
}

function seedQuoteFromPending(pending) {
  if (!pending) {
    return;
  }

  resetQuoteComposerState();
  setPendingQuoteContext(pending);

  const client = state.clients.find((item) => String(item.id) === String(pending.client_id));
  if (client) {
    clientSelect.value = clientSearchLabel(client);
    setQuoteField("client_id", client.id);
    setQuoteField("client_name", client.name);
  } else {
    clientSelect.value = pending.client_name || "";
    setQuoteField("client_name", pending.client_name || "");
  }

  setQuoteField("notes", buildPendingQuoteNotes(pending));
  const clientQuoteItemsField = quoteElements.namedItem("client_quote_items_text");
  if (clientQuoteItemsField) {
    clientQuoteItemsField.value = "";
    clientQuoteItemsField.dataset.autoGenerated = "";
  }
  if (quoteModeBadge) {
    quoteModeBadge.textContent = `Cotizando pendiente #${pending.id}`;
  }
  saveButton.disabled = true;
  statusMessage.textContent =
    "Pendiente cargado. Ahora selecciona el producto real que encontraste y arma la cotizacion.";
  window.location.hash = "cotizacion";
}

function applyClientToQuote(client) {
  if (!client) {
    return;
  }

  invalidateQuoteCalculation();
  clientSelect.value = clientSearchLabel(client);
  setQuoteField("client_id", client.id);
  setQuoteField("client_name", client.name);
  renderQuoteLiveSummary();
  scheduleQuoteCalculation();
}

function applyProductToQuote(product) {
  if (!product) {
    return;
  }

  if (!quoteElements.namedItem("notes").value.trim() && product.notes) {
    setQuoteField("notes", product.notes);
  }
  addProductToQuote(product);
}

function ensureQuoteSelection(payload) {
  ensureQuoteClientSelection(payload);
  if (!payload.product_id || !payload.product_name) {
    throw new Error("Selecciona un producto guardado del catalogo.");
  }
}

function normalizeStoredQuoteItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const input = item.input && typeof item.input === "object" ? item.input : item;
  const result = item.result && typeof item.result === "object" ? item.result : null;
  const lineItem =
    Array.isArray(result?.line_items) && result.line_items.length ? result.line_items[0] : null;
  const finalData = result?.final || {};
  const costsData = result?.costs || {};
  const quantity = Number(item.quantity || input.quantity || lineItem?.quantity || 1);

  return {
    product_id: toNumberOrNull(item.product_id ?? input.product_id),
    product_name: String(item.product_name || input.product_name || "Producto").trim(),
    reference: String(item.reference || input.reference || lineItem?.reference || "").trim(),
    category: String(item.category || input.category || lineItem?.category || "").trim(),
    store: String(item.store || input.store || lineItem?.store || "").trim(),
    quantity: Math.max(1, quantity || 1),
    purchase_type: String(item.purchase_type || input.purchase_type || "online").trim().toLowerCase(),
    input,
    result,
    sale_price_cop: Number(item.sale_price_cop || finalData.sale_price_cop || 0),
    advance_cop: Number(item.advance_cop || finalData.advance_cop || 0),
    profit_cop: Number(item.profit_cop || finalData.profit_cop || 0),
    real_cost_cop: Number(item.real_cost_cop || costsData.real_total_cost_cop || 0),
  };
}

function renderQuoteLineItems() {
  if (!quoteLineItemsContainer) {
    return;
  }

  if (!state.quoteLineItems.length) {
    quoteLineItemsContainer.className = "catalog-empty";
    quoteLineItemsContainer.innerHTML = "<p>Aun no has agregado productos a esta cotizacion.</p>";
    return;
  }

  const totalSale = state.quoteLineItems.reduce((total, item) => total + Number(item.sale_price_cop || 0), 0);
  const totalAdvance = state.quoteLineItems.reduce(
    (total, item) => total + Number(item.advance_cop || 0),
    0
  );
  const totalProfit = state.quoteLineItems.reduce((total, item) => total + Number(item.profit_cop || 0), 0);

  quoteLineItemsContainer.className = "quote-line-items";
  quoteLineItemsContainer.innerHTML = `
    <article class="quote-line-summary-card">
      <div class="quote-line-summary-metric">
        <span>Total cotizacion</span>
        <strong>${formatCop(totalSale)}</strong>
      </div>
      <div class="quote-line-summary-metric">
        <span>Anticipo total</span>
        <strong>${formatCop(totalAdvance)}</strong>
      </div>
      <div class="quote-line-summary-metric">
        <span>Utilidad estimada</span>
        <strong>${formatCop(totalProfit)}</strong>
      </div>
      <div class="quote-line-summary-metric">
        <span>Items</span>
        <strong>${state.quoteLineItems.length}</strong>
      </div>
    </article>
    ${state.quoteLineItems
      .map(
        (item, index) => `
          <article class="quote-line-card">
            <div>
              <strong>${escapeHtml(productLabel(item))}</strong>
              <p>
                ${escapeHtml(item.category || "Sin categoria")}
                ${item.store ? ` · ${escapeHtml(item.store)}` : ""}
              </p>
            </div>
            <div class="quote-line-meta">
              <span>${escapeHtml(item.purchase_type === "travel" ? "En viaje" : "Online")}</span>
              <span>${item.quantity} unidad${item.quantity === 1 ? "" : "es"}</span>
              <span>${formatCop(item.sale_price_cop)} venta</span>
              <span>${formatCop(item.advance_cop)} anticipo</span>
            </div>
            <div class="quote-line-actions">
              <button
                type="button"
                class="history-action-button history-action-button-secondary"
                data-edit-quote-line="${index}"
              >
                Editar
              </button>
              <button
                type="button"
                class="history-action-button history-action-button-secondary"
                data-remove-quote-line="${index}"
              >
                Quitar
              </button>
            </div>
          </article>
        `
      )
      .join("")}
  `;
  renderQuoteLiveSummary();
}

function removeQuoteLineItem(index) {
  state.quoteLineItems = state.quoteLineItems.filter((_, itemIndex) => itemIndex !== index);
  if (state.editingQuoteItemIndex === index) {
    setQuoteItemEditorState(null);
  } else if (state.editingQuoteItemIndex !== null && state.editingQuoteItemIndex > index) {
    setQuoteItemEditorState(state.editingQuoteItemIndex - 1);
  }
  renderQuoteLineItems();
  ensureQuoteItemText();
  syncSaveButtonState();
}

function resetQuoteEditingState() {
  state.editingQuoteId = null;
  setQuoteItemEditorState(null);
  if (quoteModeBadge) {
    quoteModeBadge.textContent = "Nueva cotizacion";
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = true;
  }
  saveButton.textContent = "Guardar cotizacion";
}

function loadQuoteItemIntoCalculator(index) {
  const item = state.quoteLineItems[index];
  if (!item) {
    return;
  }

  const input = item.input || {};
  setQuoteItemEditorState(index);
  setQuoteField("product_id", input.product_id || item.product_id || "");
  setQuoteField("product_name", input.product_name || item.product_name || "");
  setQuoteField("reference", input.reference || item.reference || "");
  setQuoteField("category", input.category || item.category || "");
  setQuoteField("store", input.store || item.store || "");
  setQuoteField("quantity", input.quantity || item.quantity || 1);
  setQuoteField("purchase_type", input.purchase_type || item.purchase_type || "online");
  setQuoteField("price_usd_net", input.price_usd_net || 0);
  setQuoteField("tax_usa_percent", input.tax_usa_percent || 0);
  setQuoteField("travel_cost_usd", input.travel_cost_usd || 0);
  setQuoteField("locker_shipping_usd", input.locker_shipping_usd || 0);
  setQuoteField("exchange_rate_cop", input.exchange_rate_cop || 0);
  setQuoteField("local_costs_cop", input.local_costs_cop || 0);
  setQuoteField("desired_margin_percent", input.desired_margin_percent || 0);
  setQuoteField("advance_percent", input.advance_percent || 0);
  setQuoteField("final_sale_price_cop", input.final_sale_price_cop ?? "");
  setQuoteField("final_advance_cop", input.final_advance_cop ?? "");
  if (productSelect) {
    const product = state.products.find((entry) => String(entry.id) === String(input.product_id));
    productSelect.value = product ? productSearchLabel(product) : item.product_name || "";
  }
  syncPurchaseTypeUi();
  if (item.result) {
    state.lastPayload = input;
    state.lastResult = item.result;
    renderResults(item.result);
  } else {
    invalidateQuoteCalculation();
    scheduleQuoteCalculation({ immediate: true });
  }
  renderQuoteLiveSummary();
  syncSaveButtonState();
}

function createQuoteItemFromCurrentCalculation() {
  if (!state.lastPayload || !state.lastResult) {
    throw new Error("Primero calcula el producto actual antes de agregarlo a la cotizacion.");
  }

  return normalizeStoredQuoteItem({
    input: JSON.parse(JSON.stringify(state.lastPayload)),
    result: JSON.parse(JSON.stringify(state.lastResult)),
  });
}

async function syncCurrentProductPricingToCatalog() {
  const payload = readQuotePayload();
  if (!payload.product_id) {
    return null;
  }

  const currentProduct = state.products.find((item) => String(item.id) === String(payload.product_id));
  if (!currentProduct) {
    return null;
  }

  const nextValues = {
    price_usd_net: Number(payload.price_usd_net || 0),
    tax_usa_percent: Number(payload.tax_usa_percent || 0),
    locker_shipping_usd: Number(payload.locker_shipping_usd || 0),
  };
  const changed =
    Number(currentProduct.price_usd_net || 0) !== nextValues.price_usd_net ||
    Number(currentProduct.tax_usa_percent || 0) !== nextValues.tax_usa_percent ||
    Number(currentProduct.locker_shipping_usd || 0) !== nextValues.locker_shipping_usd;

  if (!changed) {
    return null;
  }

  const response = await requestJson(`/api/products/${encodeURIComponent(payload.product_id)}/pricing`, {
    method: "POST",
    body: JSON.stringify(nextValues),
  });
  const updatedProduct = response.item || null;
  if (!updatedProduct) {
    return null;
  }

  state.products = state.products.map((item) =>
    String(item.id) === String(updatedProduct.id) ? { ...item, ...updatedProduct } : item
  );
  updateSearchableOptions(productSelectOptions, state.products, productSearchLabel);
  renderProducts(state.products);
  autocompleteControllers.forEach((controller) => controller.refresh());
  if (productSelect && String(payload.product_id) === String(updatedProduct.id)) {
    productSelect.value = productSearchLabel(updatedProduct);
  }
  if (state.productDetail?.product?.id === updatedProduct.id) {
    await loadProductDetail(updatedProduct.id);
  }
  return updatedProduct;
}

function addCurrentCalculationToQuote() {
  const item = createQuoteItemFromCurrentCalculation();
  if (state.editingQuoteItemIndex === null) {
    state.quoteLineItems = [...state.quoteLineItems, item];
  } else {
    const nextItems = [...state.quoteLineItems];
    nextItems[state.editingQuoteItemIndex] = item;
    state.quoteLineItems = nextItems;
  }
  setQuoteItemEditorState(null);
  renderQuoteLineItems();
  ensureQuoteItemText();
  syncSaveButtonState();
}

function applyProductToQuote(product) {
  loadProductIntoCalculator(product);
}

function applyQuoteRecordToForm(record) {
  const input = record.input || {};
  state.editingQuoteId = record.id;
  const storedQuoteItems = Array.isArray(input.quote_items) && input.quote_items.length
    ? input.quote_items
    : Array.isArray(record.result?.quote_items) && record.result.quote_items.length
      ? record.result.quote_items
      : [
          {
            input,
            result: record.result,
            product_id: input.product_id,
            product_name: input.product_name || record.product_name || "Producto",
            quantity: Number(input.quantity || 1),
            reference: input.reference || "",
            category: input.category || "",
            store: input.store || "",
          },
        ];
  state.quoteLineItems = storedQuoteItems.map(normalizeStoredQuoteItem).filter(Boolean);

  const client = state.clients.find((item) => String(item.id) === String(input.client_id));
  if (client) {
    clientSelect.value = clientSearchLabel(client);
  } else {
    clientSelect.value = input.client_name || record.client_name || "";
  }

  setQuoteField("client_id", input.client_id || "");
  setQuoteField("client_name", input.client_name || record.client_name || "");
  setQuoteField("pending_request_id", input.pending_request_id || "");
  setQuoteField("client_quote_items_text", input.client_quote_items_text || "");
  const clientQuoteItemsField = quoteElements.namedItem("client_quote_items_text");
  if (clientQuoteItemsField) {
    clientQuoteItemsField.dataset.autoGenerated = input.client_quote_items_text ? "false" : "true";
  }
  setQuoteField("notes", input.notes || record.notes || "");

  if (state.quoteLineItems[0]) {
    loadQuoteItemIntoCalculator(0);
  } else {
    clearProductFromQuote();
    syncPurchaseTypeUi();
  }
  if (input.pending_request_id) {
    const linkedPending = state.pendingRequests.find(
      (item) => String(item.id) === String(input.pending_request_id)
    );
    setPendingQuoteContext(linkedPending || { id: input.pending_request_id });
  } else {
    clearPendingQuoteContext();
  }
  renderQuoteLineItems();
  ensureQuoteItemText();
  syncSaveButtonState();

  if (quoteModeBadge) {
    quoteModeBadge.textContent = `Editando cotizacion #${record.id}`;
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = false;
  }
  saveButton.textContent = "Actualizar cotizacion";
  window.location.hash = "cotizacion";
}

function readQuotePayload() {
  const data = new FormData(quoteForm);
  return {
    pending_request_id: toNumberOrNull(data.get("pending_request_id")),
    product_id: toNumberOrNull(data.get("product_id")),
    client_id: toNumberOrNull(data.get("client_id")),
    product_name: String(data.get("product_name") || "").trim(),
    client_name: String(data.get("client_name") || "").trim(),
    reference: String(data.get("reference") || "").trim(),
    category: String(data.get("category") || "").trim(),
    store: String(data.get("store") || "").trim(),
    quantity: Number(data.get("quantity") || 1),
    purchase_type: String(data.get("purchase_type") || "online").trim().toLowerCase() || "online",
    notes: String(data.get("notes") || "").trim(),
    client_quote_items_text: String(data.get("client_quote_items_text") || "").trim(),
    price_usd_net: Number(data.get("price_usd_net") || 0),
    tax_usa_percent: Number(data.get("tax_usa_percent") || 0),
    travel_cost_usd: Number(data.get("travel_cost_usd") || 0),
    locker_shipping_usd: Number(data.get("locker_shipping_usd") || 0),
    exchange_rate_cop: Number(data.get("exchange_rate_cop") || 0),
    local_costs_cop: Number(data.get("local_costs_cop") || 0),
    desired_margin_percent: Number(data.get("desired_margin_percent") || 0),
    advance_percent: Number(data.get("advance_percent") || 0),
    final_sale_price_cop: toNumberOrNull(data.get("final_sale_price_cop")),
    final_advance_cop: toNumberOrNull(data.get("final_advance_cop")),
  };
}

function readQuoteSavePayload() {
  const currentPayload = readQuotePayload();
  const quoteItems = state.quoteLineItems.length
    ? state.quoteLineItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        reference: item.reference || "",
        category: item.category || "",
        store: item.store || "",
        quantity: Number(item.quantity || 1),
        purchase_type: item.purchase_type || item.input?.purchase_type || "online",
        input: item.input || {},
        result: item.result || null,
      }))
    : state.lastResult
      ? [createQuoteItemFromCurrentCalculation()]
      : [];

  return {
    pending_request_id: currentPayload.pending_request_id,
    client_id: currentPayload.client_id,
    client_name: currentPayload.client_name,
    notes: currentPayload.notes,
    client_quote_items_text: currentPayload.client_quote_items_text,
    quote_items: quoteItems,
  };
}

function ensureQuoteCanBeSaved(payload) {
  ensureQuoteClientSelection(payload);
  if (!Array.isArray(payload.quote_items) || !payload.quote_items.length) {
    throw new Error("Agrega al menos un producto calculado a la cotizacion.");
  }
}

async function calculateQuoteFromForm({ manual = false } = {}) {
  if (state.quoteCalculationTimer) {
    window.clearTimeout(state.quoteCalculationTimer);
    state.quoteCalculationTimer = 0;
  }

  if (!quoteForm.checkValidity()) {
    if (manual) {
      quoteForm.reportValidity();
      statusMessage.textContent = "Completa los datos requeridos para calcular la cotizacion.";
    }
    syncSaveButtonState();
    return false;
  }

  const payload = readQuotePayload();
  try {
    ensureQuoteSelection(payload);
  } catch (error) {
    if (manual) {
      statusMessage.textContent = error.message;
    }
    syncSaveButtonState();
    return false;
  }

  const requestId = state.quoteCalculationRequestId + 1;
  state.quoteCalculationRequestId = requestId;
  saveButton.disabled = true;
  statusMessage.textContent = manual
    ? "Calculando cotizacion..."
    : "Actualizando cotizacion automaticamente...";

  try {
    const response = await requestJson("/api/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (requestId !== state.quoteCalculationRequestId) {
      return false;
    }

    state.lastPayload = payload;
    state.lastResult = response.result;

    renderResults(state.lastResult);
    statusMessage.textContent = manual
      ? "Resultado actualizado. Ya puedes guardar la cotizacion."
      : "Cotizacion actualizada automaticamente. Ya puedes guardar la cotizacion.";
    syncSaveButtonState();
    return true;
  } catch (error) {
    if (requestId !== state.quoteCalculationRequestId) {
      return false;
    }

    state.lastPayload = null;
    state.lastResult = null;
    statusMessage.textContent = error.message;
    resultsContainer.className = "results-empty";
    resultsContainer.innerHTML = "<p>No fue posible calcular con los datos enviados.</p>";
    syncSaveButtonState();
    return false;
  }
}

async function requestJsonLegacy(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "No fue posible completar la operación.");
  }
  return payload;
}

async function loadHistory() {
  try {
    const payload = await requestJson("/api/quotes");
    renderHistory(payload.items || []);
  } catch (error) {
    historyContainer.className = "history-empty";
    historyContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

async function loadCatalog() {
  try {
    const [clientsResponse, productsResponse, categoriesResponse, storesResponse] = await Promise.all([
      requestJson("/api/clients"),
      requestJson("/api/products"),
      requestJson("/api/product-categories"),
      requestJson("/api/product-stores"),
    ]);

    state.clients = clientsResponse.items || [];
    state.products = productsResponse.items || [];
    state.productCategories = categoriesResponse.items || [];
    state.productStores = storesResponse.items || [];

    updateSearchableOptions(clientSelectOptions, state.clients, clientSearchLabel);
    updateSearchableOptions(productSelectOptions, state.products, productSearchLabel);
    updateNameOptions(productCategoryOptions, state.productCategories);
    updateNameOptions(productStoreOptions, state.productStores);

    renderClients(state.clients);
    renderProducts(state.products);
    renderNamedCatalogList(
      productCategoriesListContainer,
      state.productCategories,
      "Aun no hay categorias creadas."
    );
    renderNamedCatalogList(
      productStoresListContainer,
      state.productStores,
      "Aun no hay tiendas creadas."
    );
    autocompleteControllers.forEach((controller) => controller.refresh());
  } catch (error) {
    clientsListContainer.className = "catalog-empty";
    productsListContainer.className = "catalog-empty";
    clientsListContainer.innerHTML = `<p>${error.message}</p>`;
    productsListContainer.innerHTML = `<p>${error.message}</p>`;
    renderNamedCatalogList(productCategoriesListContainer, [], error.message);
    renderNamedCatalogList(productStoresListContainer, [], error.message);
  }
}

async function loadPendingRequests() {
  if (!pendingListContainer) {
    return;
  }

  try {
    const payload = await requestJson("/api/pending-requests");
    state.pendingRequests = payload.items || [];
    state.pendingStatuses = payload.statuses || [];
    state.pendingPriorities = payload.priorities || [];
    renderPendingRequests(state.pendingRequests);
    autocompleteControllers.forEach((controller) => controller.refresh());
  } catch (error) {
    pendingListContainer.className = "catalog-empty";
    pendingListContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

async function loadDashboard() {
  try {
    const payload = await requestJson(`/api/dashboard?period=${encodeURIComponent(state.dashboardPeriod)}`);
    state.dashboard = payload.item || null;
    renderDashboard(state.dashboard);
  } catch (error) {
    dashboardSummaryContainer.className = "results-empty";
    dashboardSummaryContainer.innerHTML = `<p>${error.message}</p>`;
    dashboardExpensesContainer.className = "catalog-empty";
    dashboardExpensesContainer.innerHTML = `<p>${error.message}</p>`;
    if (dashboardClientsContainer) {
      dashboardClientsContainer.className = "catalog-empty";
      dashboardClientsContainer.innerHTML = `<p>${error.message}</p>`;
    }
    if (dashboardProductsContainer) {
      dashboardProductsContainer.className = "catalog-empty";
      dashboardProductsContainer.innerHTML = `<p>${error.message}</p>`;
    }
  }
}

async function loadFollowup() {
  if (!followupSummaryContainer) {
    return;
  }

  try {
    const payload = await requestJson("/api/followup");
    state.followup = payload.item || null;
    renderFollowup(state.followup);
  } catch (error) {
    followupSummaryContainer.className = "results-empty";
    followupSummaryContainer.innerHTML = `<p>${error.message}</p>`;
    if (followupAgendaContainer) {
      followupAgendaContainer.className = "catalog-empty";
      followupAgendaContainer.innerHTML = `<p>${error.message}</p>`;
    }
    if (followupPendingContainer) {
      followupPendingContainer.className = "catalog-empty";
      followupPendingContainer.innerHTML = `<p>${error.message}</p>`;
    }
    if (followupPipelineContainer) {
      followupPipelineContainer.className = "catalog-empty";
      followupPipelineContainer.innerHTML = `<p>${error.message}</p>`;
    }
  }
}

async function loadExpenses() {
  try {
    const payload = await requestJson("/api/expenses");
    state.expenses = payload.items || [];
    state.expenseCategories = payload.categories || [];
    updateExpenseCategoryOptions(state.expenseCategories);
    renderExpenses(state.expenses);
  } catch (error) {
    expensesListContainer.className = "catalog-empty";
    expensesListContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

async function loadOrders() {
  try {
    const [statusesResponse, ordersResponse] = await Promise.all([
      requestJson("/api/order-statuses"),
      requestJson("/api/orders"),
    ]);

    state.orderStatuses = statusesResponse.items || [];
    state.orders = ordersResponse.items || [];
    updateSelectOptions(
      orderStatusInsertAfterSelect,
      state.orderStatuses,
      "Agregar al final del flujo",
      (status) => status.label
    );
    renderOrderStatusesAdmin(state.orderStatuses);
    renderOrders(state.orders);
    if (!state.orders.some((item) => item.status_key !== "cycle_closed")) {
      ordersListContainer.className = "catalog-empty";
      ordersListContainer.innerHTML = "<p>Aun no hay compras abiertas.</p>";
    }
  } catch (error) {
    ordersListContainer.className = "catalog-empty";
    ordersListContainer.innerHTML = `<p>${error.message}</p>`;
    orderStatusesListContainer.className = "catalog-empty";
    orderStatusesListContainer.innerHTML = `<p>${error.message}</p>`;
  }
}

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await calculateQuoteFromForm({ manual: true });
});

if (addQuoteItemButton) {
  addQuoteItemButton.addEventListener("click", async () => {
    try {
      const wasEditing = state.editingQuoteItemIndex !== null;
      const updatedProduct = await syncCurrentProductPricingToCatalog();
      addCurrentCalculationToQuote();
      statusMessage.textContent =
        wasEditing
          ? "Producto actualizado dentro de la cotizacion."
          : updatedProduct
            ? "Producto agregado a la cotizacion y sincronizado al catalogo."
            : "Producto agregado a la cotizacion.";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

["price_usd_net", "tax_usa_percent", "locker_shipping_usd"].forEach((fieldName) => {
  const field = quoteElements.namedItem(fieldName);
  if (!field || typeof field.addEventListener !== "function") {
    return;
  }

  field.addEventListener("change", async () => {
    try {
      await syncCurrentProductPricingToCatalog();
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
});

saveButton.addEventListener("click", async () => {
  if (!state.lastResult && !state.quoteLineItems.length) {
    return;
  }

  const payload = readQuoteSavePayload();
  const comesFromPending = Boolean(payload.pending_request_id);
  try {
    ensureQuoteCanBeSaved(payload);
  } catch (error) {
    statusMessage.textContent = error.message;
    return;
  }

  saveButton.disabled = true;
  statusMessage.textContent = state.editingQuoteId
    ? "Actualizando cotizacion..."
    : "Guardando cotizacion...";

  try {
    const updatedProduct = await syncCurrentProductPricingToCatalog();
    const targetUrl = state.editingQuoteId
      ? `/api/quotes/${state.editingQuoteId}/update`
      : "/api/quotes";
    const response = await requestJson(targetUrl, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    statusMessage.textContent = state.editingQuoteId
      ? `Cotizacion #${response.item.id} actualizada${updatedProduct ? " y producto sincronizado." : "."}`
      : updatedProduct
        ? "Cotizacion guardada y producto sincronizado en el catalogo."
        : "Cotizacion guardada en la base de datos local.";
    if (comesFromPending) {
      statusMessage.textContent = state.editingQuoteId
        ? `Cotizacion #${response.item.id} actualizada y vinculada al pendiente comercial.`
        : `Cotizacion #${response.item.id} creada desde el pendiente comercial.`;
    }
    await Promise.all([loadHistory(), loadPendingRequests(), loadFollowup()]);
    await loadCatalog();
    await refreshActiveClientDetail();
    await refreshActiveProductDetail();
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    syncSaveButtonState();
  }
});

clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readClientPayload();
    const response = await requestJson("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    clientForm.reset();
    await loadCatalog();
    const client = state.clients.find((item) => item.id === response.item.id);
    applyClientToQuote(client || response.item);
    await loadClientDetail(response.item.id);
    statusMessage.textContent = "Cliente guardado y disponible para usar en la calculadora.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readProductPayload();
    const response = await requestJson("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    productForm.reset();
    productForm.elements.namedItem("tax_usa_percent").value = 0;
    productForm.elements.namedItem("locker_shipping_usd").value = 0;
    await loadCatalog();
    const product = state.products.find((item) => item.id === response.item.id);
    applyProductToQuote(product || response.item);
    await loadProductDetail(response.item.id);
    statusMessage.textContent = "Producto guardado y precargado en la cotización.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

if (pendingForm) {
  pendingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = readPendingPayload();
      if (!payload.client_id) {
        throw new Error("Selecciona un cliente guardado para este pendiente.");
      }
      const response = await requestJson("/api/pending-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      pendingForm.reset();
      clearPendingClientSelection();
      if (pendingClientSelect) {
        pendingClientSelect.value = "";
      }
      if (pendingForm.elements.namedItem("quantity")) {
        pendingForm.elements.namedItem("quantity").value = 1;
      }
      if (pendingForm.elements.namedItem("priority_key")) {
        pendingForm.elements.namedItem("priority_key").value = "normal";
      }
      await Promise.all([loadPendingRequests(), loadFollowup()]);
      statusMessage.textContent = `Pendiente #${response.item.id} guardado para seguimiento comercial.`;
      window.location.hash = "pendientes";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readExpensePayload();
    await requestJson("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expenseForm.reset();
    expenseForm.elements.namedItem("expense_date").value = toDateInputValue(new Date());
    await Promise.all([loadExpenses(), loadDashboard()]);
    statusMessage.textContent = "Gasto registrado y reflejado en el dashboard.";
    window.location.hash = "gastos";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

orderStatusForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readOrderStatusPayload();
    await requestJson("/api/order-statuses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    orderStatusForm.reset();
    await loadOrders();
    statusMessage.textContent = "Estado creado y agregado al flujo secuencial.";
    window.location.hash = "administracion";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

if (productCategoryForm) {
  productCategoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = new FormData(productCategoryForm);
      await requestJson("/api/product-categories", {
        method: "POST",
        body: JSON.stringify({
          name: String(payload.get("name") || "").trim(),
        }),
      });
      productCategoryForm.reset();
      await loadCatalog();
      statusMessage.textContent = "Categoria agregada al catalogo.";
      window.location.hash = "administracion";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (productStoreForm) {
  productStoreForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = new FormData(productStoreForm);
      await requestJson("/api/product-stores", {
        method: "POST",
        body: JSON.stringify({
          name: String(payload.get("name") || "").trim(),
        }),
      });
      productStoreForm.reset();
      await loadCatalog();
      statusMessage.textContent = "Tienda agregada al catalogo.";
      window.location.hash = "administracion";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

clientSelect.addEventListener("change", () => {
  invalidateQuoteCalculation();
  const client = findClientBySearchValue(clientSelect.value);
  if (client) {
    applyClientToQuote(client);
    statusMessage.textContent = "Cliente aplicado a la cotizacion.";
    return;
  }
  clientSelect.value = "";
  clearClientFromQuote();
});

if (pendingClientSelect) {
  pendingClientSelect.addEventListener("change", () => {
    const client = findClientBySearchValue(pendingClientSelect.value);
    if (client) {
      applyClientToPending(client);
      statusMessage.textContent = "Cliente aplicado al pendiente.";
      return;
    }
    pendingClientSelect.value = "";
    clearPendingClientSelection();
  });
}

productSelect.addEventListener("change", () => {
  const product = findProductBySearchValue(productSelect.value);
  if (product) {
    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado en la calculadora.";
    return;
  }
  productSelect.value = "";
});

if (addProductButton) {
  addProductButton.addEventListener("click", () => {
    const product = findProductBySearchValue(productSelect.value);
    if (!product) {
      statusMessage.textContent = "Busca un producto valido del catalogo y luego agrégalo.";
      return;
    }
    applyProductToQuote(product);
    statusMessage.textContent = "Producto agregado a la cotizacion.";
  });
}

if (quoteLineItemsContainer) {
  quoteLineItemsContainer.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-quote-line]");
    if (editButton) {
      const index = Number(editButton.getAttribute("data-edit-quote-line"));
      if (Number.isNaN(index)) {
        return;
      }
      loadQuoteItemIntoCalculator(index);
      statusMessage.textContent = "Producto cargado para editar en la calculadora.";
      return;
    }

    const removeButton = event.target.closest("[data-remove-quote-line]");
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.getAttribute("data-remove-quote-line"));
    if (Number.isNaN(index)) {
      return;
    }
    removeQuoteLineItem(index);
    statusMessage.textContent = "Producto quitado de la cotizacion.";
  });
}

dashboardPeriodSelect.addEventListener("change", async () => {
  state.dashboardPeriod = dashboardPeriodSelect.value || "daily";
  await loadDashboard();
});

historyContainer.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-quote]");
  if (editButton) {
    const quoteId = editButton.getAttribute("data-edit-quote");
    if (!quoteId || editButton.disabled) {
      return;
    }

    try {
      const payload = await requestJson(`/api/quotes/${quoteId}`);
      applyQuoteRecordToForm(payload.item);
      statusMessage.textContent = `Cotizacion #${quoteId} cargada para edicion.`;
    } catch (error) {
      statusMessage.textContent = error.message;
    }
    return;
  }

  const copyButton = event.target.closest("[data-copy-quote]");
  if (copyButton) {
    const quoteId = copyButton.getAttribute("data-copy-quote");
    if (!quoteId) {
      return;
    }

    const originalText = copyButton.textContent;
    copyButton.disabled = true;
    copyButton.textContent = "Copiando...";

    try {
      const payload = await requestJson(`/api/quotes/${quoteId}/message`);
      await navigator.clipboard.writeText(payload.text);
      copyButton.textContent = "Copiado";
      statusMessage.textContent = "Texto copiado. Ya lo puedes pegar en WhatsApp.";
    } catch (error) {
      copyButton.textContent = "Error al copiar";
      statusMessage.textContent = error.message;
    } finally {
      window.setTimeout(() => {
        copyButton.disabled = false;
        copyButton.textContent = originalText;
      }, 1400);
    }
    return;
  }

  const createOrderButton = event.target.closest("[data-create-order]");
  if (createOrderButton) {
    const quoteId = createOrderButton.getAttribute("data-create-order");
    if (!quoteId) {
      return;
    }

    const quoteTotal = Number(createOrderButton.getAttribute("data-quote-total") || 0);
    const quotedAdvance = Number(createOrderButton.getAttribute("data-quoted-advance") || 0);
    const defaultAdvanceText = String(Math.round(quotedAdvance));
    const rawAdvance = window.prompt(
      `Antes de confirmar la compra, indica cuánto pagó realmente el cliente como anticipo en COP.\n\nValor total: ${formatCop(
        quoteTotal
      )}\nAnticipo cotizado: ${formatCop(quotedAdvance)}`,
      defaultAdvanceText
    );

    if (rawAdvance === null) {
      statusMessage.textContent = "Creación de compra cancelada.";
      return;
    }

    const advancePaidCop = parseCurrencyInput(rawAdvance);
    if (advancePaidCop === null) {
      statusMessage.textContent = "Debes ingresar un valor numérico válido para el anticipo real.";
      return;
    }

    const originalText = createOrderButton.textContent;
    createOrderButton.disabled = true;
    createOrderButton.textContent = "Creando compra...";

    try {
      const payload = await requestJson("/api/orders/from-quote", {
        method: "POST",
        body: JSON.stringify({
          quote_id: Number(quoteId),
          advance_paid_cop: advancePaidCop,
        }),
      });
        await Promise.all([loadHistory(), loadOrders(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = payload.existing
        ? "Esta cotización ya estaba convertida en compra."
        : "Compra creada con el anticipo real del cliente y lista para seguimiento.";
      window.location.hash = "compras";
    } catch (error) {
      createOrderButton.textContent = "Error al crear";
      statusMessage.textContent = error.message;
      window.setTimeout(() => {
        createOrderButton.disabled = false;
        createOrderButton.textContent = originalText;
      }, 1400);
      return;
    }
  }
});

clientsListContainer.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view-client]");
  if (viewButton) {
    const clientId = viewButton.getAttribute("data-view-client");
    if (!clientId) {
      return;
    }
    window.location.hash = "comercial";
    loadClientDetail(clientId);
    return;
  }

  const button = event.target.closest("[data-use-client]");
  if (!button) {
    return;
  }

  const client = state.clients.find((item) => String(item.id) === button.getAttribute("data-use-client"));
  if (client) {
    applyClientToQuote(client);
    statusMessage.textContent = "Cliente cargado desde la base comercial.";
  }
});

if (dashboardClientsContainer) {
  dashboardClientsContainer.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-client]");
    if (!viewButton) {
      return;
    }

    const clientId = viewButton.getAttribute("data-view-client");
    if (!clientId) {
      return;
    }

    window.location.hash = "comercial";
    loadClientDetail(clientId);
  });
}

if (pendingListContainer) {
  pendingListContainer.addEventListener("click", async (event) => {
    const saveStatusButton = event.target.closest("[data-save-pending-status]");
    if (saveStatusButton) {
      const pendingId = saveStatusButton.getAttribute("data-save-pending-status");
      if (!pendingId) {
        return;
      }
      const select = pendingListContainer.querySelector(`[data-pending-status-select="${pendingId}"]`);
      const statusKey = String(select?.value || "").trim();
      const originalText = saveStatusButton.textContent;
      saveStatusButton.disabled = true;
      saveStatusButton.textContent = "Guardando...";
      try {
        await requestJson(`/api/pending-requests/${pendingId}/status`, {
          method: "POST",
          body: JSON.stringify({ status_key: statusKey }),
        });
        await Promise.all([loadPendingRequests(), loadFollowup()]);
        statusMessage.textContent = "Estado del pendiente actualizado.";
      } catch (error) {
        statusMessage.textContent = error.message;
      } finally {
        saveStatusButton.disabled = false;
        saveStatusButton.textContent = originalText;
      }
      return;
    }

    const seedQuoteButton = event.target.closest("[data-seed-pending-quote]");
    if (seedQuoteButton) {
      const pendingId = seedQuoteButton.getAttribute("data-seed-pending-quote");
      const pending = state.pendingRequests.find((item) => String(item.id) === String(pendingId));
      if (!pending) {
        statusMessage.textContent = "No fue posible abrir este pendiente.";
        return;
      }
      seedQuoteFromPending(pending);
      return;
    }

    const openQuoteButton = event.target.closest("[data-open-pending-quote]");
    if (openQuoteButton) {
      const quoteId = openQuoteButton.getAttribute("data-open-pending-quote");
      if (!quoteId) {
        return;
      }
      try {
        const payload = await requestJson(`/api/quotes/${quoteId}`);
        applyQuoteRecordToForm(payload.item);
        statusMessage.textContent = `Cotizacion #${quoteId} cargada desde pendientes.`;
      } catch (error) {
        statusMessage.textContent = error.message;
      }
    }
  });
}

productsListContainer.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view-product]");
  if (viewButton) {
    const productId = viewButton.getAttribute("data-view-product");
    if (!productId) {
      return;
    }
    window.location.hash = "comercial";
    loadProductDetail(productId);
    return;
  }

  const button = event.target.closest("[data-use-product]");
  if (!button) {
    return;
  }

  const product = state.products.find(
    (item) => String(item.id) === button.getAttribute("data-use-product")
  );
  if (product) {
    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado desde el catálogo.";
  }
});

if (dashboardProductsContainer) {
  dashboardProductsContainer.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-product]");
    if (!viewButton) {
      return;
    }

    const productId = viewButton.getAttribute("data-view-product");
    if (!productId) {
      return;
    }

    window.location.hash = "comercial";
    loadProductDetail(productId);
  });
}

[followupAgendaContainer, followupPendingContainer, followupPipelineContainer]
  .filter(Boolean)
  .forEach((container) => {
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-followup-module]");
      if (!button) {
        return;
      }

      const targetModule = button.getAttribute("data-open-followup-module");
      if (!targetModule) {
        return;
      }

      window.location.hash = targetModule;
    });
  });

ordersListContainer.addEventListener("click", async (event) => {
  const travelTransportButton = event.target.closest("[data-save-travel-transport]");
  if (travelTransportButton) {
    const orderId = travelTransportButton.getAttribute("data-save-travel-transport");
    if (!orderId) {
      return;
    }

    const transportSelect = ordersListContainer.querySelector(
      `[data-travel-transport-select="${orderId}"]`
    );
    const travelTransportType = String(transportSelect?.value || "").trim();
    const originalText = travelTransportButton.textContent;
    travelTransportButton.disabled = true;
    travelTransportButton.textContent = "Guardando...";

    try {
      await requestJson(`/api/orders/${orderId}/travel-transport`, {
        method: "POST",
        body: JSON.stringify({
          travel_transport_type: travelTransportType,
        }),
      });
      await Promise.all([loadOrders(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = "Ruta de viaje actualizada.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      travelTransportButton.disabled = false;
      travelTransportButton.textContent = originalText;
    }
    return;
  }

  const secondPaymentButton = event.target.closest("[data-register-second-payment]");
  if (secondPaymentButton) {
    const orderId = secondPaymentButton.getAttribute("data-register-second-payment");
    if (!orderId) {
      return;
    }

    const amountInput = ordersListContainer.querySelector(
      `[data-second-payment-amount="${orderId}"]`
    );
    const dateInput = ordersListContainer.querySelector(
      `[data-second-payment-date="${orderId}"]`
    );

    const amountCop = parseCurrencyInput(amountInput ? amountInput.value : "");
    if (amountCop === null) {
      statusMessage.textContent = "Ingresa un valor válido para registrar el segundo pago.";
      return;
    }

    const receivedAt = String(dateInput ? dateInput.value : "").trim();
    if (!receivedAt) {
      statusMessage.textContent = "Selecciona la fecha en que se recibió el segundo pago.";
      return;
    }

    const originalText = secondPaymentButton.textContent;
    secondPaymentButton.disabled = true;
    secondPaymentButton.textContent = "Registrando...";

    try {
      await requestJson(`/api/orders/${orderId}/second-payment`, {
        method: "POST",
        body: JSON.stringify({
          amount_cop: amountCop,
          received_at: receivedAt,
        }),
      });
      await Promise.all([loadOrders(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = "Segundo pago registrado con valor y fecha.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      secondPaymentButton.disabled = false;
      secondPaymentButton.textContent = originalText;
    }
    return;
  }

  const advanceButton = event.target.closest("[data-advance-order-status]");

  let orderId = null;
  let targetStatus = null;
  let triggerButton = null;

  if (advanceButton) {
    orderId = advanceButton.getAttribute("data-advance-order-status");
    targetStatus = advanceButton.getAttribute("data-next-status-key");
    triggerButton = advanceButton;
  }

  if (!orderId || !targetStatus || !triggerButton) {
    return;
  }

  const originalText = triggerButton.textContent;
  triggerButton.disabled = true;
  triggerButton.textContent = "Actualizando...";

  try {
    await requestJson(`/api/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status_key: targetStatus }),
    });
    await Promise.all([loadOrders(), loadHistory(), loadDashboard(), loadFollowup()]);
    await refreshActiveClientDetail();
    await refreshActiveProductDetail();
    statusMessage.textContent = "Estado de compra actualizado.";
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    triggerButton.disabled = false;
    triggerButton.textContent = originalText;
  }
});

if (clientDetailClearButton) {
  clientDetailClearButton.addEventListener("click", () => {
    state.clientDetail = null;
    renderClientDetail(null);
  });
}

if (clientDetailContainer) {
  clientDetailContainer.addEventListener("click", (event) => {
    const useButton = event.target.closest("[data-use-client-detail]");
    if (!useButton) {
      return;
    }

    const clientId = useButton.getAttribute("data-use-client-detail");
    const client = state.clients.find((item) => String(item.id) === String(clientId));
    if (!client) {
      statusMessage.textContent = "No fue posible cargar este cliente en la cotizacion.";
      return;
    }

    applyClientToQuote(client);
    statusMessage.textContent = "Cliente cargado desde su ficha comercial.";
    window.location.hash = "cotizacion";
  });
}

if (productDetailClearButton) {
  productDetailClearButton.addEventListener("click", () => {
    state.productDetail = null;
    renderProductDetail(null);
  });
}

if (productDetailContainer) {
  productDetailContainer.addEventListener("click", (event) => {
    const useButton = event.target.closest("[data-use-product-detail]");
    if (!useButton) {
      return;
    }

    const productId = useButton.getAttribute("data-use-product-detail");
    const product = state.products.find((item) => String(item.id) === String(productId));
    if (!product) {
      statusMessage.textContent = "No fue posible cargar este producto en la cotización.";
      return;
    }

    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado desde su ficha comercial.";
    window.location.hash = "cotizacion";
  });
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", () => {
    resetQuoteComposerState();
  });
}

quoteForm.addEventListener("input", (event) => {
  if (String(event.target?.name || "") === "client_quote_items_text") {
    event.target.dataset.autoGenerated = "false";
  }
  if (!shouldAutoCalculateQuote(event.target)) {
    return;
  }

  invalidateQuoteCalculation();
  scheduleQuoteCalculation();
});

quoteForm.addEventListener("change", (event) => {
  if (String(event.target?.name || "") === "purchase_type") {
    syncPurchaseTypeUi();
  }

  if (!shouldAutoCalculateQuote(event.target)) {
    return;
  }

  invalidateQuoteCalculation();
  scheduleQuoteCalculation({ immediate: true });
});

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await logout();
    } catch (error) {
      logoutButton.disabled = false;
      statusMessage.textContent = error.message;
    }
  });
}

async function requestJson(url, options = {}) {
  const { suppressUnauthorizedRedirect = false, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  if (fetchOptions.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });
  const rawText = await response.text();
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      if (rawText.trim().startsWith("<")) {
        throw new Error("El servidor devolvio una pagina HTML en lugar de datos. Revisa los logs del deploy.");
      }
      throw new Error("La respuesta del servidor no llego en formato JSON valido.");
    }
  }
  if (!response.ok) {
    if (response.status === 401 && !suppressUnauthorizedRedirect) {
      window.location.href = "/";
    }
    throw new Error(payload.error || "No fue posible completar la operacion.");
  }
  return payload;
}

function setupAutocomplete() {
  autocompleteControllers.length = 0;

  const categoryNameInput = productCategoryForm?.elements?.namedItem("name");
  const storeNameInput = productStoreForm?.elements?.namedItem("name");

  [
    createAutocompleteController(clientSelect, {
      getItems: () => state.clients,
      getLabel: clientSearchLabel,
      getSearchText: clientSearchLabel,
      onSelect: (client) => {
        applyClientToQuote(client);
        statusMessage.textContent = "Cliente aplicado a la cotizacion.";
      },
      emptyMessage: "No hay clientes con esas letras",
    }),
    createAutocompleteController(productSelect, {
      getItems: () => state.products,
      getLabel: productSearchLabel,
      getSearchText: productSearchLabel,
      onSelect: (product) => {
        applyProductToQuote(product);
        statusMessage.textContent = "Producto cargado en la calculadora.";
      },
      emptyMessage: "No hay productos con esas letras",
    }),
    createAutocompleteController(productCategoryInput, {
      getItems: () => state.productCategories,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        productCategoryInput.value = item.name;
      },
      emptyMessage: "No hay categorias con esas letras",
    }),
    createAutocompleteController(productStoreInput, {
      getItems: () => state.productStores,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        productStoreInput.value = item.name;
      },
      emptyMessage: "No hay tiendas con esas letras",
    }),
    createAutocompleteController(pendingClientSelect, {
      getItems: () => state.clients,
      getLabel: clientSearchLabel,
      getSearchText: clientSearchLabel,
      onSelect: (client) => {
        applyClientToPending(client);
        statusMessage.textContent = "Cliente aplicado al pendiente.";
      },
      emptyMessage: "No hay clientes con esas letras",
    }),
    createAutocompleteController(pendingCategoryInput, {
      getItems: () => state.productCategories,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        pendingCategoryInput.value = item.name;
      },
      emptyMessage: "No hay categorias con esas letras",
    }),
    createAutocompleteController(pendingStoreInput, {
      getItems: () => state.productStores,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        pendingStoreInput.value = item.name;
      },
      emptyMessage: "No hay tiendas con esas letras",
    }),
    createAutocompleteController(categoryNameInput, {
      getItems: () => state.productCategories,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        categoryNameInput.value = item.name;
      },
      emptyMessage: "No hay categorias con esas letras",
    }),
    createAutocompleteController(storeNameInput, {
      getItems: () => state.productStores,
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        storeNameInput.value = item.name;
      },
      emptyMessage: "No hay tiendas con esas letras",
    }),
  ]
    .filter(Boolean)
    .forEach((controller) => autocompleteControllers.push(controller));
}

async function loadSession() {
  const session = await requestJson("/api/session");
  state.session = session;
  applyCompanyBranding(session);
  return session;
}

async function logout() {
  await requestJson("/api/logout", {
    method: "POST",
  });
  window.location.href = "/";
}

async function initApp() {
  normalizeAdminCopy();
  syncModuleFromHash();
  syncResponsiveShell();
  syncPurchaseTypeUi();
  resetQuoteEditingState();
  renderQuoteLineItems();
  renderQuoteLiveSummary();
  setupAutocomplete();
  await loadSession();
  state.dashboardPeriod = dashboardPeriodSelect.value || "daily";
  if (expenseForm) {
    expenseForm.elements.namedItem("expense_date").value = toDateInputValue(new Date());
  }
  await Promise.all([
    loadCatalog(),
    loadHistory(),
    loadPendingRequests(),
    loadOrders(),
    loadDashboard(),
    loadFollowup(),
    loadExpenses(),
  ]);
}

if (menuToggleButton) {
  menuToggleButton.addEventListener("click", () => {
    setMenuOpen(!state.menuOpen);
  });
}

if (menuOverlay) {
  menuOverlay.addEventListener("click", () => {
    setMenuOpen(false);
  });
}

window.addEventListener("resize", syncResponsiveShell);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.menuOpen) {
    setMenuOpen(false);
  }
});

window.addEventListener("hashchange", syncModuleFromHash);

initApp().catch((error) => {
  statusMessage.textContent = error.message;
});
