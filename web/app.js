const quoteForm = document.getElementById("quote-form");
const clientForm = document.getElementById("client-form");
const productForm = document.getElementById("product-form");
const productSelectOptions = document.getElementById("quote-products-options");
const clientSelectOptions = document.getElementById("clients-options");
const productSelect = document.getElementById("product-select");
const clientSelect = document.getElementById("client-select");
const addProductButton = document.getElementById("add-product-button");
const addQuoteItemButton = document.getElementById("add-quote-item-button");
const createOrderButton = document.getElementById("create-order-button");
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
const inventoryPurchaseForm = document.getElementById("inventory-purchase-form");
const inventoryPurchaseProductSelect = document.getElementById("inventory-purchase-product-select");
const addInventoryPurchaseItemButton = document.getElementById("add-inventory-purchase-item-button");
const saveInventoryPurchaseButton = document.getElementById("save-inventory-purchase-button");
const inventoryPurchaseDraftContainer = document.getElementById("inventory-purchase-draft");
const inventoryPurchasesListContainer = document.getElementById("inventory-purchases-list");
const orderStatusForm = document.getElementById("order-status-form");
const orderStatusesListContainer = document.getElementById("order-statuses-list");
const orderStatusInsertAfterSelect = document.getElementById("order-status-insert-after");
const productCategoryForm = document.getElementById("product-category-form");
const productStoreForm = document.getElementById("product-store-form");
const productCategoriesListContainer = document.getElementById("product-categories-list");
const productStoresListContainer = document.getElementById("product-stores-list");
const clientsListSearchInput = document.getElementById("clients-list-search");
const productsListSearchInput = document.getElementById("products-list-search");
const productCategoriesSearchInput = document.getElementById("product-categories-search");
const productStoresSearchInput = document.getElementById("product-stores-search");
const publicRegistrationUrlInput = document.getElementById("public-registration-url");
const copyPublicRegistrationUrlButton = document.getElementById("copy-public-registration-url");
const openPublicRegistrationUrlLink = document.getElementById("open-public-registration-url");
const whatsappSettingsForm = document.getElementById("whatsapp-settings-form");
const whatsappTemplateForm = document.getElementById("whatsapp-template-form");
const whatsappTriggerSelect = document.getElementById("whatsapp-trigger-select");
const whatsappTemplatesListContainer = document.getElementById("whatsapp-templates-list");
const productCategoryOptions = document.getElementById("product-categories-options");
const productStoreOptions = document.getElementById("product-stores-options");
const productCategoryInput = document.getElementById("product-category-input");
const productStoreInput = document.getElementById("product-store-input");
const productImageFileInput = document.getElementById("product-image-file");
const productImagePreview = document.getElementById("product-image-preview");
const pendingForm = document.getElementById("pending-form");
const pendingClientSelect = document.getElementById("pending-client-select");
const pendingCategoryInput = document.getElementById("pending-category-input");
const pendingStoreInput = document.getElementById("pending-store-input");
const pendingListContainer = document.getElementById("pending-list");
const pendingOriginBadge = document.getElementById("pending-origin-badge");
const saveButton = document.getElementById("save-button");
const directOrderForm = document.getElementById("direct-order-form");
const directOrderClientSelect = document.getElementById("direct-order-client-select");
const directOrderProductSelect = document.getElementById("direct-order-product-select");
const directOrderLoadProductButton = document.getElementById("direct-order-load-product-button");
const directOrderAddItemButton = document.getElementById("direct-order-add-item-button");
const directOrderCreateButton = document.getElementById("direct-order-create-button");
const directOrderClearButton = document.getElementById("direct-order-clear-button");
const directOrderLineItemsContainer = document.getElementById("direct-order-line-items");
const directOrderLiveSummaryContainer = document.getElementById("direct-order-live-summary");
const directOrderResultsContainer = document.getElementById("direct-order-results");
const directOrderStatusMessage = document.getElementById("direct-order-status-message");
const directOrderModeBadge = document.getElementById("direct-order-mode-badge");
const directOrderPurchaseTypeHelper = document.getElementById("direct-order-purchase-type-helper");
const directOrderInventoryHelper = document.getElementById("direct-order-inventory-helper");
const clientViewButtons = Array.from(document.querySelectorAll("[data-client-view]"));
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
const inventorySaleHelper = document.getElementById("inventory-sale-helper");
const clientSubmitButton = clientForm?.querySelector("[data-client-submit-button]");
const clientCancelButton = clientForm?.querySelector("[data-client-cancel-button]");
const productSubmitButton = productForm?.querySelector("[data-product-submit-button]");
const productCancelButton = productForm?.querySelector("[data-product-cancel-button]");
const categorySubmitButton = productCategoryForm?.querySelector("[data-category-submit-button]");
const categoryCancelButton = productCategoryForm?.querySelector("[data-category-cancel-button]");
const storeSubmitButton = productStoreForm?.querySelector("[data-store-submit-button]");
const storeCancelButton = productStoreForm?.querySelector("[data-store-cancel-button]");

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
  inventoryPurchases: [],
  expenseCategories: [],
  orderStatuses: [],
  whatsappSettings: null,
  whatsappTemplates: [],
  whatsappTriggers: [],
  dashboardPeriod: "daily",
  dashboard: null,
  followup: null,
  activeModule: "dashboard",
  menuOpen: false,
  clientDetail: null,
  clientDetailScope: null,
  productDetail: null,
  clientInlineDetail: null,
  clientInlineDetailId: null,
  productInlineDetail: null,
  productInlineDetailId: null,
  pendingQuoteSeedId: null,
  quoteCalculationTimer: 0,
  quoteCalculationRequestId: 0,
  quoteHistory: [],
  quoteLineItems: [],
  directOrderLastPayload: null,
  directOrderLastResult: null,
  directOrderLineItems: [],
  directOrderCalculationTimer: 0,
  directOrderCalculationRequestId: 0,
  inventoryPurchaseLineItems: [],
  editingQuoteId: null,
  editingQuoteItemIndex: null,
  editingDirectOrderItemIndex: null,
  activeOrderId: null,
  editingClientId: null,
  editingProductId: null,
  editingProductCategoryId: null,
  editingProductStoreId: null,
  clientCatalogView: "list",
  adminFilters: {
    clients: "",
    products: "",
    categories: "",
    stores: "",
  },
  collapsiblePanels: {},
};

const autocompleteControllers = [];

const quoteElements = quoteForm.elements;
const QUOTE_AUTO_CALC_FIELDS = new Set([
  "purchase_type",
  "quantity",
  "uses_inventory_stock",
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
const DIRECT_ORDER_AUTO_CALC_FIELDS = new Set([
  "purchase_type",
  "quantity",
  "uses_inventory_stock",
  "price_usd_net",
  "tax_usa_percent",
  "travel_cost_usd",
  "locker_shipping_usd",
  "exchange_rate_cop",
  "local_costs_cop",
  "desired_margin_percent",
  "final_sale_price_cop",
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
const integerFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
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
  abastecimiento: "abastecimiento",
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
  if (client.identification) {
    parts.push(client.identification);
  }
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

function isEntityActive(item) {
  return Boolean(item?.is_active ?? true);
}

function getActiveClients() {
  return state.clients.filter((item) => isEntityActive(item));
}

function getActiveProducts() {
  return state.products.filter((item) => isEntityActive(item));
}

function getActiveProductCategories() {
  return state.productCategories.filter((item) => isEntityActive(item));
}

function getActiveProductStores() {
  return state.productStores.filter((item) => isEntityActive(item));
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
  const activeClients = getActiveClients();
  return (
    activeClients.find((item) => clientSearchLabel(item) === cleanValue) ||
    activeClients.find(
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
  const activeProducts = getActiveProducts();
  return (
    activeProducts.find((item) => productSearchLabel(item) === cleanValue) ||
    activeProducts.find((item) => productLabel(item) === cleanValue) ||
    activeProducts.find(
      (item) => String(item.name || "").trim().toLocaleLowerCase("es-CO") === loweredValue
    ) ||
    null
  );
}

function clearInventoryPurchaseProductSelection() {
  if (!inventoryPurchaseForm) {
    return;
  }
  inventoryPurchaseForm.elements.namedItem("product_id").value = "";
  inventoryPurchaseForm.elements.namedItem("product_name").value = "";
  if (inventoryPurchaseProductSelect) {
    inventoryPurchaseProductSelect.value = "";
  }
}

function applyProductToInventoryPurchaseSelection(product) {
  if (!inventoryPurchaseForm || !product) {
    return;
  }
  inventoryPurchaseForm.elements.namedItem("product_id").value = String(product.id || "");
  inventoryPurchaseForm.elements.namedItem("product_name").value = String(product.name || "");
  if (inventoryPurchaseProductSelect) {
    inventoryPurchaseProductSelect.value = productSearchLabel(product);
  }
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
  setQuoteField("price_usd_net", "");
  setQuoteField("tax_usa_percent", "");
  setQuoteField("locker_shipping_usd", "");
  setQuoteField("final_sale_price_cop", "");
  setQuoteField("final_advance_cop", "");
  setQuoteField("uses_inventory_stock", "");
  const inventoryField = getQuoteField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = false;
  }
  if (productSelect) {
    productSelect.value = "";
  }
  syncInventorySaleUi(null);
  renderQuoteLiveSummary();
}

function prepareQuoteCalculatorForNextProduct() {
  clearProductFromQuote();
  invalidateQuoteCalculation();
  resultsContainer.className = "results-empty";
  resultsContainer.innerHTML =
    "<p>Producto agregado. Carga el siguiente y aqui veras el nuevo calculo.</p>";
  statusMessage.textContent = "Producto agregado a la cotizacion. La calculadora quedo lista para el siguiente.";
}

function getDirectOrderField(name) {
  return directOrderForm?.elements?.namedItem(name) || null;
}

function setDirectOrderField(name, value) {
  const field = getDirectOrderField(name);
  if (field) {
    field.value = value ?? "";
  }
}

function getDirectOrderPurchaseType() {
  return (
    String(getDirectOrderField("purchase_type")?.value || "online").trim().toLowerCase() || "online"
  );
}

function getCurrentDirectOrderProduct() {
  const productId = String(getDirectOrderField("product_id")?.value || "").trim();
  if (!productId) {
    return null;
  }
  return state.products.find((item) => String(item.id) === productId) || null;
}

function invalidateDirectOrderCalculation() {
  if (state.directOrderCalculationTimer) {
    window.clearTimeout(state.directOrderCalculationTimer);
    state.directOrderCalculationTimer = 0;
  }
  state.directOrderCalculationRequestId += 1;
}

function clearDirectOrderClientSelection() {
  setDirectOrderField("client_id", "");
  setDirectOrderField("client_name", "");
  if (directOrderClientSelect) {
    directOrderClientSelect.value = "";
  }
  renderDirectOrderLiveSummary();
}

function applyClientToDirectOrder(client) {
  if (!client) {
    clearDirectOrderClientSelection();
    return;
  }
  setDirectOrderField("client_id", client.id);
  setDirectOrderField("client_name", client.name || "");
  if (directOrderClientSelect) {
    directOrderClientSelect.value = clientSearchLabel(client);
  }
  renderDirectOrderLiveSummary();
}

function clearDirectOrderProductSelection() {
  setDirectOrderField("product_id", "");
  setDirectOrderField("product_name", "");
  setDirectOrderField("reference", "");
  setDirectOrderField("category", "");
  setDirectOrderField("store", "");
  setDirectOrderField("quantity", 1);
  setDirectOrderField("price_usd_net", "");
  setDirectOrderField("tax_usa_percent", "");
  setDirectOrderField("travel_cost_usd", "");
  setDirectOrderField("locker_shipping_usd", "");
  setDirectOrderField("local_costs_cop", "");
  setDirectOrderField("final_sale_price_cop", "");
  const inventoryField = getDirectOrderField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = false;
  }
  if (directOrderProductSelect) {
    directOrderProductSelect.value = "";
  }
  syncDirectOrderInventoryUi(null);
  renderDirectOrderLiveSummary();
}

function setDirectOrderItemEditorState(index = null) {
  state.editingDirectOrderItemIndex = Number.isInteger(index) && index >= 0 ? index : null;
  if (directOrderModeBadge) {
    directOrderModeBadge.hidden = state.editingDirectOrderItemIndex === null;
    directOrderModeBadge.textContent =
      state.editingDirectOrderItemIndex === null
        ? "Editando producto"
        : `Editando item ${state.editingDirectOrderItemIndex + 1}`;
  }
  if (directOrderAddItemButton) {
    directOrderAddItemButton.textContent =
      state.editingDirectOrderItemIndex === null
        ? "Agregar producto a la compra"
        : "Actualizar producto en la compra";
  }
  renderDirectOrderLiveSummary();
}

function setCalculationResultsEmpty(container, message) {
  if (!container) {
    return;
  }
  container.className = "results-empty";
  container.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderCalculationResults(result, container) {
  if (!container) {
    return;
  }

  const costs = result.costs;
  const suggested = result.suggested;
  const finalData = result.final;
  container.className = "results-ready";
  container.innerHTML = `
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
            ["Margen final", finalData.margin_percent],
            ["Anticipo final", finalData.advance_cop],
            ["Capital propio final", finalData.own_capital_cop],
            ["Markup final", finalData.markup_percent],
            ["ROI final", finalData.roi_percent],
          ],
          (value, label) => {
            if (["Margen final", "Markup final", "ROI final"].includes(label)) {
              return formatPercent(value);
            }
            return formatCop(value);
          }
        )}
      </section>
    </div>
  `;
}

function syncDirectOrderPurchaseTypeUi() {
  const purchaseType = getDirectOrderPurchaseType();
  const isTravel = purchaseType === "travel";
  const purchaseTypeField = getDirectOrderField("purchase_type");
  const travelField = getDirectOrderField("travel_cost_usd");
  const localCostsField = getDirectOrderField("local_costs_cop");
  if (purchaseTypeField) {
    purchaseTypeField.value = purchaseType;
  }
  if (travelField && !isTravel) {
    travelField.value = "0";
  }
  if (localCostsField && !isTravel) {
    localCostsField.value = "0";
  }
  if (directOrderPurchaseTypeHelper) {
    directOrderPurchaseTypeHelper.textContent = isTravel
      ? "La compra quedara en modo viaje. Puedes usar costo de viaje y tambien envio si una parte viene por casillero."
      : "La compra quedara en modo online. Usa envio/casillero y deja costo de viaje en cero.";
  }
}

function shouldAutoCalculateDirectOrder(target) {
  const fieldName = String(target?.name || "").trim();
  return DIRECT_ORDER_AUTO_CALC_FIELDS.has(fieldName);
}

function syncDirectOrderInventoryUi(product = getCurrentDirectOrderProduct()) {
  const inventoryField = getDirectOrderField("uses_inventory_stock");
  if (!inventoryField) {
    return;
  }

  const inventoryEnabled = Boolean(product?.inventory_enabled);
  const currentStock = Number(product?.current_stock || 0);
  if (!inventoryEnabled) {
    inventoryField.checked = false;
  }
  inventoryField.disabled = !inventoryEnabled || currentStock <= 0;

  if (!directOrderInventoryHelper) {
    return;
  }

  if (!product) {
    directOrderInventoryHelper.textContent =
      "Activa esta opcion solo cuando el producto ya esta disponible en tienda para entrega inmediata.";
    return;
  }

  if (!inventoryEnabled) {
    directOrderInventoryHelper.textContent =
      "Este producto no tiene inventario de tienda activo. Puedes venderlo por importacion normal.";
    return;
  }

  if (currentStock <= 0) {
    directOrderInventoryHelper.textContent =
      "Este producto maneja inventario, pero hoy no tiene unidades disponibles para salida inmediata.";
    return;
  }

  const inventoryUnitCost = getCurrentInventoryUnitCost(product);
  if (inventoryUnitCost <= 0) {
    directOrderInventoryHelper.textContent =
      "Este producto tiene stock, pero aun no tiene costo promedio registrado. Usa Abastecimiento para cargar el costo real.";
    return;
  }

  directOrderInventoryHelper.textContent = `Stock disponible: ${currentStock} unidad${
    currentStock === 1 ? "" : "es"
  }. Costo promedio: ${formatCop(inventoryUnitCost)}.`;
}

function renderDirectOrderLiveSummary() {
  if (!directOrderLiveSummaryContainer || !directOrderForm) {
    return;
  }

  const clientName = String(getDirectOrderField("client_name")?.value || directOrderClientSelect?.value || "").trim();
  const productName = String(
    getDirectOrderField("product_name")?.value || directOrderProductSelect?.value || ""
  ).trim();
  const totals = getDirectOrderAggregateTotals();
  const exchangeRateCop = Number(getDirectOrderField("exchange_rate_cop")?.value || 0);
  const finalData = state.directOrderLastResult?.final || null;
  const workingValue = finalData ? formatCop(finalData.sale_price_cop) : "Sin calcular";
  const itemsLabel = state.directOrderLineItems.length
    ? `${state.directOrderLineItems.length} item${state.directOrderLineItems.length === 1 ? "" : "s"}`
    : "Sin items";

  if (!clientName && !productName && !state.directOrderLineItems.length && !finalData) {
    directOrderLiveSummaryContainer.className = "quote-live-summary quote-live-summary-empty";
    directOrderLiveSummaryContainer.innerHTML =
      "<p>Selecciona cliente y producto para empezar a armar la compra directa.</p>";
    return;
  }

  directOrderLiveSummaryContainer.className = "quote-live-summary";
  directOrderLiveSummaryContainer.innerHTML = `
    <div class="quote-live-summary-grid">
      <article class="quote-live-summary-card">
        <span>Cliente</span>
        <strong>${escapeHtml(clientName || "Sin seleccionar")}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>Producto actual</span>
        <strong>${escapeHtml(productName || "Carga un producto")}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>TRM general</span>
        <strong>${exchangeRateCop ? formatCop(exchangeRateCop) : "Sin TRM"}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>Calculo actual</span>
        <strong>${workingValue}</strong>
      </article>
      <article class="quote-live-summary-card">
        <span>Compra armada</span>
        <strong>${escapeHtml(itemsLabel)}</strong>
        <small>${
          state.directOrderLineItems.length
            ? `${formatCop(totals.discountedSale)}${totals.generalDiscountCop ? ` · desc. ${formatCop(totals.generalDiscountCop)}` : ""}`
            : "Aun no hay total acumulado"
        }</small>
      </article>
      <article class="quote-live-summary-card">
        <span>Utilidad estimada</span>
        <strong>${formatCop(totals.discountedProfit)}</strong>
        <small>Sobre los productos ya agregados</small>
      </article>
      <article class="quote-live-summary-card">
        <span>Envio / casillero</span>
        <strong>${formatCop(totals.totalShippingCop)}</strong>
        <small>${formatUsd(totals.totalShippingUsd)} acumulado</small>
      </article>
      <article class="quote-live-summary-card">
        <span>Costo de viaje</span>
        <strong>${formatCop(totals.totalTravelCop)}</strong>
        <small>${formatUsd(totals.totalTravelUsd)} acumulado</small>
      </article>
      <article class="quote-live-summary-card">
        <span>Descuento general</span>
        <strong>${formatCop(totals.generalDiscountCop)}</strong>
        <small>${totals.generalDiscountCop ? "Se aplica a toda la compra" : "Sin descuento adicional"}</small>
      </article>
    </div>
  `;
}

function getDirectOrderGeneralDiscountCop() {
  const parsed = parseCurrencyInput(getDirectOrderField("general_discount_cop")?.value || "");
  if (parsed === null || Number.isNaN(parsed)) {
    return 0;
  }
  return Math.max(Number(parsed), 0);
}

function getDirectOrderAggregateTotals() {
  const totalSale = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.sale_price_cop || 0),
    0
  );
  const totalProfit = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.profit_cop || 0),
    0
  );
  const totalShippingUsd = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.result?.costs?.applied_locker_shipping_usd || 0),
    0
  );
  const totalShippingCop = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.result?.costs?.locker_shipping_cop || 0),
    0
  );
  const totalTravelUsd = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.result?.costs?.applied_travel_cost_usd || 0),
    0
  );
  const totalTravelCop = state.directOrderLineItems.reduce(
    (total, item) => total + Number(item.result?.costs?.travel_cost_cop || 0),
    0
  );
  const rawDiscount = getDirectOrderGeneralDiscountCop();
  const generalDiscountCop = Math.min(rawDiscount, totalSale);
  const discountedSale = Math.max(totalSale - generalDiscountCop, 0);
  const discountedProfit = totalProfit - generalDiscountCop;
  const actualAdvance = parseCurrencyInput(getDirectOrderField("advance_paid_cop")?.value || "0") || 0;
  const balance = Math.max(discountedSale - actualAdvance, 0);
  return {
    totalSale,
    totalProfit,
    totalShippingUsd,
    totalShippingCop,
    totalTravelUsd,
    totalTravelCop,
    generalDiscountCop,
    discountedSale,
    discountedProfit,
    actualAdvance,
    balance,
  };
}

function ensureDirectOrderItemText() {
  const field = getDirectOrderField("client_quote_items_text");
  if (!field) {
    return;
  }
  const shouldAutofill = !field.value.trim() || field.dataset.autoGenerated === "true";
  if (!shouldAutofill) {
    return;
  }
  field.value = state.directOrderLineItems
    .map((item) => {
      const quantityPrefix = item.quantity > 1 ? `${item.quantity} x ` : "";
      return `${quantityPrefix}${productLabel(item)}`;
    })
    .join("\n");
  field.dataset.autoGenerated = state.directOrderLineItems.length ? "true" : "";
}

function readDirectOrderCurrentPayload() {
  const data = new FormData(directOrderForm);
  const currentProduct = state.products.find(
    (item) => String(item.id) === String(data.get("product_id") || "").trim()
  );
  const usesInventoryStock = data.get("uses_inventory_stock") === "on";
  return {
    product_id: toNumberOrNull(data.get("product_id")),
    client_id: toNumberOrNull(data.get("client_id")),
    product_name: String(data.get("product_name") || "").trim(),
    client_name: String(data.get("client_name") || "").trim(),
    reference: String(data.get("reference") || "").trim(),
    category: String(data.get("category") || "").trim(),
    store: String(data.get("store") || "").trim(),
    quantity: Number(data.get("quantity") || 1),
    purchase_type: getDirectOrderPurchaseType(),
    uses_inventory_stock: usesInventoryStock,
    inventory_unit_cost_cop: usesInventoryStock ? Number(currentProduct?.inventory_unit_cost_cop || 0) : 0,
    notes: String(data.get("notes") || "").trim(),
    client_quote_items_text: String(data.get("client_quote_items_text") || "").trim(),
    price_usd_net: Number(data.get("price_usd_net") || 0),
    tax_usa_percent: Number(data.get("tax_usa_percent") || 0),
    travel_cost_usd: Number(data.get("travel_cost_usd") || 0),
    locker_shipping_usd: Number(data.get("locker_shipping_usd") || 0),
    exchange_rate_cop: Number(data.get("exchange_rate_cop") || 0),
    local_costs_cop: Number(data.get("local_costs_cop") || 0),
    desired_margin_percent: Number(data.get("desired_margin_percent") || 0),
    advance_percent: 50,
    final_sale_price_cop: toNumberOrNull(data.get("final_sale_price_cop")),
  };
}

function ensureDirectOrderSelection(payload) {
  if (!payload.client_id || !payload.client_name) {
    throw new Error("Selecciona un cliente guardado para la compra.");
  }
  if (!payload.product_id || !payload.product_name) {
    throw new Error("Selecciona un producto guardado del catalogo.");
  }
  if (payload.uses_inventory_stock && Number(payload.inventory_unit_cost_cop || 0) <= 0) {
    throw new Error(
      "Este producto aun no tiene costo promedio de inventario. Registra primero el abastecimiento real."
    );
  }
}

function renderDirectOrderResults(result) {
  renderCalculationResults(result, directOrderResultsContainer);
}

async function calculateDirectOrderFromForm({ manual = false } = {}) {
  if (!directOrderForm) {
    return false;
  }
  if (state.directOrderCalculationTimer) {
    window.clearTimeout(state.directOrderCalculationTimer);
    state.directOrderCalculationTimer = 0;
  }

  if (!directOrderForm.checkValidity()) {
    if (manual) {
      directOrderForm.reportValidity();
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = "Completa los datos requeridos para calcular el producto.";
      }
    }
    syncDirectOrderCreateState();
    return false;
  }

  const payload = readDirectOrderCurrentPayload();
  try {
    ensureDirectOrderSelection(payload);
  } catch (error) {
    if (manual && directOrderStatusMessage) {
      directOrderStatusMessage.textContent = error.message;
    }
    syncDirectOrderCreateState();
    return false;
  }

  const requestId = state.directOrderCalculationRequestId + 1;
  state.directOrderCalculationRequestId = requestId;
  if (directOrderCreateButton) {
    directOrderCreateButton.disabled = true;
  }
  if (directOrderStatusMessage) {
    directOrderStatusMessage.textContent = manual
      ? "Calculando producto para la compra..."
      : "Actualizando producto automaticamente...";
  }

  try {
    const response = await requestJson("/api/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (requestId !== state.directOrderCalculationRequestId) {
      return false;
    }

    state.directOrderLastPayload = payload;
    state.directOrderLastResult = response.result;
    renderDirectOrderResults(state.directOrderLastResult);
    if (directOrderStatusMessage) {
      directOrderStatusMessage.textContent = manual
        ? "Resultado actualizado. Ya puedes agregar el producto a la compra."
        : "Producto recalculado automaticamente.";
    }
    renderDirectOrderLiveSummary();
    syncDirectOrderCreateState();
    return true;
  } catch (error) {
    if (requestId !== state.directOrderCalculationRequestId) {
      return false;
    }
    state.directOrderLastPayload = null;
    state.directOrderLastResult = null;
    setCalculationResultsEmpty(
      directOrderResultsContainer,
      "No fue posible calcular este producto con los valores actuales."
    );
    if (directOrderStatusMessage) {
      directOrderStatusMessage.textContent = error.message;
    }
    syncDirectOrderCreateState();
    return false;
  }
}

function scheduleDirectOrderCalculation({ immediate = false } = {}) {
  if (state.directOrderCalculationTimer) {
    window.clearTimeout(state.directOrderCalculationTimer);
    state.directOrderCalculationTimer = 0;
  }

  const runCalculation = () => {
    state.directOrderCalculationTimer = 0;
    void calculateDirectOrderFromForm();
  };

  if (immediate) {
    runCalculation();
    return;
  }

  state.directOrderCalculationTimer = window.setTimeout(runCalculation, 320);
}

function loadProductIntoDirectOrderCalculator(product) {
  if (!product) {
    return;
  }

  invalidateDirectOrderCalculation();
  setDirectOrderItemEditorState(null);
  setDirectOrderField("product_id", product.id);
  setDirectOrderField("product_name", product.name);
  setDirectOrderField("reference", product.reference || "");
  setDirectOrderField("category", product.category || "");
  setDirectOrderField("store", product.store || "");
  setDirectOrderField("quantity", 1);
  const inventoryField = getDirectOrderField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = false;
  }
  setDirectOrderField("price_usd_net", Number(product.price_usd_net || 0).toFixed(2));
  setDirectOrderField("tax_usa_percent", Number(product.tax_usa_percent || 0).toFixed(2));
  setDirectOrderField("travel_cost_usd", "0.00");
  setDirectOrderField("locker_shipping_usd", Number(product.locker_shipping_usd || 0).toFixed(2));
  setDirectOrderField("final_sale_price_cop", "");
  if (directOrderProductSelect) {
    directOrderProductSelect.value = productSearchLabel(product);
  }
  syncDirectOrderInventoryUi(product);
  syncDirectOrderPurchaseTypeUi();
  renderDirectOrderLiveSummary();
  scheduleDirectOrderCalculation({ immediate: true });
}

function createDirectOrderItemFromCurrentCalculation() {
  if (!state.directOrderLastPayload || !state.directOrderLastResult) {
    throw new Error("Primero calcula el producto actual antes de agregarlo a la compra.");
  }

  const snapshotInput = JSON.parse(JSON.stringify(state.directOrderLastPayload));
  const quantity = Number(snapshotInput.quantity || 1);
  if (snapshotInput.uses_inventory_stock) {
    const currentProduct = state.products.find(
      (item) => String(item.id) === String(snapshotInput.product_id)
    );
    if (!currentProduct || !currentProduct.inventory_enabled) {
      throw new Error("Este producto no tiene inventario de tienda activo.");
    }
    const availableStock = Number(currentProduct.current_stock || 0);
    if (availableStock < quantity) {
      throw new Error(
        `No hay suficiente inventario para este producto. Disponible: ${availableStock}.`
      );
    }
  }

  return normalizeStoredQuoteItem({
    input: snapshotInput,
    result: JSON.parse(JSON.stringify(state.directOrderLastResult)),
  });
}

function prepareDirectOrderCalculatorForNextProduct() {
  clearDirectOrderProductSelection();
  invalidateDirectOrderCalculation();
  state.directOrderLastPayload = null;
  state.directOrderLastResult = null;
  setCalculationResultsEmpty(
    directOrderResultsContainer,
    "Producto agregado. Carga el siguiente y aqui veras el nuevo calculo."
  );
  if (directOrderStatusMessage) {
    directOrderStatusMessage.textContent =
      "Producto agregado a la compra. La calculadora quedo lista para el siguiente.";
  }
}

function addCurrentCalculationToDirectOrder() {
  const item = createDirectOrderItemFromCurrentCalculation();
  if (state.editingDirectOrderItemIndex === null) {
    state.directOrderLineItems = [...state.directOrderLineItems, item];
  } else {
    const nextItems = [...state.directOrderLineItems];
    nextItems[state.editingDirectOrderItemIndex] = item;
    state.directOrderLineItems = nextItems;
  }
  setDirectOrderItemEditorState(null);
  renderDirectOrderLineItems();
  ensureDirectOrderItemText();
  prepareDirectOrderCalculatorForNextProduct();
  syncDirectOrderCreateState();
}

function removeDirectOrderLineItem(index) {
  if (!state.directOrderLineItems[index]) {
    return;
  }

  state.directOrderLineItems = state.directOrderLineItems.filter(
    (_, itemIndex) => itemIndex !== index
  );
  if (state.editingDirectOrderItemIndex === index) {
    setDirectOrderItemEditorState(null);
  } else if (
    state.editingDirectOrderItemIndex !== null &&
    state.editingDirectOrderItemIndex > index
  ) {
    setDirectOrderItemEditorState(state.editingDirectOrderItemIndex - 1);
  }
  renderDirectOrderLineItems();
  ensureDirectOrderItemText();
  syncDirectOrderCreateState();
}

function loadDirectOrderItemIntoCalculator(index) {
  const item = state.directOrderLineItems[index];
  if (!item) {
    return;
  }

  const input = item.input || {};
  setDirectOrderItemEditorState(index);
  setDirectOrderField("product_id", input.product_id || item.product_id || "");
  setDirectOrderField("product_name", input.product_name || item.product_name || "");
  setDirectOrderField("reference", input.reference || item.reference || "");
  setDirectOrderField("category", input.category || item.category || "");
  setDirectOrderField("store", input.store || item.store || "");
  setDirectOrderField("quantity", input.quantity || item.quantity || 1);
  setDirectOrderField("purchase_type", input.purchase_type || item.purchase_type || "online");
  const inventoryField = getDirectOrderField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = Boolean(input.uses_inventory_stock || item.uses_inventory_stock);
  }
  setDirectOrderField("price_usd_net", input.price_usd_net || 0);
  setDirectOrderField("tax_usa_percent", input.tax_usa_percent || 0);
  setDirectOrderField("travel_cost_usd", input.travel_cost_usd || 0);
  setDirectOrderField("locker_shipping_usd", input.locker_shipping_usd || 0);
  setDirectOrderField("exchange_rate_cop", input.exchange_rate_cop || getDirectOrderField("exchange_rate_cop")?.value || 0);
  setDirectOrderField("local_costs_cop", input.local_costs_cop || 0);
  setDirectOrderField("desired_margin_percent", input.desired_margin_percent || 30);
  setDirectOrderField("final_sale_price_cop", input.final_sale_price_cop ?? "");
  if (directOrderProductSelect) {
    const product = state.products.find((entry) => String(entry.id) === String(input.product_id));
    directOrderProductSelect.value = product ? productSearchLabel(product) : item.product_name || "";
  }
  syncDirectOrderInventoryUi(
    state.products.find((entry) => String(entry.id) === String(input.product_id)) || null
  );
  syncDirectOrderPurchaseTypeUi();
  if (item.result) {
    state.directOrderLastPayload = input;
    state.directOrderLastResult = item.result;
    renderDirectOrderResults(item.result);
  } else {
    invalidateDirectOrderCalculation();
    scheduleDirectOrderCalculation({ immediate: true });
  }
  renderDirectOrderLiveSummary();
  syncDirectOrderCreateState();
}

function renderDirectOrderLineItems() {
  if (!directOrderLineItemsContainer) {
    return;
  }

  if (!state.directOrderLineItems.length) {
    directOrderLineItemsContainer.className = "catalog-empty";
    directOrderLineItemsContainer.innerHTML = "<p>Aun no has agregado productos a esta compra directa.</p>";
    renderDirectOrderLiveSummary();
    return;
  }

  const totals = getDirectOrderAggregateTotals();

  directOrderLineItemsContainer.className = "quote-line-items";
  directOrderLineItemsContainer.innerHTML = `
    <article class="quote-line-summary-card">
      <div class="quote-line-summary-metric">
        <span>Total compra</span>
        <strong>${formatCop(totals.discountedSale)}</strong>
        ${
          totals.generalDiscountCop
            ? `<small>Antes del descuento: ${formatCop(totals.totalSale)}</small>`
            : ""
        }
      </div>
      <div class="quote-line-summary-metric">
        <span>Descuento general</span>
        <strong>${formatCop(totals.generalDiscountCop)}</strong>
        <small>Se reparte sobre toda la compra</small>
      </div>
      <div class="quote-line-summary-metric">
        <span>Utilidad estimada</span>
        <strong>${formatCop(totals.discountedProfit)}</strong>
      </div>
      <div class="quote-line-summary-metric">
        <span>Envio / casillero</span>
        <strong>${formatCop(totals.totalShippingCop)}</strong>
        <small>${formatUsd(totals.totalShippingUsd)}</small>
      </div>
      <div class="quote-line-summary-metric">
        <span>Costo de viaje</span>
        <strong>${formatCop(totals.totalTravelCop)}</strong>
        <small>${formatUsd(totals.totalTravelUsd)}</small>
      </div>
      <div class="quote-line-summary-metric">
        <span>Saldo estimado</span>
        <strong>${formatCop(totals.balance)}</strong>
        <small>Con anticipo actual: ${formatCop(totals.actualAdvance)}</small>
      </div>
    </article>
    ${state.directOrderLineItems
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
              ${item.uses_inventory_stock ? "<span>Salida de inventario</span>" : ""}
              <span>${formatCop(item.sale_price_cop)} venta</span>
              <span>${formatCop(item.real_cost_cop)} costo real</span>
              <span>Envio: ${formatUsd(item.result?.costs?.applied_locker_shipping_usd || 0)}</span>
              <span>Viaje: ${formatUsd(item.result?.costs?.applied_travel_cost_usd || 0)}</span>
            </div>
            <div class="quote-line-actions">
              <button
                type="button"
                class="history-action-button history-action-button-secondary"
                data-edit-direct-order-line="${index}"
              >
                Editar
              </button>
              <button
                type="button"
                class="history-action-button history-action-button-secondary"
                data-remove-direct-order-line="${index}"
              >
                Quitar
              </button>
            </div>
          </article>
        `
      )
      .join("")}
  `;
  renderDirectOrderLiveSummary();
}

function enhanceDirectOrderComposerLayout() {
  if (!directOrderForm || directOrderForm.dataset.layoutEnhanced === "true") {
    return;
  }

  directOrderForm.dataset.layoutEnhanced = "true";

  const productPanel = directOrderForm.querySelector(".direct-order-product-panel");
  const productLabel = productPanel?.querySelector("label");
  const fieldGrid = directOrderForm.querySelector(".field-grid");
  const topGrid = directOrderForm.querySelector(".direct-order-top-grid");
  const listPanel = directOrderLineItemsContainer?.closest(".quote-items-panel");
    const legacyResultPanel = directOrderResultsContainer?.closest(".panel");
    const legacyActionsBar = directOrderForm.querySelector(".actions.quote-actions-bar");
  const notesLabel = getDirectOrderField("notes")?.closest("label");
  const advanceLabel = getDirectOrderField("advance_paid_cop")?.closest("label");
  const discountLabel = getDirectOrderField("general_discount_cop")?.closest("label");
  const inventoryLabel = getDirectOrderField("uses_inventory_stock")?.closest("label");
  const purchaseTypeLabel = getDirectOrderField("purchase_type")?.closest("label");
    const hiddenFieldNames = [
      "exchange_rate_cop_legacy",
      "tax_usa_percent",
      "desired_margin_percent",
      "local_costs_cop",
    ];
    const removeFieldNames = new Set(hiddenFieldNames);

  hiddenFieldNames.forEach((fieldName) => {
      const label = getDirectOrderField(fieldName)?.closest("label");
      if (label) {
        label.hidden = true;
      }
    });

  const clientQuoteItemsInput = getDirectOrderField("client_quote_items_text");
  const clientQuoteItemsLabel = clientQuoteItemsInput?.closest("label");
    if (clientQuoteItemsLabel) {
      clientQuoteItemsLabel.hidden = true;
    } else if (clientQuoteItemsInput) {
      clientQuoteItemsInput.hidden = true;
    }

    if (topGrid && purchaseTypeLabel && !topGrid.contains(purchaseTypeLabel)) {
      topGrid.insertBefore(purchaseTypeLabel, topGrid.lastElementChild || null);
    }

    if (productPanel && fieldGrid) {
      fieldGrid.classList.add("direct-order-line-grid");
      if (productLabel && !fieldGrid.contains(productLabel)) {
        fieldGrid.prepend(productLabel);
    }

    const keepFieldNames = new Set([
      "quantity",
      "price_usd_net",
      "locker_shipping_usd",
      "travel_cost_usd",
      "final_sale_price_cop",
    ]);
    fieldGrid.querySelectorAll("label").forEach((label) => {
        const input = label.querySelector("input, select, textarea");
        const fieldName = input?.getAttribute("name") || "";
        if (productLabel === label || keepFieldNames.has(fieldName)) {
          return;
        }
        if (label === purchaseTypeLabel) {
          return;
        }
        if (removeFieldNames.has(fieldName)) {
          if (input instanceof HTMLInputElement) {
            input.type = "hidden";
            directOrderForm.insertBefore(input, directOrderForm.firstChild);
          }
          label.remove();
          return;
        }
        if (
          label !== inventoryLabel &&
          label !== advanceLabel &&
          label !== discountLabel &&
          label !== notesLabel
        ) {
          label.hidden = true;
        }
      });

    if (fieldGrid.parentElement !== productPanel) {
      productPanel.append(fieldGrid);
    }

    let metaRow = productPanel.querySelector(".direct-order-line-meta-row");
    if (!metaRow) {
      metaRow = document.createElement("div");
      metaRow.className = "direct-order-line-meta-row";
      productPanel.append(metaRow);
    }
    if (inventoryLabel) {
      inventoryLabel.classList.add("direct-order-stock-toggle");
      metaRow.append(inventoryLabel);
    }
    if (directOrderPurchaseTypeHelper) {
      metaRow.append(directOrderPurchaseTypeHelper);
    }
    if (directOrderInventoryHelper) {
      productPanel.append(directOrderInventoryHelper);
    }
  }

  if (productPanel && legacyActionsBar) {
    let lineActions = productPanel.querySelector(".direct-order-line-actions");
    if (!lineActions) {
      lineActions = document.createElement("div");
      lineActions.className = "actions quote-actions-bar direct-order-line-actions";
      productPanel.append(lineActions);
    }

    const recalcButton = legacyActionsBar.querySelector('button[type="submit"]');
    if (directOrderAddItemButton) {
      lineActions.append(directOrderAddItemButton);
    }
    if (recalcButton) {
      lineActions.append(recalcButton);
    }
  }

  if (directOrderForm && legacyResultPanel) {
    const resultSection = document.createElement("section");
    resultSection.className = "quote-items-panel direct-order-results-block";

    const header = legacyResultPanel.querySelector(".panel-header");
    if (header) {
      const title = header.querySelector("h2");
      if (title) {
        title.textContent = "Resultado de la linea actual";
      }
      resultSection.append(header);
    }
    if (directOrderResultsContainer) {
      resultSection.append(directOrderResultsContainer);
    }

    if (listPanel) {
      directOrderForm.insertBefore(resultSection, listPanel);
    } else if (productPanel) {
      productPanel.insertAdjacentElement("afterend", resultSection);
    } else {
      directOrderForm.append(resultSection);
    }

    legacyResultPanel.remove();
  }

  if (directOrderForm && (advanceLabel || discountLabel || notesLabel)) {
    const advanceSection = document.createElement("section");
    advanceSection.className = "quote-items-panel direct-order-advance-panel";
    advanceSection.innerHTML = `
      <div class="panel-header panel-header-inline">
        <div>
          <h3>Cierre de la compra</h3>
          <p>Despues de armar los productos, registra el anticipo real del cliente.</p>
        </div>
      </div>
    `;
    const footerGrid = document.createElement("div");
    footerGrid.className = "direct-order-footer-grid";
    if (advanceLabel) {
      footerGrid.append(advanceLabel);
    }
    if (discountLabel) {
      footerGrid.append(discountLabel);
    }
    if (notesLabel) {
      footerGrid.append(notesLabel);
    }
    advanceSection.append(footerGrid);

    if (listPanel) {
      listPanel.insertAdjacentElement("afterend", advanceSection);
    } else {
      directOrderForm.append(advanceSection);
    }
  }

  if (directOrderForm && legacyActionsBar) {
    const submitBar = document.createElement("div");
    submitBar.className = "actions quote-actions-bar direct-order-submit-bar";
    if (directOrderCreateButton) {
      submitBar.append(directOrderCreateButton);
    }
    if (directOrderClearButton) {
      submitBar.append(directOrderClearButton);
    }
    directOrderForm.append(submitBar);
    legacyActionsBar.remove();
  }
}

function buildDirectOrderSavePayload() {
  const currentPayload = readDirectOrderCurrentPayload();
  if (!currentPayload.client_id || !currentPayload.client_name) {
    throw new Error("Selecciona un cliente guardado para la compra.");
  }

  const quoteItems = state.directOrderLineItems.length
      ? state.directOrderLineItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        reference: item.reference || "",
        category: item.category || "",
        store: item.store || "",
        quantity: Number(item.quantity || 1),
        purchase_type: currentPayload.purchase_type,
        uses_inventory_stock: Boolean(item.uses_inventory_stock ?? item.input?.uses_inventory_stock),
        input: {
          ...(item.input || {}),
          client_id: currentPayload.client_id,
          client_name: currentPayload.client_name,
          purchase_type: currentPayload.purchase_type,
          exchange_rate_cop: currentPayload.exchange_rate_cop,
        },
        result: item.result || null,
      }))
    : state.directOrderLastResult
      ? [
          {
            ...createDirectOrderItemFromCurrentCalculation(),
            input: {
              ...(state.directOrderLastPayload || {}),
              client_id: currentPayload.client_id,
              client_name: currentPayload.client_name,
              purchase_type: currentPayload.purchase_type,
              exchange_rate_cop: currentPayload.exchange_rate_cop,
            },
          },
        ]
      : [];

  if (!quoteItems.length) {
    throw new Error("Agrega al menos un producto calculado antes de crear la compra.");
  }

  const generalDiscountCop = getDirectOrderGeneralDiscountCop();
  if (generalDiscountCop < 0) {
    throw new Error("El descuento general no puede ser negativo.");
  }
  const baseTotalSale = quoteItems.reduce((total, item) => {
    const baseSale = Number(
      item.input?.final_sale_price_cop ??
        item.result?.final?.sale_price_cop ??
        item.sale_price_cop ??
        0
    );
    return total + Math.max(baseSale, 0);
  }, 0);
  if (generalDiscountCop > baseTotalSale) {
    throw new Error("El descuento general no puede ser mayor al total de la compra.");
  }

  const advancePaidCop = parseCurrencyInput(getDirectOrderField("advance_paid_cop")?.value || "");
  if (advancePaidCop === null || advancePaidCop < 0) {
    throw new Error("Ingresa un anticipo real valido para esta compra.");
  }

  return {
    client_id: currentPayload.client_id,
    client_name: currentPayload.client_name,
    notes: currentPayload.notes,
    client_quote_items_text: currentPayload.client_quote_items_text,
    general_discount_cop: generalDiscountCop,
    quote_items: quoteItems,
    advance_paid_cop: advancePaidCop,
  };
}

function syncDirectOrderCreateState() {
  const isReady = Boolean(state.directOrderLineItems.length || state.directOrderLastResult);
  if (directOrderCreateButton) {
    directOrderCreateButton.disabled = !isReady;
  }
}

function resetDirectOrderComposerState(
  { statusText = "La compra directa quedo lista para empezar una nueva." } = {}
) {
  if (!directOrderForm) {
    return;
  }
  state.directOrderLineItems = [];
  state.directOrderLastPayload = null;
  state.directOrderLastResult = null;
  state.editingDirectOrderItemIndex = null;
  directOrderForm.reset();
  setDirectOrderField("exchange_rate_cop", 3790);
  setDirectOrderField("desired_margin_percent", 30);
  setDirectOrderField("advance_paid_cop", 0);
  setDirectOrderField("general_discount_cop", 0);
  setDirectOrderField("quantity", 1);
  clearDirectOrderClientSelection();
  clearDirectOrderProductSelection();
  const clientQuoteItemsField = getDirectOrderField("client_quote_items_text");
  if (clientQuoteItemsField) {
    clientQuoteItemsField.dataset.autoGenerated = "";
  }
  setDirectOrderItemEditorState(null);
  syncDirectOrderPurchaseTypeUi();
  renderDirectOrderLineItems();
  setCalculationResultsEmpty(
    directOrderResultsContainer,
    "Cuando calcules, aqui veras el costo real, el precio sugerido y el cierre del producto actual."
  );
  if (directOrderStatusMessage) {
    directOrderStatusMessage.textContent = "Ajusta los valores del producto actual y luego agregalo a la compra.";
  }
  invalidateDirectOrderCalculation();
  statusMessage.textContent = statusText;
  renderDirectOrderLiveSummary();
  syncDirectOrderCreateState();
}

function syncSaveButtonState() {
  const isReady = Boolean(state.quoteLineItems.length || state.lastResult);
  if (saveButton) {
    saveButton.disabled = !isReady;
  }
  if (createOrderButton) {
    createOrderButton.disabled = !isReady;
  }
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
  if (createOrderButton) {
    createOrderButton.textContent =
      state.editingQuoteId || state.editingQuoteItemIndex !== null
        ? "Actualizar y crear compra"
        : "Crear compra directa";
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
  const inventoryField = getQuoteField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = false;
  }
  setQuoteField("price_usd_net", Number(product.price_usd_net || 0).toFixed(2));
  setQuoteField("tax_usa_percent", Number(product.tax_usa_percent || 0).toFixed(2));
  setQuoteField("locker_shipping_usd", Number(product.locker_shipping_usd || 0).toFixed(2));
  if (productSelect) {
    productSelect.value = productSearchLabel(product);
  }
  if (!quoteElements.namedItem("notes").value.trim() && product.notes) {
    setQuoteField("notes", product.notes);
  }
  syncInventorySaleUi(product);
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
    uses_inventory_stock: Boolean(
      item.uses_inventory_stock ?? input.uses_inventory_stock ?? lineItem?.uses_inventory_stock
    ),
    input,
    result,
    sale_price_cop: Number(item.sale_price_cop || finalData.sale_price_cop || 0),
    advance_cop: Number(item.advance_cop || finalData.advance_cop || 0),
    profit_cop: Number(item.profit_cop || finalData.profit_cop || 0),
    real_cost_cop: Number(item.real_cost_cop || costsData.real_total_cost_cop || 0),
  };
}

function getQuoteItemsForPurchaseAdjustment(rawQuoteItems) {
  return (rawQuoteItems || [])
    .map((item) => normalizeStoredQuoteItem(item))
    .filter(Boolean);
}

function collectOrderCreationInputs({
  quoteItems,
  salePriceCop,
  quotedAdvanceCop,
  sourceLabel = "compra",
}) {
  const rawAdvance = window.prompt(
    `Antes de confirmar la ${sourceLabel}, indica cuanto pago realmente el cliente como anticipo en COP.\n\nValor total: ${formatCop(
      salePriceCop
    )}\nAnticipo cotizado: ${formatCop(quotedAdvanceCop)}`,
    String(Math.round(quotedAdvanceCop || 0))
  );

  if (rawAdvance === null) {
    return null;
  }

  const advancePaidCop = parseCurrencyInput(rawAdvance);
  if (advancePaidCop === null) {
    throw new Error("Debes ingresar un valor numerico valido para el anticipo real.");
  }

  const actualPurchasePrices = [];
  for (const [index, item] of quoteItems.entries()) {
    if (item.uses_inventory_stock) {
      continue;
    }
    const quotedPriceUsdNet = Number(item.input?.price_usd_net || 0);
    const rawPrice = window.prompt(
      `Confirma el precio real de compra en USD neto para ${item.product_name}.\n\nCantidad: ${item.quantity}\nPrecio cotizado: ${formatUsd(
        quotedPriceUsdNet
      )}\n\nSi no hubo descuento, deja el mismo valor.`,
      formatUsdPromptValue(quotedPriceUsdNet)
    );

    if (rawPrice === null) {
      return null;
    }

    const actualPriceUsdNet = parseUsdInput(rawPrice);
    if (actualPriceUsdNet === null || actualPriceUsdNet <= 0) {
      throw new Error(
        `Debes ingresar un precio real valido en USD neto para ${item.product_name}.`
      );
    }

    actualPurchasePrices.push({
      quote_item_index: index,
      product_id: item.product_id,
      product_name: item.product_name,
      price_usd_net: actualPriceUsdNet,
    });
  }

  return {
    advancePaidCop,
    actualPurchasePrices,
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

function getCurrentQuoteProduct() {
  const productId = String(getQuoteField("product_id")?.value || "").trim();
  if (!productId) {
    return null;
  }
  return state.products.find((item) => String(item.id) === productId) || null;
}

function getCurrentInventoryUnitCost(product = getCurrentQuoteProduct()) {
  return Number(product?.inventory_unit_cost_cop || 0);
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

function syncInventorySaleUi(product = getCurrentQuoteProduct()) {
  const inventoryField = getQuoteField("uses_inventory_stock");
  if (!inventoryField) {
    return;
  }

  const inventoryEnabled = Boolean(product?.inventory_enabled);
  const currentStock = Number(product?.current_stock || 0);
  if (!inventoryEnabled) {
    inventoryField.checked = false;
  }
  inventoryField.disabled = !inventoryEnabled || currentStock <= 0;

  if (!inventorySaleHelper) {
    return;
  }

  if (!product) {
    inventorySaleHelper.textContent =
      "Activa esta opcion solo cuando el producto ya esta disponible en tienda para entrega inmediata.";
    return;
  }

  if (!inventoryEnabled) {
    inventorySaleHelper.textContent =
      "Este producto no tiene inventario de tienda activo. Puedes venderlo por importacion normal.";
    return;
  }

  if (currentStock <= 0) {
    inventorySaleHelper.textContent =
      "Este producto maneja inventario, pero hoy no tiene unidades disponibles para salida inmediata.";
    return;
  }

  const inventoryUnitCost = getCurrentInventoryUnitCost(product);
  if (inventoryUnitCost <= 0) {
    inventorySaleHelper.textContent =
      "Este producto tiene stock, pero aun no tiene costo promedio registrado. Usa Abastecimiento para cargar el costo real antes de venderlo desde inventario.";
    return;
  }

  inventorySaleHelper.textContent =
    `Hay ${currentStock} unidad${currentStock === 1 ? "" : "es"} disponible${currentStock === 1 ? "" : "s"} en tienda. Costo promedio actual: ${formatCop(inventoryUnitCost)}.`;
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
  renderPublicRegistrationLink(company);
}

function renderPublicRegistrationLink(company) {
  if (!publicRegistrationUrlInput || !openPublicRegistrationUrlLink) {
    return;
  }

  const slug = String(company?.slug || "").trim();
  const registrationUrl = slug
    ? `${window.location.origin}/registro/${encodeURIComponent(slug)}`
    : "";

  publicRegistrationUrlInput.value = registrationUrl;
  openPublicRegistrationUrlLink.href = registrationUrl || "#";
  openPublicRegistrationUrlLink.setAttribute("aria-disabled", registrationUrl ? "false" : "true");
  if (!registrationUrl) {
    openPublicRegistrationUrlLink.classList.add("is-disabled");
  } else {
    openPublicRegistrationUrlLink.classList.remove("is-disabled");
  }
}

function syncClientViewButtons() {
  clientViewButtons.forEach((button) => {
    const isActive = button.getAttribute("data-client-view") === state.clientCatalogView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setClientCatalogView(nextView) {
  state.clientCatalogView = nextView === "cards" ? "cards" : "list";
  syncClientViewButtons();
  renderClientsManaged(state.clients);
}

function getCollapsibleDefaultOpen(panelKey) {
  const toggle = document.querySelector(`[data-collapsible-target="${panelKey}"]`);
  return toggle ? toggle.dataset.defaultOpen !== "false" : true;
}

function applyCollapsiblePanel(panelKey) {
  const toggle = document.querySelector(`[data-collapsible-target="${panelKey}"]`);
  const body = document.querySelector(`[data-collapsible-body="${panelKey}"]`);
  const panel = document.querySelector(`[data-collapsible-panel="${panelKey}"]`);
  if (!toggle || !body) {
    return;
  }

  const isOpen = Object.prototype.hasOwnProperty.call(state.collapsiblePanels, panelKey)
    ? Boolean(state.collapsiblePanels[panelKey])
    : getCollapsibleDefaultOpen(panelKey);

  body.hidden = !isOpen;
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  panel?.classList.toggle("is-collapsed", !isOpen);
}

function syncCollapsiblePanels() {
  document.querySelectorAll("[data-collapsible-target]").forEach((button) => {
    const panelKey = button.getAttribute("data-collapsible-target");
    if (panelKey) {
      applyCollapsiblePanel(panelKey);
    }
  });
}

function openCollapsiblePanel(panelKey) {
  if (!panelKey) {
    return;
  }
  state.collapsiblePanels[panelKey] = true;
  applyCollapsiblePanel(panelKey);
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

function parseUsdInput(value) {
  let normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  normalized = normalized.replace(/\$/g, "").replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatUsdPromptValue(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
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
    uses_inventory_stock: Boolean(item.uses_inventory_stock),
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
    uses_inventory_stock: data.get("uses_inventory_stock") === "on",
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
    identification: String(data.get("identification") || "").trim(),
    description: String(data.get("description") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    city: String(data.get("city") || "").trim(),
    address: String(data.get("address") || "").trim(),
    neighborhood: String(data.get("neighborhood") || "").trim(),
    whatsapp_phone: String(data.get("whatsapp_phone") || "").trim(),
    whatsapp_opt_in: data.get("whatsapp_opt_in") === "on",
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
    image_data_url: String(data.get("image_data_url") || "").trim(),
    description: String(data.get("description") || "").trim(),
    reference: String(data.get("reference") || "").trim(),
    category: String(data.get("category") || "").trim(),
    store: String(data.get("store") || "").trim(),
    inventory_enabled: data.get("inventory_enabled") === "on",
    initial_stock_quantity: Number(data.get("initial_stock_quantity") || 0),
    price_usd_net: Number(data.get("price_usd_net") || 0),
    tax_usa_percent: Number(data.get("tax_usa_percent") || 0),
    locker_shipping_usd: Number(data.get("locker_shipping_usd") || 0),
    notes: String(data.get("notes") || "").trim(),
  };
}

function readNamedCatalogPayload(form) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") || "").trim(),
    description: String(data.get("description") || "").trim(),
  };
}

function renderImagePreview(container, imageDataUrl, emptyMessage) {
  if (!container) {
    return;
  }

  const normalized = String(imageDataUrl || "").trim();
  if (!normalized) {
    container.className = "image-preview-card image-preview-card-empty";
    container.innerHTML = `<p>${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  container.className = "image-preview-card";
  container.innerHTML = `
    <img src="${normalized}" alt="Vista previa" />
    <button type="button" class="secondary image-preview-clear" data-clear-image-preview>
      Quitar imagen
    </button>
  `;
}

function setProductImageDataUrl(imageDataUrl) {
  if (!productForm) {
    return;
  }
  productForm.elements.namedItem("image_data_url").value = String(imageDataUrl || "").trim();
  renderImagePreview(
    productImagePreview,
    imageDataUrl,
    "Aun no has cargado imagen para este producto."
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No fue posible leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function resetClientForm() {
  if (!clientForm) {
    return;
  }
  clientForm.reset();
  clientForm.elements.namedItem("id").value = "";
  state.editingClientId = null;
  if (clientSubmitButton) {
    clientSubmitButton.textContent = "Guardar cliente";
  }
  if (clientCancelButton) {
    clientCancelButton.hidden = true;
  }
}

function startClientEdit(client) {
  if (!clientForm || !client) {
    return;
  }
  state.editingClientId = Number(client.id);
  clientForm.elements.namedItem("id").value = String(client.id || "");
  clientForm.elements.namedItem("name").value = client.name || "";
  clientForm.elements.namedItem("identification").value = client.identification || "";
  clientForm.elements.namedItem("description").value = client.description || "";
  clientForm.elements.namedItem("phone").value = client.phone || "";
  clientForm.elements.namedItem("email").value = client.email || "";
  clientForm.elements.namedItem("city").value = client.city || "";
  clientForm.elements.namedItem("address").value = client.address || "";
  clientForm.elements.namedItem("neighborhood").value = client.neighborhood || "";
  clientForm.elements.namedItem("whatsapp_phone").value = client.whatsapp_phone || "";
  clientForm.elements.namedItem("whatsapp_opt_in").checked = Boolean(client.whatsapp_opt_in);
  clientForm.elements.namedItem("preferred_contact_channel").value =
    client.preferred_contact_channel || "";
  clientForm.elements.namedItem("preferred_payment_method").value =
    client.preferred_payment_method || "";
  clientForm.elements.namedItem("interests").value = client.interests || "";
  clientForm.elements.namedItem("notes").value = client.notes || "";
  if (clientSubmitButton) {
    clientSubmitButton.textContent = "Guardar cambios";
  }
  if (clientCancelButton) {
    clientCancelButton.hidden = false;
  }
}

function resetProductForm() {
  if (!productForm) {
    return;
  }
  productForm.reset();
  productForm.elements.namedItem("id").value = "";
  productForm.elements.namedItem("tax_usa_percent").value = 0;
  productForm.elements.namedItem("locker_shipping_usd").value = 0;
  productForm.elements.namedItem("initial_stock_quantity").value = 0;
  setProductImageDataUrl("");
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  state.editingProductId = null;
  if (productSubmitButton) {
    productSubmitButton.textContent = "Guardar producto";
  }
  if (productCancelButton) {
    productCancelButton.hidden = true;
  }
}

function startProductEdit(product) {
  if (!productForm || !product) {
    return;
  }
  state.editingProductId = Number(product.id);
  productForm.elements.namedItem("id").value = String(product.id || "");
  productForm.elements.namedItem("name").value = product.name || "";
  setProductImageDataUrl(product.image_data_url || "");
  productForm.elements.namedItem("description").value = product.description || "";
  productForm.elements.namedItem("reference").value = product.reference || "";
  productForm.elements.namedItem("category").value = product.category || "";
  productForm.elements.namedItem("store").value = product.store || "";
  productForm.elements.namedItem("price_usd_net").value = product.price_usd_net ?? "";
  productForm.elements.namedItem("tax_usa_percent").value = product.tax_usa_percent ?? 0;
  productForm.elements.namedItem("locker_shipping_usd").value = product.locker_shipping_usd ?? 0;
  productForm.elements.namedItem("inventory_enabled").checked = Boolean(product.inventory_enabled);
  productForm.elements.namedItem("initial_stock_quantity").value = 0;
  productForm.elements.namedItem("notes").value = product.notes || "";
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  if (productSubmitButton) {
    productSubmitButton.textContent = "Guardar cambios";
  }
  if (productCancelButton) {
    productCancelButton.hidden = false;
  }
}

function resetProductCategoryForm() {
  if (!productCategoryForm) {
    return;
  }
  productCategoryForm.reset();
  productCategoryForm.elements.namedItem("id").value = "";
  state.editingProductCategoryId = null;
  if (categorySubmitButton) {
    categorySubmitButton.textContent = "Guardar categoria";
  }
  if (categoryCancelButton) {
    categoryCancelButton.hidden = true;
  }
}

function startProductCategoryEdit(item) {
  if (!productCategoryForm || !item) {
    return;
  }
  state.editingProductCategoryId = Number(item.id);
  productCategoryForm.elements.namedItem("id").value = String(item.id || "");
  productCategoryForm.elements.namedItem("name").value = item.name || "";
  productCategoryForm.elements.namedItem("description").value = item.description || "";
  if (categorySubmitButton) {
    categorySubmitButton.textContent = "Guardar cambios";
  }
  if (categoryCancelButton) {
    categoryCancelButton.hidden = false;
  }
}

function resetProductStoreForm() {
  if (!productStoreForm) {
    return;
  }
  productStoreForm.reset();
  productStoreForm.elements.namedItem("id").value = "";
  state.editingProductStoreId = null;
  if (storeSubmitButton) {
    storeSubmitButton.textContent = "Guardar tienda";
  }
  if (storeCancelButton) {
    storeCancelButton.hidden = true;
  }
}

function startProductStoreEdit(item) {
  if (!productStoreForm || !item) {
    return;
  }
  state.editingProductStoreId = Number(item.id);
  productStoreForm.elements.namedItem("id").value = String(item.id || "");
  productStoreForm.elements.namedItem("name").value = item.name || "";
  productStoreForm.elements.namedItem("description").value = item.description || "";
  if (storeSubmitButton) {
    storeSubmitButton.textContent = "Guardar cambios";
  }
  if (storeCancelButton) {
    storeCancelButton.hidden = false;
  }
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

function readInventoryPurchaseItemPayload() {
  if (!inventoryPurchaseForm) {
    throw new Error("El formulario de abastecimiento no esta disponible.");
  }

  const data = new FormData(inventoryPurchaseForm);
  const hiddenProductId = toNumberOrNull(data.get("product_id"));
  const selectedProduct =
    state.products.find((item) => item.id === hiddenProductId) ||
    findProductBySearchValue(inventoryPurchaseProductSelect?.value || "");

  if (!selectedProduct) {
    throw new Error("Selecciona un producto guardado para este abastecimiento.");
  }

  const quantity = Number(data.get("item_quantity") || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("La cantidad del abastecimiento debe ser mayor a cero.");
  }

  const unitCostCop = Number(data.get("item_unit_cost_cop") || 0);
  if (!Number.isFinite(unitCostCop) || unitCostCop <= 0) {
    throw new Error("El costo unitario del abastecimiento debe ser mayor a cero.");
  }

  return {
    product_id: Number(selectedProduct.id),
    product_name: String(selectedProduct.name || "").trim() || "Producto sin nombre",
    quantity: Math.round(quantity),
    unit_cost_cop: unitCostCop,
    line_total_cop: Math.round(quantity) * unitCostCop,
    notes: String(data.get("item_notes") || "").trim(),
  };
}

function resetInventoryPurchaseItemEditor() {
  if (!inventoryPurchaseForm) {
    return;
  }
  clearInventoryPurchaseProductSelection();
  inventoryPurchaseForm.elements.namedItem("item_quantity").value = 1;
  inventoryPurchaseForm.elements.namedItem("item_unit_cost_cop").value = "";
  inventoryPurchaseForm.elements.namedItem("item_notes").value = "";
}

function addInventoryPurchaseDraftItem() {
  const item = readInventoryPurchaseItemPayload();
  const matchingItem = state.inventoryPurchaseLineItems.find(
    (existingItem) =>
      Number(existingItem.product_id) === Number(item.product_id) &&
      Number(existingItem.unit_cost_cop) === Number(item.unit_cost_cop) &&
      String(existingItem.notes || "") === String(item.notes || "")
  );

  if (matchingItem) {
    matchingItem.quantity += item.quantity;
    matchingItem.line_total_cop = matchingItem.quantity * matchingItem.unit_cost_cop;
  } else {
    state.inventoryPurchaseLineItems = [...state.inventoryPurchaseLineItems, item];
  }

  renderInventoryPurchaseDraft();
  resetInventoryPurchaseItemEditor();
  return item;
}

function readInventoryPurchasePayload() {
  if (!inventoryPurchaseForm) {
    throw new Error("El formulario de abastecimiento no esta disponible.");
  }

  const data = new FormData(inventoryPurchaseForm);
  const purchaseDate = String(data.get("purchase_date") || "").trim();
  const supplierName = String(data.get("supplier_name") || "").trim();
  const notes = String(data.get("notes") || "").trim();

  if (!purchaseDate) {
    throw new Error("La fecha del abastecimiento es obligatoria.");
  }
  if (!supplierName) {
    throw new Error("Debes indicar el proveedor, tienda u origen del abastecimiento.");
  }
  if (!state.inventoryPurchaseLineItems.length) {
    throw new Error("Agrega al menos un producto antes de registrar el abastecimiento.");
  }

  return {
    purchase_date: purchaseDate,
    supplier_name: supplierName,
    notes,
    items: state.inventoryPurchaseLineItems.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      unit_cost_cop: Number(item.unit_cost_cop),
      notes: String(item.notes || "").trim(),
    })),
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

function readWhatsAppSettingsPayload() {
  const data = new FormData(whatsappSettingsForm);
  return {
    twilio_account_sid: String(data.get("twilio_account_sid") || "").trim(),
    twilio_auth_token: String(data.get("twilio_auth_token") || "").trim(),
    whatsapp_sender: String(data.get("whatsapp_sender") || "").trim(),
    messaging_service_sid: String(data.get("messaging_service_sid") || "").trim(),
    status_callback_url: String(data.get("status_callback_url") || "").trim(),
    default_country_code: String(data.get("default_country_code") || "").trim() || "+57",
    auto_send_enabled: data.get("auto_send_enabled") === "on",
  };
}

function readWhatsAppTemplatePayload() {
  const data = new FormData(whatsappTemplateForm);
  return {
    trigger_key: String(data.get("trigger_key") || "").trim(),
    label: String(data.get("label") || "").trim(),
    content_sid: String(data.get("content_sid") || "").trim(),
    content_variables_json: String(data.get("content_variables_json") || "").trim(),
    body_text: String(data.get("body_text") || "").trim(),
    is_active: data.get("is_active") === "on",
    auto_send_enabled: data.get("auto_send_enabled") === "on",
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

function formatInteger(value) {
  return integerFormatter.format(Number(value || 0));
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
  const useButton = clientDetailContainer.querySelector("[data-use-client-detail]");
  if (useButton && !client.is_active) {
    useButton.disabled = true;
    useButton.textContent = "Cliente inactivo";
  }
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

function getDashboardPeriodLabel(periodKey) {
  return (
    {
      daily: "Dia",
      weekly: "Semana",
      biweekly: "Quincena",
      monthly: "Mes",
      quarterly: "Trimestre",
    }[String(periodKey || "").trim().toLowerCase()] || "Periodo"
  );
}

function formatClientDetailPeriodCopy(period) {
  const periodKey = String(period?.key || "").trim().toLowerCase();
  if (!periodKey) {
    return "";
  }

  const periodLabel = getDashboardPeriodLabel(periodKey);
  const startDate = String(period?.start_date || "").trim();
  const endDate = String(period?.end_date || "").trim();
  const formattedStart = formatStoredDate(startDate);
  const formattedEnd = formatStoredDate(endDate);
  const dateCopy =
    startDate && endDate && startDate !== endDate
      ? `${formattedStart} a ${formattedEnd}`
      : formattedStart;

  return `Lectura del dashboard: ${periodLabel}${dateCopy ? ` · ${dateCopy}` : ""}`;
}

function normalizeAdminSearchText(...values) {
  return values
    .flat()
    .map((value) => String(value ?? "").trim().toLocaleLowerCase("es-CO"))
    .join(" ");
}

function matchesAdminFilter(haystack, filterValue) {
  const normalizedFilter = String(filterValue || "").trim().toLocaleLowerCase("es-CO");
  if (!normalizedFilter) {
    return true;
  }
  return haystack.includes(normalizedFilter);
}

function getFilteredClients() {
  return state.clients.filter((client) =>
    matchesAdminFilter(
      normalizeAdminSearchText(
        client.name,
        client.identification,
        client.phone,
        client.email,
        client.whatsapp_phone,
        client.city,
        client.neighborhood,
        client.address,
        client.description,
        client.interests,
        client.notes
      ),
      state.adminFilters.clients
    )
  );
}

function getFilteredProducts() {
  return state.products.filter((product) =>
    matchesAdminFilter(
      normalizeAdminSearchText(
        product.name,
        product.reference,
        product.category,
        product.store,
        product.description,
        product.notes
      ),
      state.adminFilters.products
    )
  );
}

function getFilteredNamedCatalogItems(items, filterValue) {
  return items.filter((item) =>
    matchesAdminFilter(
      normalizeAdminSearchText(item.name, item.description),
      filterValue
    )
  );
}

function buildClientDetailMarkup(detail) {
  if (!detail) {
    return "";
  }

  const client = detail.client || {};
  const summary = detail.summary || {};
  const topProducts = detail.top_products || [];
  const recentQuotes = detail.recent_quotes || [];
  const recentOrders = detail.recent_orders || [];
  const periodCopy = formatClientDetailPeriodCopy(detail.period);

  return `
    <section class="client-detail-hero">
      <div>
        <p class="eyebrow">Ficha comercial</p>
        <h3>${escapeHtml(client.name || "Cliente sin nombre")}</h3>
        <p class="client-detail-copy">
          ${escapeHtml(client.city || "Ciudad no registrada")}
          ${client.neighborhood ? ` · ${escapeHtml(client.neighborhood)}` : ""}
          ${client.address ? ` · ${escapeHtml(client.address)}` : ""}
        </p>
        ${
          client.identification
            ? `<p class="catalog-card-note"><strong>Identificacion:</strong> ${escapeHtml(client.identification)}</p>`
            : ""
        }
        ${periodCopy ? `<p class="catalog-card-note"><strong>${escapeHtml(periodCopy)}</strong></p>` : ""}
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
      ${makeMetricCard(
        "Inventario",
        String(summary.current_stock || 0),
        summary.inventory_enabled ? "Unidades disponibles hoy en tienda" : "Producto sin stock inmediato"
      )}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Datos del cliente</h3>
        ${makeDetailList(
          [
            ["Identificacion", client.identification || "No registrada"],
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

function buildProductDetailMarkup(detail) {
  if (!detail) {
    return "";
  }

  const product = detail.product || {};
  const summary = detail.summary || {};
  const topClients = detail.top_clients || [];
  const recentQuotes = detail.recent_quotes || [];
  const recentOrders = detail.recent_orders || [];
  const inventoryMovements = detail.inventory_movements || [];
  const currentStock = Number(product.current_stock || 0);

  return `
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
      ${makeMetricCard(
        "Inventario",
        String(summary.current_stock || 0),
        summary.inventory_enabled ? "Unidades disponibles hoy en tienda" : "Producto sin stock inmediato"
      )}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Ficha base</h3>
        ${makeDetailList(
          [
            ["Referencia", product.reference || "No registrada"],
            ["Categoria", product.category || "No registrada"],
            ["Tienda", product.store || "No registrada"],
            [
              "Inventario tienda",
              product.inventory_enabled
                ? `${currentStock} unidad${currentStock === 1 ? "" : "es"}`
                : "No activo",
            ],
            ["Costo promedio inventario", formatCop(product.inventory_unit_cost_cop)],
            ["Valor actual del stock", formatCop(product.current_stock_value_cop)],
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

      <section class="detail-panel">
        <h3>Inventario de tienda</h3>
        <form class="catalog-form" data-product-inventory-form="${product.id}">
          <div class="field-grid">
            <label>
              <span>Movimiento</span>
              <select name="movement_type">
                <option value="stock_in">Entrada</option>
                <option value="stock_out">Salida manual</option>
                <option value="set_stock">Ajustar stock final</option>
              </select>
            </label>

            <label>
              <span>Cantidad</span>
              <input name="quantity" type="number" min="0" step="1" value="1" required />
            </label>
          </div>

          <label class="full-width">
            <span>Nota del movimiento</span>
            <input
              name="note"
              type="text"
              placeholder="Ej. Compra para tienda, ajuste por conteo, salida por vitrina"
            />
          </label>

          <div class="actions">
            <button type="submit" class="secondary">Registrar movimiento</button>
          </div>
        </form>

        ${
          inventoryMovements.length
            ? inventoryMovements
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.movement_label)}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))}</p>
                      </div>
                      <span>${item.quantity_delta > 0 ? "+" : ""}${Number(item.quantity_delta || 0)}</span>
                      <small>
                        Stock despues: ${Number(item.quantity_after || 0)}
                        ${item.note ? ` | ${escapeHtml(item.note)}` : ""}
                      </small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay movimientos de inventario para este producto.</p>'
        }
      </section>
    </div>
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
            ${client.whatsapp_phone_masked ? `<span>WhatsApp: ${escapeHtml(client.whatsapp_phone_masked)}</span>` : ""}
            ${client.whatsapp_opt_in ? "<span>WhatsApp autorizado</span>" : ""}
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
            <span>${
              product.inventory_enabled
                ? `Inventario: ${Number(product.current_stock || 0)}`
                : "Sin inventario de tienda"
            }</span>
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
  const useButton = productDetailContainer.querySelector("[data-use-product-detail]");
  if (useButton && !product.is_active) {
    useButton.disabled = true;
    useButton.textContent = "Producto inactivo";
  }
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

function renderClientsManaged(items) {
  const emptyMessage = state.adminFilters.clients
    ? "No encontramos clientes con ese filtro."
    : "Aun no hay clientes guardados.";

  if (!items.length) {
    clientsListContainer.className = "catalog-empty";
    clientsListContainer.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  if (state.clientCatalogView === "cards") {
    renderClientsCards(items);
    return;
  }

  renderClientsCompact(items);
}

function renderClientsCompact(items) {
  clientsListContainer.className = "catalog-list catalog-list-rows";
  clientsListContainer.innerHTML = items
    .map(
      (client) => `
        <article class="catalog-row ${client.is_active ? "" : "is-inactive"}">
          <button class="catalog-row-primary" type="button" data-view-client="${client.id}">
            <strong>${escapeHtml(client.name)}</strong>
            <span>${escapeHtml(client.city || "Ciudad no registrada")}</span>
          </button>
          <div class="catalog-row-details">
            <span>${escapeHtml(client.phone || "Sin telefono")}</span>
            ${
              client.whatsapp_phone_masked
                ? `<span>WhatsApp: ${escapeHtml(client.whatsapp_phone_masked)}</span>`
                : `<span>${escapeHtml(client.email || "Sin email")}</span>`
            }
            <span class="catalog-chip ${client.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
              ${client.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div class="catalog-row-actions">
            <button
              class="history-action-button history-action-button-secondary history-action-button-icon"
              type="button"
              data-edit-client="${client.id}"
              title="Editar cliente"
              aria-label="Editar cliente"
            >
              ${renderActionIcon("edit")}
            </button>
            <button
              class="history-action-button history-action-button-secondary"
              type="button"
              data-use-client="${client.id}"
              ${client.is_active ? "" : "disabled"}
            >
              Usar
            </button>
            <button
              class="history-action-button ${client.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
              type="button"
              data-toggle-client-active="${client.id}"
              data-next-active="${client.is_active ? "0" : "1"}"
              title="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
              aria-label="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
            >
              ${renderActionIcon(client.is_active ? "deactivate" : "activate")}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderClientsCards(items) {
  clientsListContainer.className = "catalog-list";
  clientsListContainer.innerHTML = items
    .map(
      (client) => `
        <article class="catalog-card ${client.is_active ? "" : "is-inactive"}">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(client.name)}</h3>
              <p>${escapeHtml(client.city || "Ciudad no registrada")}</p>
            </div>
            <div class="catalog-card-actions">
              <span class="catalog-chip ${client.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                ${client.is_active ? "Activo" : "Inactivo"}
              </span>
              <button class="history-action-button history-action-button-secondary" type="button" data-view-client="${client.id}">
                Ver detalle
              </button>
              <button
                class="history-action-button history-action-button-secondary history-action-button-icon"
                type="button"
                data-edit-client="${client.id}"
                title="Editar cliente"
                aria-label="Editar cliente"
              >
                ${renderActionIcon("edit")}
              </button>
              <button
                class="history-action-button history-action-button-secondary"
                type="button"
                data-use-client="${client.id}"
                ${client.is_active ? "" : "disabled"}
              >
                Usar
              </button>
              <button
                class="history-action-button ${client.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                type="button"
                data-toggle-client-active="${client.id}"
                data-next-active="${client.is_active ? "0" : "1"}"
                title="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
                aria-label="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
              >
                ${renderActionIcon(client.is_active ? "deactivate" : "activate")}
              </button>
            </div>
          </div>
          <div class="catalog-card-meta">
            <span>${escapeHtml(client.phone || "Sin telefono")}</span>
            <span>${escapeHtml(client.email || "Sin email")}</span>
            ${client.whatsapp_phone_masked ? `<span>WhatsApp: ${escapeHtml(client.whatsapp_phone_masked)}</span>` : ""}
            ${client.whatsapp_opt_in ? "<span>WhatsApp autorizado</span>" : ""}
            ${client.preferred_contact_channel ? `<span>${escapeHtml(client.preferred_contact_channel)}</span>` : ""}
            ${client.preferred_payment_method ? `<span>${escapeHtml(client.preferred_payment_method)}</span>` : ""}
            ${client.neighborhood ? `<span>${escapeHtml(client.neighborhood)}</span>` : ""}
          </div>
          ${client.address ? `<p class="catalog-card-note"><strong>Direccion:</strong> ${escapeHtml(client.address)}</p>` : ""}
          ${client.description ? `<p class="catalog-card-note"><strong>Descripcion:</strong> ${escapeHtml(client.description)}</p>` : ""}
          ${client.interests ? `<p class="catalog-card-note"><strong>Intereses:</strong> ${escapeHtml(client.interests)}</p>` : ""}
          ${client.notes ? `<p class="catalog-card-note">${escapeHtml(client.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderProductsManaged(items) {
  const emptyMessage = state.adminFilters.products
    ? "No encontramos productos con ese filtro."
    : "Aun no hay productos guardados.";

  if (!items.length) {
    productsListContainer.className = "catalog-empty";
    productsListContainer.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  productsListContainer.className = "catalog-list";
  productsListContainer.innerHTML = items
    .map(
      (product) => `
        <article class="catalog-card ${product.is_active ? "" : "is-inactive"}">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(productLabel(product))}</h3>
              <p>${formatUsd(product.price_usd_net)} base + ${product.tax_usa_percent}% tax</p>
            </div>
            <div class="catalog-card-actions">
              <span class="catalog-chip ${product.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                ${product.is_active ? "Activo" : "Inactivo"}
              </span>
              <button class="history-action-button history-action-button-secondary" type="button" data-view-product="${product.id}">
                Ver detalle
              </button>
              <button
                class="history-action-button history-action-button-secondary history-action-button-icon"
                type="button"
                data-edit-product="${product.id}"
                title="Editar producto"
                aria-label="Editar producto"
              >
                ${renderActionIcon("edit")}
              </button>
              <button
                class="history-action-button history-action-button-secondary"
                type="button"
                data-use-product="${product.id}"
                ${product.is_active ? "" : "disabled"}
              >
                Usar
              </button>
              <button
                class="history-action-button ${product.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                type="button"
                data-toggle-product-active="${product.id}"
                data-next-active="${product.is_active ? "0" : "1"}"
                title="${product.is_active ? "Inactivar producto" : "Reactivar producto"}"
                aria-label="${product.is_active ? "Inactivar producto" : "Reactivar producto"}"
              >
                ${renderActionIcon(product.is_active ? "deactivate" : "activate")}
              </button>
            </div>
          </div>
          <div class="catalog-card-meta">
            <span>${escapeHtml(product.category || "Sin categoria")}</span>
            <span>${escapeHtml(product.store || "Sin tienda")}</span>
            <span>Casillero: ${formatUsd(product.locker_shipping_usd)}</span>
            <span>${
              product.inventory_enabled
                ? `Inventario: ${Number(product.current_stock || 0)}`
                : "Sin inventario de tienda"
            }</span>
          </div>
          ${product.description ? `<p class="catalog-card-note"><strong>Descripcion:</strong> ${escapeHtml(product.description)}</p>` : ""}
          ${product.notes ? `<p class="catalog-card-note">${escapeHtml(product.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function refreshAdminCatalogViews() {
  renderClientsManaged(getFilteredClients());
  renderProductsManaged(getFilteredProducts());
  renderAdminNamedCatalogList(
    productCategoriesListContainer,
    getFilteredNamedCatalogItems(state.productCategories, state.adminFilters.categories),
    state.adminFilters.categories
      ? "No encontramos categorias con ese filtro."
      : "Aun no hay categorias creadas.",
    {
      entityName: "categoria",
      editAttr: "data-edit-product-category",
      toggleAttr: "data-toggle-product-category-active",
    }
  );
  renderAdminNamedCatalogList(
    productStoresListContainer,
    getFilteredNamedCatalogItems(state.productStores, state.adminFilters.stores),
    state.adminFilters.stores
      ? "No encontramos tiendas con ese filtro."
      : "Aun no hay tiendas creadas.",
    {
      entityName: "tienda",
      editAttr: "data-edit-product-store",
      toggleAttr: "data-toggle-product-store-active",
    }
  );
}

function renderAdminNamedCatalogList(container, items, emptyMessage, config) {
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
        <article class="catalog-card compact-card ${item.is_active ? "" : "is-inactive"}">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
            </div>
            <div class="catalog-card-actions">
              <span class="catalog-chip ${item.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                ${item.is_active ? "Activo" : "Inactivo"}
              </span>
              <button
                class="history-action-button history-action-button-secondary history-action-button-icon"
                type="button"
                ${config.editAttr}="${item.id}"
                title="Editar ${config.entityName || "registro"}"
                aria-label="Editar ${config.entityName || "registro"}"
              >
                ${renderActionIcon("edit")}
              </button>
              <button
                class="history-action-button ${item.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                type="button"
                ${config.toggleAttr}="${item.id}"
                data-next-active="${item.is_active ? "0" : "1"}"
                title="${item.is_active ? "Inactivar" : "Reactivar"} ${config.entityName || "registro"}"
                aria-label="${item.is_active ? "Inactivar" : "Reactivar"} ${config.entityName || "registro"}"
              >
                ${renderActionIcon(item.is_active ? "deactivate" : "activate")}
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderWhatsAppSettings(settings) {
  if (!whatsappSettingsForm) {
    return;
  }

  const form = whatsappSettingsForm.elements;
  form.namedItem("twilio_account_sid").value = settings?.twilio_account_sid || "";
  form.namedItem("twilio_auth_token").value = settings?.twilio_auth_token || "";
  form.namedItem("whatsapp_sender").value = settings?.whatsapp_sender || "";
  form.namedItem("messaging_service_sid").value = settings?.messaging_service_sid || "";
  form.namedItem("status_callback_url").value = settings?.status_callback_url || "";
  form.namedItem("default_country_code").value = settings?.default_country_code || "+57";
  form.namedItem("auto_send_enabled").checked = Boolean(settings?.auto_send_enabled);
}

function renderWhatsAppTriggerOptions(items) {
  if (!whatsappTriggerSelect) {
    return;
  }

  const currentValue = whatsappTriggerSelect.value;
  const options = ['<option value="">Selecciona un disparador</option>'];
  (items || []).forEach((item) => {
    options.push(`<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`);
  });
  whatsappTriggerSelect.innerHTML = options.join("");
  if ((items || []).some((item) => item.key === currentValue)) {
    whatsappTriggerSelect.value = currentValue;
  }
}

function renderWhatsAppTemplates(items) {
  if (!whatsappTemplatesListContainer) {
    return;
  }

  if (!items.length) {
    whatsappTemplatesListContainer.className = "catalog-empty";
    whatsappTemplatesListContainer.innerHTML = "<p>Aun no hay plantillas de WhatsApp cargadas.</p>";
    return;
  }

  whatsappTemplatesListContainer.className = "catalog-list compact-list";
  whatsappTemplatesListContainer.innerHTML = items
    .map(
      (item) => `
        <article class="catalog-card compact-card">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(item.label)}</h3>
              <p>${escapeHtml(item.trigger_key)}</p>
            </div>
            <div class="catalog-card-actions">
              <span class="catalog-chip">${item.is_active ? "Activa" : "Inactiva"}</span>
              <span class="catalog-chip">${item.auto_send_enabled ? "Auto" : "Manual"}</span>
            </div>
          </div>
          ${item.content_sid ? `<p class="catalog-card-note"><strong>Content SID:</strong> ${escapeHtml(item.content_sid)}</p>` : ""}
          ${item.body_text ? `<p class="catalog-card-note">${escapeHtml(item.body_text)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function getOrderWhatsAppTrigger(order) {
  return `order_status:${order.status_key}`;
}

function getOrderWhatsAppButtonLabel(order) {
  if (order.status_key === "client_notified" && Number(order.balance_due_cop || 0) > 0) {
    return "Enviar cobro WhatsApp";
  }
  return "Enviar WhatsApp";
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
      ${makeMetricCard(
        "Inventario",
        String(summary.current_stock || 0),
        summary.inventory_enabled ? "Unidades disponibles hoy en tienda" : "Producto sin stock inmediato"
      )}
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
  const {
    shouldScroll = true,
    source = "admin",
    periodKey = null,
    referenceDate = null,
  } = options;
  if (!clientId) {
    state.clientDetail = null;
    state.clientDetailScope = null;
    renderClientDetail(null);
    return;
  }

  try {
    const params = new URLSearchParams();
    if (periodKey) {
      params.set("period", periodKey);
    }
    if (referenceDate) {
      params.set("reference_date", referenceDate);
    }
    const query = params.toString();
    const payload = await requestJson(
      `/api/clients/${encodeURIComponent(clientId)}${query ? `?${query}` : ""}`
    );
    state.clientDetail = payload.item || null;
    state.clientDetailScope = {
      source,
      periodKey: periodKey || "",
      referenceDate: referenceDate || "",
    };
    renderClientDetail(state.clientDetail);
    if (shouldScroll && clientDetailSection) {
      window.location.hash = "administracion";
      openCollapsiblePanel("admin-clients");
      clientDetailSection.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  } catch (error) {
    state.clientDetail = null;
    state.clientDetailScope = null;
    clientDetailContainer.className = "catalog-empty";
    clientDetailContainer.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function refreshActiveClientDetail() {
  const activeClientId = state.clientDetail?.client?.id;
  if (!activeClientId) {
    return;
  }

  const activeScope = state.clientDetailScope || {};
  await loadClientDetail(activeClientId, {
    shouldScroll: false,
    source: activeScope.source || "admin",
    periodKey: activeScope.periodKey || null,
    referenceDate: activeScope.referenceDate || null,
  });
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
  const inventoryMovements = detail.inventory_movements || [];
  const currentStock = Number(product.current_stock || 0);

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
      ${makeMetricCard(
        "Inventario",
        String(summary.current_stock || 0),
        summary.inventory_enabled ? "Unidades disponibles hoy en tienda" : "Producto sin stock inmediato"
      )}
      ${makeMetricCard("Costo promedio", formatCop(summary.inventory_unit_cost_cop), "Costo actual por unidad en inventario")}
      ${makeMetricCard("Valor del stock", formatCop(summary.current_stock_value_cop), "Capital hoy invertido en esta referencia")}
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

      <section class="detail-panel">
        <h3>Inventario de tienda</h3>
        <form class="catalog-form" data-product-inventory-form="${product.id}">
          <div class="field-grid">
            <label>
              <span>Movimiento</span>
              <select name="movement_type">
                <option value="stock_in">Entrada</option>
                <option value="stock_out">Salida manual</option>
                <option value="set_stock">Ajustar stock final</option>
              </select>
            </label>

            <label>
              <span>Cantidad</span>
              <input name="quantity" type="number" min="0" step="1" value="1" required />
            </label>
          </div>

          <label class="full-width">
            <span>Nota del movimiento</span>
            <input
              name="note"
              type="text"
              placeholder="Ej. Compra para tienda, ajuste por conteo, salida por vitrina"
            />
          </label>

          <div class="actions">
            <button type="submit" class="secondary">Registrar movimiento</button>
          </div>
        </form>

        ${
          inventoryMovements.length
            ? inventoryMovements
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.movement_label)}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))}</p>
                      </div>
                      <span>${item.quantity_delta > 0 ? "+" : ""}${Number(item.quantity_delta || 0)}</span>
                      <small>
                        Stock despues: ${Number(item.quantity_after || 0)}
                        ${item.note ? ` | ${escapeHtml(item.note)}` : ""}
                      </small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay movimientos de inventario para este producto.</p>'
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
  const inventoryMovements = detail.inventory_movements || [];
  const currentStock = Number(product.current_stock || 0);

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
      ${makeMetricCard(
        "Inventario",
        String(summary.current_stock || 0),
        summary.inventory_enabled ? "Unidades disponibles hoy en tienda" : "Producto sin stock inmediato"
      )}
    </div>

    <div class="detail-grid client-detail-grid">
      <section class="detail-panel">
        <h3>Ficha base</h3>
        ${makeDetailList(
          [
            ["Referencia", product.reference || "No registrada"],
            ["Categoria", product.category || "No registrada"],
            ["Tienda", product.store || "No registrada"],
            [
              "Inventario tienda",
              product.inventory_enabled
                ? `${currentStock} unidad${currentStock === 1 ? "" : "es"}`
                : "No activo",
            ],
            ["Costo promedio inventario", formatCop(product.inventory_unit_cost_cop)],
            ["Valor actual del stock", formatCop(product.current_stock_value_cop)],
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

      <section class="detail-panel">
        <h3>Inventario de tienda</h3>
        <form class="catalog-form" data-product-inventory-form="${product.id}">
          <div class="field-grid">
            <label>
              <span>Movimiento</span>
              <select name="movement_type">
                <option value="stock_in">Entrada</option>
                <option value="stock_out">Salida manual</option>
                <option value="set_stock">Ajustar stock final</option>
              </select>
            </label>

            <label>
              <span>Cantidad</span>
              <input name="quantity" type="number" min="0" step="1" value="1" required />
            </label>
          </div>

          <label class="full-width">
            <span>Nota del movimiento</span>
            <input
              name="note"
              type="text"
              placeholder="Ej. Compra para tienda, ajuste por conteo, salida por vitrina"
            />
          </label>

          <div class="actions">
            <button type="submit" class="secondary">Registrar movimiento</button>
          </div>
        </form>

        ${
          inventoryMovements.length
            ? inventoryMovements
                .map(
                  (item) => `
                    <article class="detail-list-card">
                      <div>
                        <strong>${escapeHtml(item.movement_label)}</strong>
                        <p>${escapeHtml(formatStoredDate(item.created_at))}</p>
                      </div>
                      <span>${item.quantity_delta > 0 ? "+" : ""}${Number(item.quantity_delta || 0)}</span>
                      <small>
                        Stock despues: ${Number(item.quantity_after || 0)}
                        ${item.note ? ` | ${escapeHtml(item.note)}` : ""}
                      </small>
                    </article>
                  `
                )
                .join("")
            : '<p class="catalog-card-note">Aun no hay movimientos de inventario para este producto.</p>'
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
      window.location.hash = "administracion";
      openCollapsiblePanel("admin-products");
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
  clientDetailContainer.className = "client-detail-layout";
  clientDetailContainer.innerHTML = buildClientDetailMarkup(detail);
  const useButton = clientDetailContainer.querySelector("[data-use-client-detail]");
  if (useButton && !client.is_active) {
    useButton.disabled = true;
    useButton.textContent = "Cliente inactivo";
  }
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
  productDetailContainer.className = "client-detail-layout";
  productDetailContainer.innerHTML = buildProductDetailMarkup(detail);
  const useButton = productDetailContainer.querySelector("[data-use-product-detail]");
  if (useButton && !product.is_active) {
    useButton.disabled = true;
    useButton.textContent = "Producto inactivo";
  }
}

function buildInlineClientDetailShell(detail) {
  if (!detail) {
    return "";
  }

  const client = detail.client || {};
  return `
    <section class="catalog-inline-detail-shell">
      <div class="catalog-inline-detail-header">
        <strong>Ficha del cliente</strong>
        <button
          class="history-action-button history-action-button-secondary history-action-button-icon"
          type="button"
          data-close-inline-client-detail="${client.id}"
          title="Cerrar ficha"
          aria-label="Cerrar ficha"
        >
          ${renderActionIcon("close")}
        </button>
      </div>
      <div class="client-detail-layout">
        ${buildClientDetailMarkup(detail)}
      </div>
    </section>
  `;
}

function buildInlineProductDetailShell(detail) {
  if (!detail) {
    return "";
  }

  const product = detail.product || {};
  return `
    <section class="catalog-inline-detail-shell">
      <div class="catalog-inline-detail-header">
        <strong>Ficha del producto</strong>
        <button
          class="history-action-button history-action-button-secondary history-action-button-icon"
          type="button"
          data-close-inline-product-detail="${product.id}"
          title="Cerrar ficha"
          aria-label="Cerrar ficha"
        >
          ${renderActionIcon("close")}
        </button>
      </div>
      <div class="client-detail-layout">
        ${buildProductDetailMarkup(detail)}
      </div>
    </section>
  `;
}

async function toggleClientInlineDetail(clientId) {
  const normalizedId = String(clientId || "").trim();
  if (!normalizedId) {
    return;
  }

  if (String(state.clientInlineDetailId || "") === normalizedId) {
    state.clientInlineDetailId = null;
    state.clientInlineDetail = null;
    renderClientsManaged(state.clients);
    return;
  }

  try {
    const payload = await requestJson(`/api/clients/${encodeURIComponent(normalizedId)}`);
    state.clientInlineDetailId = normalizedId;
    state.clientInlineDetail = payload.item || null;
    renderClientsManaged(state.clients);
  } catch (error) {
    statusMessage.textContent = error.message;
  }
}

async function toggleProductInlineDetail(productId) {
  const normalizedId = String(productId || "").trim();
  if (!normalizedId) {
    return;
  }

  if (String(state.productInlineDetailId || "") === normalizedId) {
    state.productInlineDetailId = null;
    state.productInlineDetail = null;
    renderProductsManaged(state.products);
    return;
  }

  try {
    const payload = await requestJson(`/api/products/${encodeURIComponent(normalizedId)}`);
    state.productInlineDetailId = normalizedId;
    state.productInlineDetail = payload.item || null;
    renderProductsManaged(state.products);
  } catch (error) {
    statusMessage.textContent = error.message;
  }
}

function renderClientsCompact(items) {
  clientsListContainer.className = "catalog-list catalog-list-rows";
  clientsListContainer.innerHTML = items
    .map((client) => {
      const isExpanded = String(state.clientInlineDetailId || "") === String(client.id);
      return `
        <div class="catalog-row-group ${isExpanded ? "is-expanded" : ""}">
          <article class="catalog-row ${client.is_active ? "" : "is-inactive"}">
            <button class="catalog-row-primary" type="button" data-view-client="${client.id}">
              <strong>${escapeHtml(client.name)}</strong>
              <span>${escapeHtml(client.identification || client.city || "Sin identificación")}</span>
            </button>
            <div class="catalog-row-details">
              <span>${escapeHtml(client.phone || "Sin telefono")}</span>
              ${client.city ? `<span>${escapeHtml(client.city)}</span>` : ""}
              ${
                client.whatsapp_phone_masked
                  ? `<span>WhatsApp: ${escapeHtml(client.whatsapp_phone_masked)}</span>`
                  : `<span>${escapeHtml(client.email || "Sin email")}</span>`
              }
              <span class="catalog-chip ${client.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                ${client.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div class="catalog-row-actions">
              <button
                class="history-action-button history-action-button-secondary history-action-button-icon"
                type="button"
                data-edit-client="${client.id}"
                title="Editar cliente"
                aria-label="Editar cliente"
              >
                ${renderActionIcon("edit")}
              </button>
              <button
                class="history-action-button history-action-button-secondary"
                type="button"
                data-use-client="${client.id}"
                ${client.is_active ? "" : "disabled"}
              >
                Usar
              </button>
              <button
                class="history-action-button ${client.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                type="button"
                data-toggle-client-active="${client.id}"
                data-next-active="${client.is_active ? "0" : "1"}"
                title="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
                aria-label="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
              >
                ${renderActionIcon(client.is_active ? "deactivate" : "activate")}
              </button>
            </div>
          </article>
          ${isExpanded ? buildInlineClientDetailShell(state.clientInlineDetail) : ""}
        </div>
      `;
    })
    .join("");
}

function renderClientsCards(items) {
  clientsListContainer.className = "catalog-list";
  clientsListContainer.innerHTML = items
    .map((client) => {
      const isExpanded = String(state.clientInlineDetailId || "") === String(client.id);
      return `
        <div class="catalog-card-group ${isExpanded ? "is-expanded" : ""}">
          <article class="catalog-card ${client.is_active ? "" : "is-inactive"}">
            <div class="catalog-card-top">
              <div>
                <h3>${escapeHtml(client.name)}</h3>
                <p>${escapeHtml(client.identification || client.city || "Sin identificación")}</p>
              </div>
              <div class="catalog-card-actions">
                <span class="catalog-chip ${client.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                  ${client.is_active ? "Activo" : "Inactivo"}
                </span>
                <button class="history-action-button history-action-button-secondary" type="button" data-view-client="${client.id}">
                  ${isExpanded ? "Ocultar ficha" : "Ver ficha"}
                </button>
                <button
                  class="history-action-button history-action-button-secondary history-action-button-icon"
                  type="button"
                  data-edit-client="${client.id}"
                  title="Editar cliente"
                  aria-label="Editar cliente"
                >
                  ${renderActionIcon("edit")}
                </button>
                <button
                  class="history-action-button history-action-button-secondary"
                  type="button"
                  data-use-client="${client.id}"
                  ${client.is_active ? "" : "disabled"}
                >
                  Usar
                </button>
                <button
                  class="history-action-button ${client.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                  type="button"
                  data-toggle-client-active="${client.id}"
                  data-next-active="${client.is_active ? "0" : "1"}"
                  title="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
                  aria-label="${client.is_active ? "Inactivar cliente" : "Reactivar cliente"}"
                >
                  ${renderActionIcon(client.is_active ? "deactivate" : "activate")}
                </button>
              </div>
            </div>
            <div class="catalog-card-meta">
              <span>${escapeHtml(client.phone || "Sin telefono")}</span>
              ${client.identification ? `<span>ID: ${escapeHtml(client.identification)}</span>` : ""}
              <span>${escapeHtml(client.email || "Sin email")}</span>
              ${client.whatsapp_phone_masked ? `<span>WhatsApp: ${escapeHtml(client.whatsapp_phone_masked)}</span>` : ""}
              ${client.whatsapp_opt_in ? "<span>WhatsApp autorizado</span>" : ""}
              ${client.preferred_contact_channel ? `<span>${escapeHtml(client.preferred_contact_channel)}</span>` : ""}
              ${client.preferred_payment_method ? `<span>${escapeHtml(client.preferred_payment_method)}</span>` : ""}
              ${client.neighborhood ? `<span>${escapeHtml(client.neighborhood)}</span>` : ""}
            </div>
            ${client.address ? `<p class="catalog-card-note"><strong>Direccion:</strong> ${escapeHtml(client.address)}</p>` : ""}
            ${client.description ? `<p class="catalog-card-note"><strong>Descripcion:</strong> ${escapeHtml(client.description)}</p>` : ""}
            ${client.interests ? `<p class="catalog-card-note"><strong>Intereses:</strong> ${escapeHtml(client.interests)}</p>` : ""}
            ${client.notes ? `<p class="catalog-card-note">${escapeHtml(client.notes)}</p>` : ""}
          </article>
          ${isExpanded ? buildInlineClientDetailShell(state.clientInlineDetail) : ""}
        </div>
      `;
    })
    .join("");
}

function renderProductsManaged(items) {
  if (!items.length) {
    productsListContainer.className = "catalog-empty";
    productsListContainer.innerHTML = "<p>Aun no hay productos guardados.</p>";
    return;
  }

  productsListContainer.className = "catalog-list";
  productsListContainer.innerHTML = items
    .map((product) => {
      const isExpanded = String(state.productInlineDetailId || "") === String(product.id);
      return `
        <div class="catalog-card-group ${isExpanded ? "is-expanded" : ""}">
          <article class="catalog-card ${product.is_active ? "" : "is-inactive"}">
            ${product.image_data_url ? `<div class="catalog-card-image"><img src="${product.image_data_url}" alt="${escapeHtml(productLabel(product))}" /></div>` : ""}
            <div class="catalog-card-top">
              <div>
                <h3>${escapeHtml(productLabel(product))}</h3>
                <p>${formatUsd(product.price_usd_net)} base + ${product.tax_usa_percent}% tax</p>
              </div>
              <div class="catalog-card-actions">
                <span class="catalog-chip ${product.is_active ? "catalog-chip-success" : "catalog-chip-muted"}">
                  ${product.is_active ? "Activo" : "Inactivo"}
                </span>
                <button class="history-action-button history-action-button-secondary" type="button" data-view-product="${product.id}">
                  ${isExpanded ? "Ocultar ficha" : "Ver ficha"}
                </button>
                <button
                  class="history-action-button history-action-button-secondary history-action-button-icon"
                  type="button"
                  data-edit-product="${product.id}"
                  title="Editar producto"
                  aria-label="Editar producto"
                >
                  ${renderActionIcon("edit")}
                </button>
                <button
                  class="history-action-button history-action-button-secondary"
                  type="button"
                  data-use-product="${product.id}"
                  ${product.is_active ? "" : "disabled"}
                >
                  Usar
                </button>
                <button
                  class="history-action-button ${product.is_active ? "history-action-button-secondary" : ""} history-action-button-icon"
                  type="button"
                  data-toggle-product-active="${product.id}"
                  data-next-active="${product.is_active ? "0" : "1"}"
                  title="${product.is_active ? "Inactivar producto" : "Reactivar producto"}"
                  aria-label="${product.is_active ? "Inactivar producto" : "Reactivar producto"}"
                >
                  ${renderActionIcon(product.is_active ? "deactivate" : "activate")}
                </button>
              </div>
            </div>
            <div class="catalog-card-meta">
              <span>${escapeHtml(product.category || "Sin categoria")}</span>
              <span>${escapeHtml(product.store || "Sin tienda")}</span>
              <span>Casillero: ${formatUsd(product.locker_shipping_usd)}</span>
              <span>${
                product.inventory_enabled
                  ? `Inventario: ${Number(product.current_stock || 0)}`
                  : "Sin inventario de tienda"
              }</span>
            </div>
            ${product.description ? `<p class="catalog-card-note"><strong>Descripcion:</strong> ${escapeHtml(product.description)}</p>` : ""}
            ${product.notes ? `<p class="catalog-card-note">${escapeHtml(product.notes)}</p>` : ""}
          </article>
          ${isExpanded ? buildInlineProductDetailShell(state.productInlineDetail) : ""}
        </div>
      `;
    })
    .join("");
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
  const financialPulseItems = [
    {
      label: "Vendido",
      value: metrics.sales_total_cop,
      meta: `${formatInteger(metrics.orders_count || 0)} compra(s) registradas`,
    },
    {
      label: "Recibido",
      value: metrics.cash_in_total_cop,
      meta: "Anticipos y pagos registrados",
    },
    {
      label: "Cartera",
      value: metrics.accounts_receivable_cop,
      meta: "Solo compras notificadas pendientes de segundo pago",
    },
    {
      label: "Utilidad bruta",
      value: metrics.gross_profit_cop,
      meta: "Antes de gastos operativos",
    },
    {
      label: "Utilidad neta",
      value: metrics.net_profit_cop,
      meta: "Despues de gastos operativos",
    },
  ];

  dashboardSummaryContainer.className = "results-ready";
  dashboardSummaryContainer.innerHTML = `
    <div class="metrics-grid dashboard-metrics-grid">
      ${makeMetricCard("Vendido", formatCop(metrics.sales_total_cop), `${metrics.orders_count || 0} compras en el periodo`)}
      ${makeMetricCard("Recibido", formatCop(metrics.cash_in_total_cop), "Anticipos y pagos registrados")}
      ${makeMetricCard("Costo producto", formatCop(metrics.product_cost_total_cop), "Costo base de los productos vendidos en el periodo")}
      ${makeMetricCard("Costo casillero", formatCop(metrics.locker_shipping_total_cop), "Envio o casillero acumulado de las compras del periodo")}
      ${makeMetricCard("Costo viaje", formatCop(metrics.travel_cost_total_cop), "Costo de viaje asignado a las compras del periodo")}
      ${makeMetricCard("Pendiente del periodo", formatCop(metrics.period_balance_due_cop), "Saldo aun abierto de estas compras")}
      ${makeMetricCard("Cartera por cobrar", formatCop(metrics.accounts_receivable_cop), "Solo compras notificadas y pendientes de segundo pago")}
      ${makeMetricCard("Utilidad bruta", formatCop(metrics.gross_profit_cop), "Antes de descontar gastos")}
      ${makeMetricCard("Inversion inventario", formatCop(metrics.inventory_investment_cop), "Dinero usado para abastecer stock durante el periodo")}
      ${makeMetricCard("Gastos operativos", formatCop(metrics.expenses_total_cop), "Publicidad, viaje, transporte y otros gastos del negocio")}
      ${makeMetricCard("Utilidad neta", formatCop(metrics.net_profit_cop), "Utilidad bruta menos gastos operativos")}
      ${makeMetricCard("Compras abiertas", String(metrics.open_orders_count || 0), "Seguimientos que siguen activos")}
    </div>

    <div class="dashboard-chart-grid">
      ${renderDashboardBarChart({
        title: "Pulso financiero",
        subtitle: "Compara rapido ventas, recaudo, cartera y utilidad del periodo.",
        items: financialPulseItems,
        valueFormatter: formatCop,
        maxItems: 5,
        sortByMagnitude: false,
      })}
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
        <div class="detail-item">
          <span>Costo producto</span>
          <strong>${formatCop(metrics.product_cost_total_cop)}</strong>
        </div>
        <div class="detail-item">
          <span>Costo casillero</span>
          <strong>${formatCop(metrics.locker_shipping_total_cop)}</strong>
        </div>
        <div class="detail-item">
          <span>Costo viaje</span>
          <strong>${formatCop(metrics.travel_cost_total_cop)}</strong>
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
    <div class="dashboard-expense-visuals">
      ${renderDashboardDonutChart({
        title: "Distribucion del gasto",
        subtitle: "Visualiza en que se fue la caja operativa del periodo.",
        items: expensesByCategory.map((item) => ({
          label: item.category_label,
          value: item.amount_cop,
          meta: `${formatInteger(item.count || 0)} movimiento(s)`,
          metaCount: item.count || 0,
        })),
        valueFormatter: formatCop,
      })}
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

function renderInventoryPurchaseDraft() {
  if (!inventoryPurchaseDraftContainer) {
    return;
  }

  if (!state.inventoryPurchaseLineItems.length) {
    inventoryPurchaseDraftContainer.className = "catalog-empty";
    inventoryPurchaseDraftContainer.innerHTML =
      "<p>Aun no has agregado productos para esta compra de inventario.</p>";
    return;
  }

  const totalUnits = state.inventoryPurchaseLineItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const totalAmount = state.inventoryPurchaseLineItems.reduce(
    (sum, item) => sum + Number(item.line_total_cop || 0),
    0
  );

  inventoryPurchaseDraftContainer.className = "inventory-purchase-draft";
  inventoryPurchaseDraftContainer.innerHTML = `
    <section class="quote-live-summary">
      <div class="quote-live-summary-grid">
        ${makeMetricCard("Referencias", String(state.inventoryPurchaseLineItems.length), "Productos agregados a esta reposicion")}
        ${makeMetricCard("Unidades", String(totalUnits), "Stock que entrara a la tienda")}
        ${makeMetricCard("Inversion estimada", formatCop(totalAmount), "Dinero que saldra para convertirse en costo de inventario")}
      </div>
    </section>
    <div class="quote-line-items">
      ${state.inventoryPurchaseLineItems
        .map(
          (item, index) => `
            <article class="quote-line-card inventory-purchase-line-card">
              <div class="quote-line-meta">
                <div>
                  <strong>${escapeHtml(item.product_name)}</strong>
                  <p class="catalog-card-note">
                    ${escapeHtml(String(item.quantity))} unidad(es) · ${formatCop(item.unit_cost_cop)} c/u
                  </p>
                  ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
                </div>
                <div class="quote-line-actions">
                  <span class="catalog-chip">${formatCop(item.line_total_cop)}</span>
                  <button type="button" class="secondary" data-inventory-purchase-remove="${index}">
                    Quitar
                  </button>
                </div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInventoryPurchases(items) {
  if (!inventoryPurchasesListContainer) {
    return;
  }

  if (!items.length) {
    inventoryPurchasesListContainer.className = "catalog-empty";
    inventoryPurchasesListContainer.innerHTML = "<p>Aun no hay abastecimientos registrados.</p>";
    return;
  }

  inventoryPurchasesListContainer.className = "catalog-list";
  inventoryPurchasesListContainer.innerHTML = items
    .map(
      (item) => `
        <article class="catalog-card inventory-purchase-card">
          <div class="catalog-card-top">
            <div>
              <h3>${escapeHtml(item.supplier_name)}</h3>
              <p>${escapeHtml(formatStoredDate(item.purchase_date))} · Abastecimiento #${item.id}</p>
            </div>
            <div class="catalog-card-actions">
              <span class="catalog-chip">${formatCop(item.total_amount_cop)}</span>
            </div>
          </div>
          <div class="catalog-card-meta">
            <span>${escapeHtml(String(item.items_count || 0))} referencia(s)</span>
            <span>${escapeHtml(String(item.total_units || 0))} unidad(es)</span>
            <span>Entrada a inventario</span>
          </div>
          <div class="inventory-purchase-item-list">
            ${(item.items || [])
              .map(
                (line) => `
                  <article class="detail-list-card">
                    <span>${escapeHtml(line.product_name)}</span>
                    <p>
                      ${escapeHtml(String(line.quantity))} x ${formatCop(line.unit_cost_cop)} = ${formatCop(
                        line.line_total_cop
                      )}
                    </p>
                    ${line.notes ? `<small>${escapeHtml(line.notes)}</small>` : ""}
                  </article>
                `
              )
              .join("")}
          </div>
          ${item.notes ? `<p class="catalog-card-note">${escapeHtml(item.notes)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

const dashboardChartPalette = ["#111111", "#51433b", "#8a7567", "#b79f8f", "#dbcabc", "#efe4da"];

function collapseChartItems(items, limit = 5, otherLabel = "Otros") {
  if (!otherLabel) {
    return items.slice(0, limit);
  }
  if (items.length <= limit) {
    return items;
  }

  const visible = items.slice(0, limit - 1);
  const remaining = items.slice(limit - 1);
  const otherValue = remaining.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const otherMeta = remaining.reduce((sum, item) => sum + Number(item.metaCount || 0), 0);

  return [
    ...visible,
    {
      label: otherLabel,
      value: otherValue,
      meta: `${formatInteger(otherMeta || remaining.length)} registro(s) agrupado(s)`,
      metaCount: otherMeta || remaining.length,
    },
  ];
}

function renderDashboardBarChart({
  title,
  subtitle = "",
  items = [],
  valueFormatter = formatCop,
  emptyMessage = "Sin datos suficientes para graficar.",
  maxItems = 5,
  otherLabel = "Otros",
  sortByMagnitude = true,
}) {
  const normalizedItems = collapseChartItems(
    items
      .map((item) => ({
        label: String(item.label || "-"),
        value: Number(item.value || 0),
        meta: item.meta ? String(item.meta) : "",
        metaCount: Number(item.metaCount || 0),
      }))
      .filter((item) => Number.isFinite(item.value)),
    maxItems,
    otherLabel
  );

  if (!normalizedItems.length || normalizedItems.every((item) => Math.abs(item.value) <= 0)) {
    return `
      <article class="dashboard-chart-card">
        <div class="dashboard-chart-head">
          <div>
            <h3>${escapeHtml(title)}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>
        <p class="catalog-card-note">${escapeHtml(emptyMessage)}</p>
      </article>
    `;
  }

  const orderedItems = sortByMagnitude
    ? [...normalizedItems].sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    : normalizedItems;
  const maxMagnitude = Math.max(...orderedItems.map((item) => Math.abs(item.value)), 1);
  const leadItem = orderedItems[0];

  return `
    <article class="dashboard-chart-card">
      <div class="dashboard-chart-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <span class="dashboard-chart-total">Pico: ${escapeHtml(valueFormatter(leadItem.value))}</span>
      </div>
      <div class="dashboard-chart-bars">
        ${orderedItems
          .map((item, index) => {
            const magnitude = Math.abs(item.value);
            const rawWidth = maxMagnitude ? (magnitude / maxMagnitude) * 100 : 0;
            const width = rawWidth > 0 ? Math.max(rawWidth, 8) : 0;
            const color = dashboardChartPalette[index % dashboardChartPalette.length];

            return `
              <div class="dashboard-bar-row">
                <div class="dashboard-bar-row-top">
                  <span class="dashboard-bar-label">${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(valueFormatter(item.value))}</strong>
                </div>
                <div class="dashboard-bar-track">
                  <span
                    class="dashboard-bar-fill${item.value < 0 ? " is-negative" : ""}"
                    style="width: ${width.toFixed(2)}%; --chart-fill-color: ${color};"
                  ></span>
                </div>
                ${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    </article>
  `;
}

function renderDashboardDonutChart({
  title,
  subtitle = "",
  items = [],
  valueFormatter = formatCop,
  emptyMessage = "Sin movimientos suficientes para graficar.",
  maxItems = 5,
  otherLabel = "Otros",
}) {
  const normalizedItems = collapseChartItems(
    items
      .map((item) => ({
        label: String(item.label || "-"),
        value: Math.max(0, Number(item.value || 0)),
        meta: item.meta ? String(item.meta) : "",
        metaCount: Number(item.metaCount || 0),
      }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0),
    maxItems,
    otherLabel
  );

  if (!normalizedItems.length) {
    return `
      <article class="dashboard-chart-card">
        <div class="dashboard-chart-head">
          <div>
            <h3>${escapeHtml(title)}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>
        <p class="catalog-card-note">${escapeHtml(emptyMessage)}</p>
      </article>
    `;
  }

  const total = normalizedItems.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradientStops = normalizedItems
    .map((item, index) => {
      const percentage = total ? (item.value / total) * 100 : 0;
      const start = cursor;
      const end = cursor + percentage;
      cursor = end;
      return `${dashboardChartPalette[index % dashboardChartPalette.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return `
    <article class="dashboard-chart-card">
      <div class="dashboard-chart-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <span class="dashboard-chart-total">${escapeHtml(valueFormatter(total))}</span>
      </div>
      <div class="dashboard-donut-layout">
        <div class="dashboard-donut" style="background: conic-gradient(${gradientStops});">
          <div class="dashboard-donut-center">
            <strong>${escapeHtml(valueFormatter(total))}</strong>
            <span>Total</span>
          </div>
        </div>
        <div class="dashboard-chart-legend">
          ${normalizedItems
            .map((item, index) => {
              const share = total ? item.value / total : 0;
              const color = dashboardChartPalette[index % dashboardChartPalette.length];

              return `
                <div class="dashboard-legend-row">
                  <span class="dashboard-legend-swatch" style="--legend-color: ${color};"></span>
                  <div class="dashboard-legend-copy">
                    <strong>${escapeHtml(item.label)}</strong>
                    <p>${escapeHtml(valueFormatter(item.value))} - ${escapeHtml(formatPercent(share))}</p>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    </article>
  `;
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
      ${renderDashboardBarChart({
        title: "Clientes que mas compraron",
        subtitle: "Top comercial del periodo segun venta cerrada.",
        items: topBuyers.map((item) => ({
          label: item.client_name,
          value: item.sales_total_cop,
          meta: `${formatInteger(item.orders_count || 0)} compra(s) - Ticket ${formatCop(item.average_ticket_cop)}`,
        })),
        valueFormatter: formatCop,
        maxItems: 6,
        otherLabel: "",
      })}
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
              )} | Por cobrar: ${formatCop(
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
      ${renderDashboardBarChart({
        title: "Clientes con cartera por cobrar",
        subtitle: "Solo compras notificadas y pendientes de segundo pago.",
        items: receivables.map((item) => ({
          label: item.client_name,
          value: item.accounts_receivable_cop,
          meta: `${formatInteger(item.open_orders_count || 0)} compra(s) notificadas`,
        })),
        valueFormatter: formatCop,
        maxItems: 6,
        otherLabel: "",
      })}
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
      ${renderDashboardBarChart({
        title: "Productos mas vendidos",
        subtitle: "Referencias con mayor movimiento de salida en el periodo.",
        items: topSellers.map((item) => ({
          label: item.product_name,
          value: item.units_sold,
          meta: `Vendido ${formatCop(item.sales_total_cop)} - Recaudado ${formatCop(item.cash_in_total_cop)}`,
        })),
        valueFormatter: (value) => `${formatInteger(value)} und`,
        maxItems: 6,
        otherLabel: "",
      })}
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
      ${renderDashboardBarChart({
        title: "Productos con mayor utilidad",
        subtitle: "Referencias que mas margen bruto dejaron en el periodo.",
        items: mostProfitable.map((item) => ({
          label: item.product_name,
          value: item.gross_profit_cop,
          meta: `Margen ${formatPercent(item.gross_margin_percent)} - Vendido ${formatCop(item.sales_total_cop)}`,
        })),
        valueFormatter: formatCop,
        maxItems: 6,
        otherLabel: "",
      })}
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
              <strong>WhatsApp</strong>
              <p>Envia esta actualizacion al cliente con el estado actual.</p>
            </div>
            <button
              class="secondary"
              type="button"
              data-send-order-whatsapp="${order.id}"
              data-order-whatsapp-trigger="${escapeHtml(getOrderWhatsAppTrigger(order))}"
            >
              ${escapeHtml(getOrderWhatsAppButtonLabel(order))}
            </button>
          </div>

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

function resetQuoteComposerState({ statusText = "Volviste al modo de nueva cotizacion." } = {}) {
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
  const clientQuoteItemsField = quoteElements.namedItem("client_quote_items_text");
  if (clientQuoteItemsField) {
    clientQuoteItemsField.dataset.autoGenerated = "";
  }
  syncPurchaseTypeUi();
  renderQuoteLineItems();
  resultsContainer.className = "results-empty";
  resultsContainer.innerHTML =
    "<p>Cuando calcules, aqui veras el costo real, el precio sugerido y el escenario final.</p>";
  statusMessage.textContent = statusText;
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
  if (payload.uses_inventory_stock && Number(payload.inventory_unit_cost_cop || 0) <= 0) {
    throw new Error(
      "Este producto aun no tiene costo promedio de inventario. Registra primero el abastecimiento real."
    );
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
              ${item.uses_inventory_stock ? "<span>Salida de inventario</span>" : ""}
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
  if (createOrderButton) {
    createOrderButton.textContent = "Crear compra directa";
  }
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
  const inventoryField = getQuoteField("uses_inventory_stock");
  if (inventoryField) {
    inventoryField.checked = Boolean(input.uses_inventory_stock || item.uses_inventory_stock);
  }
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
  syncInventorySaleUi(
    state.products.find((entry) => String(entry.id) === String(input.product_id)) || null
  );
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

  const snapshotInput = JSON.parse(JSON.stringify(state.lastPayload));
  const quantity = Number(snapshotInput.quantity || 1);
  if (snapshotInput.uses_inventory_stock) {
    const currentProduct = state.products.find(
      (item) => String(item.id) === String(snapshotInput.product_id)
    );
    if (!currentProduct || !currentProduct.inventory_enabled) {
      throw new Error("Este producto no tiene inventario de tienda activo.");
    }
    const availableStock = Number(currentProduct.current_stock || 0);
    if (availableStock < quantity) {
      throw new Error(
        `No hay suficiente inventario para este producto. Disponible: ${availableStock}.`
      );
    }
  }

  return normalizeStoredQuoteItem({
    input: snapshotInput,
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
  prepareQuoteCalculatorForNextProduct();
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
  const currentProduct = state.products.find(
    (item) => String(item.id) === String(data.get("product_id") || "").trim()
  );
  const usesInventoryStock = data.get("uses_inventory_stock") === "on";
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
    uses_inventory_stock: usesInventoryStock,
    inventory_unit_cost_cop: usesInventoryStock
      ? Number(currentProduct?.inventory_unit_cost_cop || 0)
      : 0,
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
        uses_inventory_stock: Boolean(
          item.uses_inventory_stock ?? item.input?.uses_inventory_stock
        ),
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

function summarizeQuoteItemsForTotals(items) {
  return (items || []).reduce(
    (summary, item) => {
      const itemResult = item?.result?.final || {};
      summary.salePriceCop += Number(item.sale_price_cop || itemResult.sale_price_cop || 0);
      summary.advanceCop += Number(item.advance_cop || itemResult.advance_cop || 0);
      return summary;
    },
    { salePriceCop: 0, advanceCop: 0 }
  );
}

async function persistQuoteRecord() {
  const payload = readQuoteSavePayload();
  const comesFromPending = Boolean(payload.pending_request_id);
  ensureQuoteCanBeSaved(payload);

  const updatedProduct = await syncCurrentProductPricingToCatalog();
  const targetUrl = state.editingQuoteId
    ? `/api/quotes/${state.editingQuoteId}/update`
    : "/api/quotes";
  const response = await requestJson(targetUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    quote: response.item,
    comesFromPending,
    updatedProduct,
  };
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

function formatOrderCode(orderId) {
  const numericId = Number(orderId || 0);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return "COMPRA";
  }
  return `COMP-${String(Math.trunc(numericId)).padStart(4, "0")}`;
}

function renderActionIcon(kind) {
  const icons = {
    edit: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 20h4l10-10-4-4L4 16v4z"></path>
        <path d="M14 6l4 4"></path>
      </svg>
    `,
    deactivate: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3v8"></path>
        <path d="M7.1 5.8A8 8 0 1 0 16.9 5.8"></path>
      </svg>
    `,
    activate: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `,
    pdf: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3h7l5 5v13H7z"></path>
        <path d="M14 3v5h5"></path>
        <path d="M9 16h6"></path>
        <path d="M9 12h3"></path>
      </svg>
    `,
    whatsapp: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4a8 8 0 0 0-6.93 12L4 20l4.18-1.04A8 8 0 1 0 12 4z"></path>
        <path d="M9.7 9.2c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.3l.7 1.7c.1.2.1.4 0 .6l-.4.6c-.1.1-.2.3 0 .5.3.6.8 1.2 1.4 1.6.2.1.4.1.5 0l.6-.4c.2-.1.4-.1.6 0l1.6.8c.3.1.3.3.3.5v.5c0 .2 0 .4-.4.6-.4.2-1.3.5-2.3.2-1-.3-2.2-1-3.2-2-.9-.9-1.6-2-1.9-3-.3-1 .1-1.9.3-2.2z"></path>
      </svg>
    `,
      order: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 5h2l2.3 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.7L21 8H7"></path>
          <circle cx="10" cy="19" r="1.5"></circle>
          <circle cx="18" cy="19" r="1.5"></circle>
        </svg>
      `,
      close: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12"></path>
          <path d="M18 6 6 18"></path>
        </svg>
      `,
    };
  return icons[kind] || "";
}

function renderHistory(items) {
  const visibleItems = (items || []).filter((item) => !item.has_order);
  if (!visibleItems.length) {
    historyContainer.className = "history-empty";
    historyContainer.innerHTML = "<p>No hay cotizaciones pendientes por pasar a compra.</p>";
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
        ${visibleItems
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
                      class="history-action-button history-action-button-secondary history-action-button-icon"
                      type="button"
                      data-edit-quote="${item.id}"
                      title="Editar cotizacion"
                      aria-label="Editar cotizacion"
                    >
                      ${renderActionIcon("edit")}
                    </button>
                    <a
                      class="history-action-button history-action-button-icon"
                      href="/api/quotes/${item.id}/pdf"
                      title="Descargar PDF"
                      aria-label="Descargar PDF"
                    >
                      ${renderActionIcon("pdf")}
                    </a>
                    <button
                      class="history-action-button history-action-button-secondary history-action-button-icon"
                      type="button"
                      data-copy-quote="${item.id}"
                      title="Copiar mensaje para WhatsApp"
                      aria-label="Copiar mensaje para WhatsApp"
                    >
                      ${renderActionIcon("whatsapp")}
                    </button>
                    <button
                      class="history-action-button history-action-button-secondary history-action-button-icon"
                      type="button"
                      data-create-order="${item.id}"
                    data-quote-total="${finalData.sale_price_cop}"
                      data-quoted-advance="${finalData.advance_cop}"
                      title="Pasar a compra"
                      aria-label="Pasar a compra"
                    >
                      ${renderActionIcon("order")}
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

function buildOrderPrimaryActionButton(order) {
  const balanceDue = Number(order.balance_due_cop || 0);
  const isTravelOrder = order.snapshot?.input?.purchase_type === "travel";
  const routeUndecided = isTravelOrder && (order.travel_transport_type || "undecided") === "undecided";
  const secondPaymentBlocked =
    order.next_status_key === "second_payment_received" && balanceDue > 0;

  if (order.status_key === "client_notified" && balanceDue > 0) {
    return `
      <button
        class="history-action-button history-action-button-secondary orders-inline-action"
        type="button"
        data-manage-order="${order.id}"
      >
        Cobrar saldo
      </button>
    `;
  }

  if (routeUndecided) {
    return `
      <button
        class="history-action-button history-action-button-secondary orders-inline-action"
        type="button"
        data-manage-order="${order.id}"
      >
        Definir ruta
      </button>
    `;
  }

  if (order.next_status_key) {
    return `
      <button
        class="history-action-button history-action-button-secondary orders-inline-action"
        type="button"
        data-advance-order-status="${order.id}"
        data-next-status-key="${escapeHtml(order.next_status_key)}"
        ${secondPaymentBlocked ? "disabled" : ""}
      >
        ${escapeHtml(order.next_status_label || "Siguiente paso")}
      </button>
    `;
  }

  return '<span class="order-flow-complete">Sin accion</span>';
}

function getOrderEditExchangeRate(order) {
  const quoteItems = order?.snapshot?.input?.quote_items;
  if (Array.isArray(quoteItems) && quoteItems.length) {
    const firstItemInput =
      quoteItems[0] && typeof quoteItems[0].input === "object" ? quoteItems[0].input : quoteItems[0];
    return Number(firstItemInput?.exchange_rate_cop || 0) || 0;
  }
  return Number(order?.snapshot?.input?.exchange_rate_cop || 0) || 0;
}

function getOrderEditPurchaseItems(order) {
  const quoteItems = order?.snapshot?.input?.quote_items;
  if (Array.isArray(quoteItems) && quoteItems.length) {
    return quoteItems.map((item, index) => {
      const itemInput = item && typeof item.input === "object" ? item.input : item;
      const salePriceCop =
        Number(item?.sale_price_cop || item?.result?.final?.sale_price_cop || itemInput?.final_sale_price_cop || 0) ||
        0;
      return {
        quoteItemIndex: index,
        productId: item?.product_id ?? itemInput?.product_id ?? null,
        productName: String(item?.product_name || itemInput?.product_name || "Producto"),
        usesInventoryStock: Boolean(
          item?.uses_inventory_stock ?? itemInput?.uses_inventory_stock ?? false
        ),
        quantity: Number(item?.quantity || itemInput?.quantity || 1) || 1,
        priceUsdNet: Number(itemInput?.price_usd_net || 0) || 0,
        taxUsaPercent: Number(itemInput?.tax_usa_percent || 0) || 0,
        lockerShippingUsd: Number(itemInput?.locker_shipping_usd || 0) || 0,
        travelCostUsd: Number(itemInput?.travel_cost_usd || 0) || 0,
        finalSalePriceCop: salePriceCop,
      };
    });
  }

  return [
    {
      quoteItemIndex: 0,
      productId: order?.snapshot?.input?.product_id ?? null,
      productName: String(order?.snapshot?.input?.product_name || order?.product_name || "Producto"),
      usesInventoryStock: Boolean(order?.snapshot?.input?.uses_inventory_stock),
      quantity: Number(order?.snapshot?.input?.quantity || 1) || 1,
      priceUsdNet: Number(order?.snapshot?.input?.price_usd_net || 0) || 0,
      taxUsaPercent: Number(order?.snapshot?.input?.tax_usa_percent || 0) || 0,
      lockerShippingUsd: Number(order?.snapshot?.input?.locker_shipping_usd || 0) || 0,
      travelCostUsd: Number(order?.snapshot?.input?.travel_cost_usd || 0) || 0,
      finalSalePriceCop:
        Number(
          order?.snapshot?.result?.final?.sale_price_cop || order?.snapshot?.input?.final_sale_price_cop || 0
        ) || 0,
    },
  ];
}

function renderOrderDetailPanel(order) {
  const nextAction = describeOrderNextAction(order);
  const secondPaymentBlocked =
    order.next_status_key === "second_payment_received" && Number(order.balance_due_cop || 0) > 0;
  const editablePurchaseItems = getOrderEditPurchaseItems(order);
  const exchangeRateCop = getOrderEditExchangeRate(order);

  return `
    <div class="order-detail-shell">
      <div class="order-card-top">
        <div>
          <h3>${escapeHtml(order.product_name)}</h3>
          <p>${escapeHtml(order.client_name || "Cliente no registrado")} · Desde cotizacion #${order.quote_id}</p>
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
        <span>Ultimo cambio: ${formatStoredDate(order.last_status_changed_at)}</span>
        ${
          order.snapshot?.input?.purchase_type === "travel"
            ? `<span>Ruta viaje: ${escapeHtml(order.travel_transport_label || "Por definir")}</span>`
            : ""
        }
      </div>

      <div class="order-payment-register">
        <strong>Editar compra confirmada</strong>
        <p class="catalog-card-note">
          Corrige la compra completa si hubo descuentos, cambios de venta o un error operativo, sin perder el historial.
        </p>
        <div class="order-payment-fields">
          <label>
            <span>TRM</span>
            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(String(Math.round(exchangeRateCop || 0)))}"
              data-order-edit-exchange-rate="${order.id}"
            />
          </label>
          <label>
            <span>Anticipo real</span>
            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(String(Math.round(order.advance_paid_cop || 0)))}"
              data-order-edit-advance="${order.id}"
            />
          </label>
          <label>
            <span>Descuento general</span>
            <input
              type="text"
              inputmode="numeric"
              value="${escapeHtml(
                String(
                  Math.round(
                    order.snapshot?.result?.final?.general_discount_cop ||
                      order.snapshot?.input?.general_discount_cop ||
                      0
                  )
                )
              )}"
              data-order-edit-discount="${order.id}"
            />
          </label>
        </div>
        <div class="order-payment-fields order-edit-price-grid">
          ${editablePurchaseItems
            .map(
              (item) => `
                <article class="order-edit-product-card">
                  <strong>${escapeHtml(item.productName)}</strong>
                  <small>Cantidad: ${escapeHtml(String(item.quantity || 1))}</small>
                  <div class="order-edit-product-grid">
                    ${
                      item.usesInventoryStock
                        ? `<p class="catalog-card-note">Sale desde inventario. El costo real se toma del stock; aqui solo puedes ajustar la venta final.</p>`
                        : `
                          <label>
                            <span>Precio compra USD</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value="${escapeHtml(String(item.priceUsdNet || 0))}"
                              data-order-edit-item="${order.id}"
                              data-field="price_usd_net"
                              data-quote-item-index="${item.quoteItemIndex}"
                              data-product-id="${escapeHtml(String(item.productId ?? ""))}"
                              data-product-name="${escapeHtml(item.productName)}"
                            />
                          </label>
                          <label>
                            <span>Tax %</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value="${escapeHtml(String(item.taxUsaPercent || 0))}"
                              data-order-edit-item="${order.id}"
                              data-field="tax_usa_percent"
                              data-quote-item-index="${item.quoteItemIndex}"
                              data-product-id="${escapeHtml(String(item.productId ?? ""))}"
                              data-product-name="${escapeHtml(item.productName)}"
                            />
                          </label>
                          <label>
                            <span>Envio / casillero USD</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value="${escapeHtml(String(item.lockerShippingUsd || 0))}"
                              data-order-edit-item="${order.id}"
                              data-field="locker_shipping_usd"
                              data-quote-item-index="${item.quoteItemIndex}"
                              data-product-id="${escapeHtml(String(item.productId ?? ""))}"
                              data-product-name="${escapeHtml(item.productName)}"
                            />
                          </label>
                          <label>
                            <span>Costo viaje USD</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value="${escapeHtml(String(item.travelCostUsd || 0))}"
                              data-order-edit-item="${order.id}"
                              data-field="travel_cost_usd"
                              data-quote-item-index="${item.quoteItemIndex}"
                              data-product-id="${escapeHtml(String(item.productId ?? ""))}"
                              data-product-name="${escapeHtml(item.productName)}"
                            />
                          </label>
                        `
                    }
                    <label>
                      <span>Precio final COP</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        value="${escapeHtml(String(Math.round(item.finalSalePriceCop || 0)))}"
                        data-order-edit-item="${order.id}"
                        data-field="final_sale_price_cop"
                        data-quote-item-index="${item.quoteItemIndex}"
                        data-product-id="${escapeHtml(String(item.productId ?? ""))}"
                        data-product-name="${escapeHtml(item.productName)}"
                      />
                    </label>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
        <label class="order-edit-notes-field">
          <span>Notas de la compra</span>
          <textarea rows="3" data-order-edit-notes="${order.id}">${escapeHtml(order.notes || "")}</textarea>
        </label>
        <div class="order-edit-actions">
          <button class="secondary" type="button" data-save-order-edit="${order.id}">
            Guardar ajustes
          </button>
          <button class="secondary danger-button" type="button" data-invalidate-order="${order.id}">
            Invalidar compra
          </button>
          <button class="secondary danger-button danger-button-outline" type="button" data-delete-order="${order.id}">
            Eliminar compra
          </button>
        </div>
      </div>

      <div class="order-payment-register">
        <strong>Imagen de la compra</strong>
        ${
          order.image_data_url
            ? `
              <div class="detail-image-card detail-image-card-compact">
                <img src="${order.image_data_url}" alt="Imagen de la compra ${escapeHtml(formatOrderCode(order.id))}" />
              </div>
            `
            : '<p class="catalog-card-note">Aun no has cargado imagen para esta compra.</p>'
        }
        <div class="order-payment-fields order-image-fields">
          <label>
            <span>Subir imagen</span>
            <input type="file" accept="image/*" data-order-image-input="${order.id}" />
          </label>
        </div>
      </div>

      ${
        order.snapshot?.input?.purchase_type === "travel"
          ? `
            <div class="order-payment-register">
              <strong>Ruta del producto en viaje</strong>
              <div class="order-payment-fields">
                <label>
                  <span>Como viaja</span>
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
        Number(order.balance_due_cop || 0) > 0
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
                    value="${escapeHtml(String(Math.round(order.balance_due_cop || 0)))}"
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
                  ? `Saldo cubierto. Ultimo segundo pago registrado el ${escapeHtml(
                      formatStoredDate(order.second_payment_received_at)
                    )}.`
                  : "No hay saldo pendiente por segundo pago."
              }
            </p>
          `
      }

      <div class="order-status-update">
        <div class="order-status-summary">
          <strong>WhatsApp</strong>
          <p>Envia esta actualizacion al cliente con el estado actual.</p>
        </div>
        <button
          class="secondary"
          type="button"
          data-send-order-whatsapp="${order.id}"
          data-order-whatsapp-trigger="${escapeHtml(getOrderWhatsAppTrigger(order))}"
        >
          ${escapeHtml(getOrderWhatsAppButtonLabel(order))}
        </button>
      </div>

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
        ${(order.events || [])
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
    </div>
  `;
}

function renderOrders(items) {
  const visibleItems = (items || []).filter((item) => item.status_key !== "cycle_closed");
  if (!visibleItems.length) {
    state.activeOrderId = null;
    ordersListContainer.className = "catalog-empty";
    ordersListContainer.innerHTML = "<p>Aun no hay compras abiertas.</p>";
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

  if (state.activeOrderId && !visibleItems.some((item) => Number(item.id) === Number(state.activeOrderId))) {
    state.activeOrderId = null;
  }

  ordersListContainer.className = "orders-list";
  ordersListContainer.innerHTML = `
    <section class="orders-board-summary">
      ${makeMetricCard("Compras activas", String(visibleItems.length), "Pedidos abiertos que debes mover en operacion")}
      ${makeMetricCard("Por cobrar", String(pendingCollectionCount), "Clientes notificados y pendientes de segundo pago")}
      ${makeMetricCard("Ruta por definir", String(travelRoutePendingCount), "Compras en viaje que aun no tienen casillero o maleta")}
      ${makeMetricCard("Listas para avanzar", String(readyToAdvanceCount), "Pedidos que ya pueden pasar al siguiente estado")}
      ${makeMetricCard("Venta activa", formatCop(activeSalesTotal), "Valor comprometido en compras aun abiertas")}
    </section>
    <div class="orders-table-wrap">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Fecha</th>
            <th>Compra</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Venta</th>
            <th>Saldo</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          ${visibleItems
            .map((order) => {
              const isActive = Number(state.activeOrderId) === Number(order.id);
              return `
                <tr class="${isActive ? "orders-row-active" : ""}">
                  <td>
                    <button
                      type="button"
                      class="order-code-button"
                      data-view-order="${order.id}"
                    >
                      ${escapeHtml(formatOrderCode(order.id))}
                    </button>
                  </td>
                  <td>${escapeHtml(formatStoredDate(order.created_at))}</td>
                  <td>${escapeHtml(order.product_name || "-")}</td>
                  <td>${escapeHtml(order.client_name || "-")}</td>
                  <td>${escapeHtml(order.status_label || "-")}</td>
                  <td>${formatCop(order.sale_price_cop)}</td>
                  <td>${formatCop(order.balance_due_cop)}</td>
                  <td class="orders-primary-action-cell">
                    ${buildOrderPrimaryActionButton(order)}
                  </td>
                </tr>
                ${
                  isActive
                    ? `
                      <tr class="orders-detail-row">
                        <td colspan="8">
                          ${renderOrderDetailPanel(order)}
                        </td>
                      </tr>
                    `
                    : ""
                }
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadHistory() {
  try {
    const payload = await requestJson("/api/quotes");
    state.quoteHistory = payload.items || [];
    renderHistory(state.quoteHistory);
  } catch (error) {
    state.quoteHistory = [];
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

      if (!state.clients.some((item) => String(item.id) === String(state.clientInlineDetailId || ""))) {
        state.clientInlineDetailId = null;
        state.clientInlineDetail = null;
      }
      if (!state.products.some((item) => String(item.id) === String(state.productInlineDetailId || ""))) {
        state.productInlineDetailId = null;
        state.productInlineDetail = null;
      }

    updateSearchableOptions(clientSelectOptions, getActiveClients(), clientSearchLabel);
    updateSearchableOptions(productSelectOptions, getActiveProducts(), productSearchLabel);
    updateNameOptions(productCategoryOptions, getActiveProductCategories());
    updateNameOptions(productStoreOptions, getActiveProductStores());

    refreshAdminCatalogViews();
    autocompleteControllers.forEach((controller) => controller.refresh());
    syncInventorySaleUi();
  } catch (error) {
    clientsListContainer.className = "catalog-empty";
    productsListContainer.className = "catalog-empty";
    clientsListContainer.innerHTML = `<p>${error.message}</p>`;
    productsListContainer.innerHTML = `<p>${error.message}</p>`;
    renderAdminNamedCatalogList(productCategoriesListContainer, [], error.message, {
      entityName: "categoria",
      editAttr: "data-edit-product-category",
      toggleAttr: "data-toggle-product-category-active",
    });
    renderAdminNamedCatalogList(productStoresListContainer, [], error.message, {
      entityName: "tienda",
      editAttr: "data-edit-product-store",
      toggleAttr: "data-toggle-product-store-active",
    });
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

async function loadInventoryPurchases() {
  if (!inventoryPurchasesListContainer) {
    return;
  }

  try {
    const payload = await requestJson("/api/inventory-purchases");
    state.inventoryPurchases = payload.items || [];
    renderInventoryPurchases(state.inventoryPurchases);
  } catch (error) {
    inventoryPurchasesListContainer.className = "catalog-empty";
    inventoryPurchasesListContainer.innerHTML = `<p>${error.message}</p>`;
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

function syncWhatsAppTemplateFormFromTrigger(triggerKey) {
  if (!whatsappTemplateForm) {
    return;
  }

  const trigger = String(triggerKey || "").trim();
  const template = state.whatsappTemplates.find((item) => item.trigger_key === trigger);
  const triggerOption = state.whatsappTriggers.find((item) => item.key === trigger);
  const form = whatsappTemplateForm.elements;

  form.namedItem("trigger_key").value = trigger;
  form.namedItem("label").value = template?.label || triggerOption?.label || "";
  form.namedItem("content_sid").value = template?.content_sid || "";
  form.namedItem("content_variables_json").value = template?.content_variables_json || "";
  form.namedItem("body_text").value = template?.body_text || "";
  form.namedItem("is_active").checked = template ? Boolean(template.is_active) : true;
  form.namedItem("auto_send_enabled").checked = template ? Boolean(template.auto_send_enabled) : false;
}

async function loadWhatsAppAdmin() {
  if (!whatsappSettingsForm || !whatsappTemplateForm) {
    return;
  }

  try {
    const [settingsPayload, templatesPayload] = await Promise.all([
      requestJson("/api/whatsapp/settings"),
      requestJson("/api/whatsapp/templates"),
    ]);

    state.whatsappSettings = settingsPayload.item || null;
    state.whatsappTemplates = templatesPayload.items || [];
    state.whatsappTriggers = templatesPayload.triggers || [];

    renderWhatsAppSettings(state.whatsappSettings);
    renderWhatsAppTriggerOptions(state.whatsappTriggers);
    renderWhatsAppTemplates(state.whatsappTemplates);

    if (whatsappTriggerSelect && state.whatsappTriggers.length) {
      const currentTrigger = whatsappTriggerSelect.value || state.whatsappTriggers[0].key;
      syncWhatsAppTemplateFormFromTrigger(currentTrigger);
    }
  } catch (error) {
    state.whatsappTemplates = [];
    state.whatsappTriggers = [];
    renderWhatsAppTemplates([]);
    if (whatsappTemplatesListContainer) {
      whatsappTemplatesListContainer.className = "catalog-empty";
      whatsappTemplatesListContainer.innerHTML = `<p>${error.message}</p>`;
    }
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
          ? "Producto actualizado dentro de la cotizacion. La calculadora quedo lista para el siguiente."
          : updatedProduct
            ? "Producto agregado a la cotizacion, sincronizado al catalogo y la calculadora quedo lista para el siguiente."
            : "Producto agregado a la cotizacion. La calculadora quedo lista para el siguiente.";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (directOrderForm) {
  directOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await calculateDirectOrderFromForm({ manual: true });
  });
}

if (directOrderClientSelect) {
  directOrderClientSelect.addEventListener("change", () => {
    const client = findClientBySearchValue(directOrderClientSelect.value);
    if (client) {
      applyClientToDirectOrder(client);
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = "Cliente aplicado a la compra directa.";
      }
      return;
    }
    directOrderClientSelect.value = "";
    clearDirectOrderClientSelection();
  });
}

if (directOrderProductSelect) {
  directOrderProductSelect.addEventListener("change", () => {
    const product = findProductBySearchValue(directOrderProductSelect.value);
    if (product) {
      loadProductIntoDirectOrderCalculator(product);
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = "Producto cargado en la compra directa.";
      }
      return;
    }
    directOrderProductSelect.value = "";
    clearDirectOrderProductSelection();
  });
}

if (directOrderLoadProductButton) {
  directOrderLoadProductButton.addEventListener("click", () => {
    const product = findProductBySearchValue(directOrderProductSelect?.value || "");
    if (!product) {
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent =
          "Busca un producto valido del catalogo y luego cargalo en la compra.";
      }
      return;
    }
    loadProductIntoDirectOrderCalculator(product);
    if (directOrderStatusMessage) {
      directOrderStatusMessage.textContent = "Producto listo para calcular dentro de la compra.";
    }
  });
}

if (directOrderAddItemButton) {
  directOrderAddItemButton.addEventListener("click", async () => {
    const calculated = await calculateDirectOrderFromForm({ manual: true });
    if (!calculated) {
      return;
    }

    try {
      const wasEditing = state.editingDirectOrderItemIndex !== null;
      addCurrentCalculationToDirectOrder();
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = wasEditing
          ? "Producto actualizado dentro de la compra y listo para continuar."
          : "Producto agregado a la compra. Ya puedes cargar el siguiente.";
      }
    } catch (error) {
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = error.message;
      }
    }
  });
}

if (directOrderClearButton) {
  directOrderClearButton.addEventListener("click", () => {
    resetDirectOrderComposerState({
      statusText: "Compra directa limpiada. Ya puedes empezar una nueva.",
    });
  });
}

enhanceDirectOrderComposerLayout();

if (directOrderCreateButton) {
  directOrderCreateButton.addEventListener("click", async () => {
    let payload;
    try {
      payload = buildDirectOrderSavePayload();
    } catch (error) {
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = error.message;
      }
      return;
    }

    directOrderCreateButton.disabled = true;
    if (directOrderAddItemButton) {
      directOrderAddItemButton.disabled = true;
    }
    if (directOrderStatusMessage) {
      directOrderStatusMessage.textContent = "Creando compra directa...";
    }

    try {
      const response = await requestJson("/api/orders/direct", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await Promise.all([loadOrders(), loadDashboard(), loadFollowup(), loadCatalog(), loadHistory()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      resetDirectOrderComposerState({
        statusText: `Compra #${response.item.id} creada desde el modulo de compras.`,
      });
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent =
          "Compra creada correctamente. Ya puedes armar una nueva.";
      }
      window.location.hash = "compras";
    } catch (error) {
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent = error.message;
      }
    } finally {
      if (directOrderAddItemButton) {
        directOrderAddItemButton.disabled = false;
      }
      syncDirectOrderCreateState();
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

if (directOrderForm) {
  directOrderForm.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.name === "advance_paid_cop") {
      renderDirectOrderLineItems();
      return;
    }

    if (shouldAutoCalculateDirectOrder(target)) {
      if (target.name === "purchase_type") {
        syncDirectOrderPurchaseTypeUi();
      }
      if (target.name === "uses_inventory_stock") {
        syncDirectOrderInventoryUi();
      }
      scheduleDirectOrderCalculation();
    }
  });

  directOrderForm.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.name === "purchase_type") {
      syncDirectOrderPurchaseTypeUi();
      renderDirectOrderLineItems();
    }
    if (target.name === "uses_inventory_stock") {
      syncDirectOrderInventoryUi();
    }
  });
}

saveButton.addEventListener("click", async () => {
  if (!state.lastResult && !state.quoteLineItems.length) {
    return;
  }

  saveButton.disabled = true;
  statusMessage.textContent = state.editingQuoteId
    ? "Actualizando cotizacion..."
    : "Guardando cotizacion...";

  try {
    const { quote, comesFromPending, updatedProduct } = await persistQuoteRecord();
    const successMessage = state.editingQuoteId
      ? `Cotizacion #${quote.id} actualizada${updatedProduct ? " y producto sincronizado." : "."}`
      : updatedProduct
        ? "Cotizacion guardada y producto sincronizado en el catalogo."
        : "Cotizacion guardada en la base de datos local.";
    if (comesFromPending) {
      statusMessage.textContent = state.editingQuoteId
        ? `Cotizacion #${quote.id} actualizada y vinculada al pendiente comercial.`
        : `Cotizacion #${quote.id} creada desde el pendiente comercial.`;
    } else {
      statusMessage.textContent = successMessage;
    }
    await Promise.all([loadHistory(), loadPendingRequests(), loadFollowup()]);
    await loadCatalog();
    await refreshActiveClientDetail();
    await refreshActiveProductDetail();
    resetQuoteComposerState({
      statusText: comesFromPending ? statusMessage.textContent : successMessage,
    });
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    syncSaveButtonState();
  }
});

if (createOrderButton) {
  createOrderButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!state.lastResult && !state.quoteLineItems.length) {
      statusMessage.textContent = "Calcula o agrega al menos un producto antes de crear la compra.";
      return;
    }

    let quoteDraft;
    try {
      quoteDraft = readQuoteSavePayload();
      ensureQuoteCanBeSaved(quoteDraft);
    } catch (error) {
      statusMessage.textContent = error.message;
      return;
    }

    const totals = summarizeQuoteItemsForTotals(quoteDraft.quote_items);
    let orderInputs;
    try {
      orderInputs = collectOrderCreationInputs({
        quoteItems: getQuoteItemsForPurchaseAdjustment(quoteDraft.quote_items),
        salePriceCop: totals.salePriceCop,
        quotedAdvanceCop: totals.advanceCop,
        sourceLabel: "compra",
      });
    } catch (error) {
      statusMessage.textContent = error.message;
      return;
    }

    if (!orderInputs) {
      statusMessage.textContent = "Creacion de compra cancelada.";
      return;
    }

    createOrderButton.disabled = true;
    saveButton.disabled = true;
    statusMessage.textContent = state.editingQuoteId
      ? "Actualizando cotizacion y creando compra..."
      : "Creando compra directa...";

    try {
      const { quote } = await persistQuoteRecord();
      statusMessage.textContent = "Cotizacion lista. Creando compra directa...";
      const payload = await requestJson("/api/orders/from-quote", {
        method: "POST",
        body: JSON.stringify({
          quote_id: Number(quote.id),
          advance_paid_cop: orderInputs.advancePaidCop,
          actual_purchase_prices: orderInputs.actualPurchasePrices,
        }),
      });
      await Promise.all([loadHistory(), loadOrders(), loadDashboard(), loadFollowup()]);
      await loadCatalog();
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      const successMessage = payload.existing
        ? "Esta cotizacion ya estaba convertida en compra."
        : "Compra creada desde el modulo comercial con anticipo y precio real confirmados.";
      resetQuoteComposerState({ statusText: successMessage });
      statusMessage.textContent = successMessage;
      window.location.hash = "compras";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      createOrderButton.disabled = false;
      syncSaveButtonState();
    }
  });
}

clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readClientPayload();
    const editingId = String(clientForm.elements.namedItem("id")?.value || "").trim();
    const isEditing = Boolean(editingId);
    const response = await requestJson(isEditing ? `/api/clients/${editingId}/update` : "/api/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetClientForm();
    await loadCatalog();
    if (!isEditing) {
      const client = state.clients.find((item) => item.id === response.item.id);
      if (client && client.is_active) {
        applyClientToQuote(client);
      }
    }
    await loadClientDetail(response.item.id);
    statusMessage.textContent = isEditing
      ? "Cliente actualizado."
      : "Cliente guardado y disponible para usar en la calculadora.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = readProductPayload();
    const editingId = String(productForm.elements.namedItem("id")?.value || "").trim();
    if (editingId) {
      const response = await requestJson(`/api/products/${editingId}/update`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      resetProductForm();
      await loadCatalog();
      await loadProductDetail(response.item.id);
      statusMessage.textContent = "Producto actualizado.";
      return;
    }
    const response = await requestJson("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetProductForm();
    await loadCatalog();
    const product = state.products.find((item) => item.id === response.item.id);
    applyProductToQuote(product || response.item);
    await loadProductDetail(response.item.id);
    statusMessage.textContent = "Producto guardado y precargado en la cotización.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

if (clientCancelButton) {
  clientCancelButton.addEventListener("click", () => {
    resetClientForm();
    statusMessage.textContent = "Edicion de cliente cancelada.";
  });
}

if (productCancelButton) {
  productCancelButton.addEventListener("click", () => {
    resetProductForm();
    statusMessage.textContent = "Edicion de producto cancelada.";
  });
}

if (productImageFileInput) {
  productImageFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setProductImageDataUrl(dataUrl);
      statusMessage.textContent = "Imagen del producto cargada en el formulario.";
    } catch (error) {
      statusMessage.textContent = error.message;
      event.target.value = "";
    }
  });
}

if (productImagePreview) {
  productImagePreview.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-clear-image-preview]");
    if (!clearButton) {
      return;
    }
    setProductImageDataUrl("");
    if (productImageFileInput) {
      productImageFileInput.value = "";
    }
    statusMessage.textContent = "Imagen del producto removida del formulario.";
  });
}

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

if (inventoryPurchaseProductSelect) {
  inventoryPurchaseProductSelect.addEventListener("change", () => {
    const product = findProductBySearchValue(inventoryPurchaseProductSelect.value);
    if (product) {
      applyProductToInventoryPurchaseSelection(product);
      statusMessage.textContent = "Producto aplicado al abastecimiento.";
      return;
    }
    clearInventoryPurchaseProductSelection();
  });
}

if (addInventoryPurchaseItemButton) {
  addInventoryPurchaseItemButton.addEventListener("click", () => {
    try {
      const item = addInventoryPurchaseDraftItem();
      statusMessage.textContent = `${item.product_name} agregado al abastecimiento.`;
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (inventoryPurchaseDraftContainer) {
  inventoryPurchaseDraftContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-inventory-purchase-remove]");
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.getAttribute("data-inventory-purchase-remove"));
    if (Number.isNaN(index)) {
      return;
    }

    state.inventoryPurchaseLineItems = state.inventoryPurchaseLineItems.filter(
      (_, itemIndex) => itemIndex !== index
    );
    renderInventoryPurchaseDraft();
    statusMessage.textContent = "Producto retirado del abastecimiento.";
  });
}

if (saveInventoryPurchaseButton) {
  saveInventoryPurchaseButton.addEventListener("click", async () => {
    try {
      const payload = readInventoryPurchasePayload();
      saveInventoryPurchaseButton.disabled = true;
      statusMessage.textContent = "Registrando abastecimiento...";
      const response = await requestJson("/api/inventory-purchases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      inventoryPurchaseForm.reset();
      inventoryPurchaseForm.elements.namedItem("purchase_date").value = toDateInputValue(new Date());
      inventoryPurchaseForm.elements.namedItem("item_quantity").value = 1;
      state.inventoryPurchaseLineItems = [];
      clearInventoryPurchaseProductSelection();
      renderInventoryPurchaseDraft();
      await Promise.all([
        loadInventoryPurchases(),
        loadCatalog(),
        loadExpenses(),
        loadDashboard(),
      ]);
      await refreshActiveProductDetail();
      statusMessage.textContent = `Abastecimiento #${response.item.id} registrado y reflejado como salida de dinero.`;
      window.location.hash = "abastecimiento";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      saveInventoryPurchaseButton.disabled = false;
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
    await Promise.all([loadOrders(), loadWhatsAppAdmin()]);
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
      const payload = readNamedCatalogPayload(productCategoryForm);
      const editingId = String(productCategoryForm.elements.namedItem("id")?.value || "").trim();
      await requestJson(editingId ? `/api/product-categories/${editingId}/update` : "/api/product-categories", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      resetProductCategoryForm();
      await loadCatalog();
      statusMessage.textContent = editingId ? "Categoria actualizada." : "Categoria agregada al catalogo.";
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
      const payload = readNamedCatalogPayload(productStoreForm);
      const editingId = String(productStoreForm.elements.namedItem("id")?.value || "").trim();
      await requestJson(editingId ? `/api/product-stores/${editingId}/update` : "/api/product-stores", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      resetProductStoreForm();
      await loadCatalog();
      statusMessage.textContent = editingId ? "Tienda actualizada." : "Tienda agregada al catalogo.";
      window.location.hash = "administracion";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (categoryCancelButton) {
  categoryCancelButton.addEventListener("click", () => {
    resetProductCategoryForm();
    statusMessage.textContent = "Edicion de categoria cancelada.";
  });
}

if (storeCancelButton) {
  storeCancelButton.addEventListener("click", () => {
    resetProductStoreForm();
    statusMessage.textContent = "Edicion de tienda cancelada.";
  });
}

if (whatsappSettingsForm) {
  whatsappSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = readWhatsAppSettingsPayload();
      await requestJson("/api/whatsapp/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadWhatsAppAdmin();
      statusMessage.textContent = "Configuracion de WhatsApp guardada.";
      window.location.hash = "administracion";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (whatsappTemplateForm) {
  whatsappTemplateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = readWhatsAppTemplatePayload();
      await requestJson("/api/whatsapp/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadWhatsAppAdmin();
      syncWhatsAppTemplateFormFromTrigger(payload.trigger_key);
      statusMessage.textContent = "Plantilla de WhatsApp guardada.";
      window.location.hash = "administracion";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  });
}

if (whatsappTriggerSelect) {
  whatsappTriggerSelect.addEventListener("change", () => {
    syncWhatsAppTemplateFormFromTrigger(whatsappTriggerSelect.value);
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

if (directOrderLineItemsContainer) {
  directOrderLineItemsContainer.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-direct-order-line]");
    if (editButton) {
      const index = Number(editButton.getAttribute("data-edit-direct-order-line"));
      if (Number.isNaN(index)) {
        return;
      }
      loadDirectOrderItemIntoCalculator(index);
      if (directOrderStatusMessage) {
        directOrderStatusMessage.textContent =
          "Producto cargado para editar dentro de la compra.";
      }
      return;
    }

    const removeButton = event.target.closest("[data-remove-direct-order-line]");
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.getAttribute("data-remove-direct-order-line"));
    if (Number.isNaN(index)) {
      return;
    }
    removeDirectOrderLineItem(index);
    if (directOrderStatusMessage) {
      directOrderStatusMessage.textContent = "Producto retirado de la compra.";
    }
  });
}

dashboardPeriodSelect.addEventListener("change", async () => {
  state.dashboardPeriod = dashboardPeriodSelect.value || "daily";
  await loadDashboard();
  if (state.clientDetailScope?.source === "dashboard") {
    await refreshActiveClientDetail();
  }
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
    const guidedQuoteRecord = state.quoteHistory.find((item) => String(item.id) === String(quoteId));
    const guidedQuoteItems = getQuoteItemsForPurchaseAdjustment(
      guidedQuoteRecord?.input?.quote_items && guidedQuoteRecord.input.quote_items.length
        ? guidedQuoteRecord.input.quote_items
        : guidedQuoteRecord
          ? [{ input: guidedQuoteRecord.input, result: guidedQuoteRecord.result }]
          : []
    );
    let guidedOrderInputs;
    try {
      guidedOrderInputs = collectOrderCreationInputs({
        quoteItems: guidedQuoteItems,
        salePriceCop: quoteTotal,
        quotedAdvanceCop: quotedAdvance,
        sourceLabel: "compra",
      });
    } catch (error) {
      statusMessage.textContent = error.message;
      return;
    }

    if (!guidedOrderInputs) {
      statusMessage.textContent = "CreaciÃ³n de compra cancelada.";
      return;
    }

    const guidedOriginalText = createOrderButton.textContent;
    createOrderButton.disabled = true;
    createOrderButton.textContent = "Creando compra...";

    try {
      const payload = await requestJson("/api/orders/from-quote", {
        method: "POST",
        body: JSON.stringify({
          quote_id: Number(quoteId),
          advance_paid_cop: guidedOrderInputs.advancePaidCop,
          actual_purchase_prices: guidedOrderInputs.actualPurchasePrices,
        }),
      });
      await Promise.all([loadHistory(), loadOrders(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = payload.existing
        ? "Esta cotizaciÃ³n ya estaba convertida en compra."
        : "Compra creada con anticipo y precio real de compra confirmados.";
      window.location.hash = "compras";
    } catch (error) {
      createOrderButton.textContent = "Error al crear";
      statusMessage.textContent = error.message;
      window.setTimeout(() => {
        createOrderButton.disabled = false;
        createOrderButton.textContent = guidedOriginalText;
      }, 1400);
      return;
    }
    return;

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
  const closeButton = event.target.closest("[data-close-inline-client-detail]");
  if (closeButton) {
    state.clientInlineDetailId = null;
    state.clientInlineDetail = null;
    renderClientsManaged(state.clients);
    return;
  }

  const useDetailButton = event.target.closest("[data-use-client-detail]");
  if (useDetailButton) {
    const clientId = useDetailButton.getAttribute("data-use-client-detail");
    const client = state.clients.find((item) => String(item.id) === String(clientId));
    if (!client) {
      statusMessage.textContent = "No fue posible cargar este cliente en la cotizacion.";
      return;
    }
    if (!client.is_active) {
      statusMessage.textContent = "Este cliente esta inactivo y no puede usarse en nuevas cotizaciones.";
      return;
    }

    applyClientToQuote(client);
    statusMessage.textContent = "Cliente cargado desde su ficha comercial.";
    window.location.hash = "cotizacion";
    return;
  }

  const viewButton = event.target.closest("[data-view-client]");
  if (viewButton) {
    const clientId = viewButton.getAttribute("data-view-client");
    if (!clientId) {
      return;
    }
    void toggleClientInlineDetail(clientId);
    return;
  }

  const editButton = event.target.closest("[data-edit-client]");
  if (editButton) {
    const client = state.clients.find(
      (item) => String(item.id) === editButton.getAttribute("data-edit-client")
    );
    if (!client) {
      return;
    }
    startClientEdit(client);
    window.location.hash = "administracion";
    openCollapsiblePanel("admin-clients");
    statusMessage.textContent = `Editando cliente ${client.name}.`;
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-client-active]");
  if (toggleButton) {
    const clientId = toggleButton.getAttribute("data-toggle-client-active");
    const nextActive = toggleButton.getAttribute("data-next-active") === "1";
    if (!clientId) {
      return;
    }
    requestJson(`/api/clients/${clientId}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active: nextActive }),
    })
      .then(async () => {
        await loadCatalog();
        await refreshActiveClientDetail();
        statusMessage.textContent = nextActive ? "Cliente reactivado." : "Cliente inactivado.";
      })
      .catch((error) => {
        statusMessage.textContent = error.message;
      });
    return;
  }

  const button = event.target.closest("[data-use-client]");
  if (!button) {
    return;
  }

  const client = state.clients.find((item) => String(item.id) === button.getAttribute("data-use-client"));
  if (client && client.is_active) {
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

    window.location.hash = "administracion";
    loadClientDetail(clientId, {
      source: "dashboard",
      periodKey: state.dashboardPeriod,
    });
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
  const closeButton = event.target.closest("[data-close-inline-product-detail]");
  if (closeButton) {
    state.productInlineDetailId = null;
    state.productInlineDetail = null;
    renderProductsManaged(state.products);
    return;
  }

  const useDetailButton = event.target.closest("[data-use-product-detail]");
  if (useDetailButton) {
    const productId = useDetailButton.getAttribute("data-use-product-detail");
    const product = state.products.find((item) => String(item.id) === String(productId));
    if (!product) {
      statusMessage.textContent = "No fue posible cargar este producto en la cotizacion.";
      return;
    }

    if (!product.is_active) {
      statusMessage.textContent = "Este producto esta inactivo y no puede usarse en nuevas cotizaciones.";
      return;
    }

    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado desde su ficha comercial.";
    window.location.hash = "cotizacion";
    return;
  }

  const viewButton = event.target.closest("[data-view-product]");
  if (viewButton) {
    const productId = viewButton.getAttribute("data-view-product");
    if (!productId) {
      return;
    }
    void toggleProductInlineDetail(productId);
    return;
  }

  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const product = state.products.find(
      (item) => String(item.id) === editButton.getAttribute("data-edit-product")
    );
    if (!product) {
      return;
    }
    startProductEdit(product);
    window.location.hash = "administracion";
    openCollapsiblePanel("admin-products");
    statusMessage.textContent = `Editando producto ${product.name}.`;
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-product-active]");
  if (toggleButton) {
    const productId = toggleButton.getAttribute("data-toggle-product-active");
    const nextActive = toggleButton.getAttribute("data-next-active") === "1";
    if (!productId) {
      return;
    }
    requestJson(`/api/products/${productId}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active: nextActive }),
    })
      .then(async () => {
        await loadCatalog();
        await refreshActiveProductDetail();
        statusMessage.textContent = nextActive ? "Producto reactivado." : "Producto inactivado.";
      })
      .catch((error) => {
        statusMessage.textContent = error.message;
      });
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
    if (!product.is_active) {
      statusMessage.textContent = "Este producto esta inactivo y no puede usarse en nuevas cotizaciones.";
      return;
    }

    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado desde el catálogo.";
  }
});

productsListContainer.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-product-inventory-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const productId = form.getAttribute("data-product-inventory-form");
  if (!productId) {
    statusMessage.textContent = "No fue posible identificar el producto para el inventario.";
    return;
  }

  const formData = new FormData(form);
  try {
    await requestJson(`/api/products/${encodeURIComponent(productId)}/inventory`, {
      method: "POST",
      body: JSON.stringify({
        movement_type: String(formData.get("movement_type") || "").trim(),
        quantity: Number(formData.get("quantity") || 0),
        note: String(formData.get("note") || "").trim(),
      }),
    });
    await loadCatalog();
    const payload = await requestJson(`/api/products/${encodeURIComponent(productId)}`);
    state.productInlineDetailId = String(productId);
    state.productInlineDetail = payload.item || null;
    renderProductsManaged(state.products);
    statusMessage.textContent = "Movimiento de inventario registrado.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

if (productCategoriesListContainer) {
  productCategoriesListContainer.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-product-category]");
    if (editButton) {
      const item = state.productCategories.find(
        (entry) => String(entry.id) === editButton.getAttribute("data-edit-product-category")
      );
      if (!item) {
        return;
      }
      startProductCategoryEdit(item);
      window.location.hash = "administracion";
      statusMessage.textContent = `Editando categoria ${item.name}.`;
      return;
    }

    const toggleButton = event.target.closest("[data-toggle-product-category-active]");
    if (!toggleButton) {
      return;
    }

    const categoryId = toggleButton.getAttribute("data-toggle-product-category-active");
    const nextActive = toggleButton.getAttribute("data-next-active") === "1";
    if (!categoryId) {
      return;
    }

    requestJson(`/api/product-categories/${categoryId}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active: nextActive }),
    })
      .then(async () => {
        await loadCatalog();
        statusMessage.textContent = nextActive ? "Categoria reactivada." : "Categoria inactivada.";
      })
      .catch((error) => {
        statusMessage.textContent = error.message;
      });
  });
}

if (productStoresListContainer) {
  productStoresListContainer.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-product-store]");
    if (editButton) {
      const item = state.productStores.find(
        (entry) => String(entry.id) === editButton.getAttribute("data-edit-product-store")
      );
      if (!item) {
        return;
      }
      startProductStoreEdit(item);
      window.location.hash = "administracion";
      statusMessage.textContent = `Editando tienda ${item.name}.`;
      return;
    }

    const toggleButton = event.target.closest("[data-toggle-product-store-active]");
    if (!toggleButton) {
      return;
    }

    const storeId = toggleButton.getAttribute("data-toggle-product-store-active");
    const nextActive = toggleButton.getAttribute("data-next-active") === "1";
    if (!storeId) {
      return;
    }

    requestJson(`/api/product-stores/${storeId}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active: nextActive }),
    })
      .then(async () => {
        await loadCatalog();
        statusMessage.textContent = nextActive ? "Tienda reactivada." : "Tienda inactivada.";
      })
      .catch((error) => {
        statusMessage.textContent = error.message;
      });
  });
}

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

    window.location.hash = "administracion";
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
  const viewOrderButton = event.target.closest("[data-view-order]");
  if (viewOrderButton) {
    const orderId = viewOrderButton.getAttribute("data-view-order");
    if (!orderId) {
      return;
    }
    state.activeOrderId =
      Number(state.activeOrderId) === Number(orderId) ? null : Number(orderId);
    renderOrders(state.orders);
    return;
  }

  const manageOrderButton = event.target.closest("[data-manage-order]");
  if (manageOrderButton) {
    const orderId = manageOrderButton.getAttribute("data-manage-order");
    if (!orderId) {
      return;
    }
    state.activeOrderId = Number(orderId);
    renderOrders(state.orders);
    return;
  }

  const sendWhatsAppButton = event.target.closest("[data-send-order-whatsapp]");
  if (sendWhatsAppButton) {
    const orderId = sendWhatsAppButton.getAttribute("data-send-order-whatsapp");
    const triggerKey = sendWhatsAppButton.getAttribute("data-order-whatsapp-trigger");
    if (!orderId) {
      return;
    }

    const originalText = sendWhatsAppButton.textContent;
    sendWhatsAppButton.disabled = true;
    sendWhatsAppButton.textContent = "Enviando...";

    try {
      const payload = await requestJson(`/api/orders/${orderId}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          trigger_key: triggerKey,
        }),
      });
      statusMessage.textContent =
        payload?.item?.status === "failed"
          ? payload.item.error_message || "La notificacion de WhatsApp fallo."
          : "Notificacion de WhatsApp enviada.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      sendWhatsAppButton.disabled = false;
      sendWhatsAppButton.textContent = originalText;
    }
    return;
  }

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

  const saveOrderEditButton = event.target.closest("[data-save-order-edit]");
  if (saveOrderEditButton) {
    const orderId = saveOrderEditButton.getAttribute("data-save-order-edit");
    if (!orderId) {
      return;
    }

    const exchangeRateInput = ordersListContainer.querySelector(
      `[data-order-edit-exchange-rate="${orderId}"]`
    );
    const advanceInput = ordersListContainer.querySelector(
      `[data-order-edit-advance="${orderId}"]`
    );
    const discountInput = ordersListContainer.querySelector(
      `[data-order-edit-discount="${orderId}"]`
    );
    const notesInput = ordersListContainer.querySelector(
      `[data-order-edit-notes="${orderId}"]`
    );
    const lineEditInputs = Array.from(
      ordersListContainer.querySelectorAll(`[data-order-edit-item="${orderId}"]`)
    );

    const exchangeRateCop = parseCurrencyInput(exchangeRateInput ? exchangeRateInput.value : "");
    if (exchangeRateCop === null || exchangeRateCop <= 0) {
      statusMessage.textContent = "Ingresa una TRM valida para actualizar la compra.";
      return;
    }

    const advancePaidCop = parseCurrencyInput(advanceInput ? advanceInput.value : "");
    if (advancePaidCop === null || advancePaidCop < 0) {
      statusMessage.textContent = "Ingresa un anticipo real valido.";
      return;
    }

    const generalDiscountCop = parseCurrencyInput(discountInput ? discountInput.value : "");
    if (generalDiscountCop === null || generalDiscountCop < 0) {
      statusMessage.textContent = "Ingresa un descuento general valido.";
      return;
    }

    const quoteItemUpdates = new Map();
    for (const input of lineEditInputs) {
      const rawValue = String(input.value || "").trim();
      if (!rawValue) {
        continue;
      }
      const fieldName = String(input.getAttribute("data-field") || "").trim();
      const quoteItemIndex = Number(input.getAttribute("data-quote-item-index") || 0);
      const mapKey = String(quoteItemIndex);
      const currentItem = quoteItemUpdates.get(mapKey) || {
        quote_item_index: quoteItemIndex,
        product_id: input.getAttribute("data-product-id") || null,
        product_name: input.getAttribute("data-product-name") || "",
      };

      let parsedValue = null;
      if (fieldName === "final_sale_price_cop") {
        parsedValue = parseCurrencyInput(rawValue);
        if (parsedValue === null || parsedValue <= 0) {
          statusMessage.textContent = "Revisa el precio final COP de la compra.";
          return;
        }
      } else {
        parsedValue = parseUsdInput(rawValue);
        if (!Number.isFinite(parsedValue) || parsedValue < 0) {
          statusMessage.textContent = "Revisa los valores ajustados por producto.";
          return;
        }
      }
      currentItem[fieldName] = parsedValue;
      quoteItemUpdates.set(mapKey, currentItem);
    }

    const originalText = saveOrderEditButton.textContent;
    saveOrderEditButton.disabled = true;
    saveOrderEditButton.textContent = "Guardando...";

    try {
      await requestJson(`/api/orders/${orderId}/edit`, {
        method: "POST",
        body: JSON.stringify({
          exchange_rate_cop: exchangeRateCop,
          advance_paid_cop: advancePaidCop,
          general_discount_cop: generalDiscountCop,
          notes: String(notesInput?.value || "").trim(),
          quote_item_updates: Array.from(quoteItemUpdates.values()),
        }),
      });
      await Promise.all([loadOrders(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = "Compra actualizada con los datos corregidos.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      saveOrderEditButton.disabled = false;
      saveOrderEditButton.textContent = originalText;
    }
    return;
  }

  const invalidateOrderButton = event.target.closest("[data-invalidate-order]");
  if (invalidateOrderButton) {
    const orderId = invalidateOrderButton.getAttribute("data-invalidate-order");
    if (!orderId) {
      return;
    }
    const reason = window.prompt(
      "Cuéntame brevemente por qué vas a invalidar esta compra.",
      "Compra invalidada por novedad extraordinaria."
    );
    if (reason === null) {
      return;
    }
    if (!String(reason).trim()) {
      statusMessage.textContent = "Escribe un motivo para invalidar la compra.";
      return;
    }

    const originalText = invalidateOrderButton.textContent;
    invalidateOrderButton.disabled = true;
    invalidateOrderButton.textContent = "Invalidando...";

    try {
      await requestJson(`/api/orders/${orderId}/invalidate`, {
        method: "POST",
        body: JSON.stringify({ reason: String(reason).trim() }),
      });
      await Promise.all([loadOrders(), loadHistory(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = "Compra invalidada y retirada del operativo.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      invalidateOrderButton.disabled = false;
      invalidateOrderButton.textContent = originalText;
    }
    return;
  }

  const deleteOrderButton = event.target.closest("[data-delete-order]");
  if (deleteOrderButton) {
    const orderId = deleteOrderButton.getAttribute("data-delete-order");
    if (!orderId) {
      return;
    }
    const confirmed = window.confirm(
      "Esta accion sacara la compra del operativo. Antes de hacerlo, quedara archivada internamente. ¿Deseas continuar?"
    );
    if (!confirmed) {
      return;
    }
    const reason = window.prompt(
      "Escribe el motivo de esta eliminacion extraordinaria.",
      "Compra eliminada por novedad extraordinaria."
    );
    if (reason === null) {
      return;
    }
    if (!String(reason).trim()) {
      statusMessage.textContent = "Escribe un motivo para eliminar la compra.";
      return;
    }

    const originalText = deleteOrderButton.textContent;
    deleteOrderButton.disabled = true;
    deleteOrderButton.textContent = "Eliminando...";

    try {
      await requestJson(`/api/orders/${orderId}/delete`, {
        method: "POST",
        body: JSON.stringify({ reason: String(reason).trim() }),
      });
      await Promise.all([loadOrders(), loadHistory(), loadDashboard(), loadFollowup()]);
      await refreshActiveClientDetail();
      await refreshActiveProductDetail();
      statusMessage.textContent = "Compra eliminada del operativo y archivada internamente.";
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      deleteOrderButton.disabled = false;
      deleteOrderButton.textContent = originalText;
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

ordersListContainer.addEventListener("change", async (event) => {
  const imageInput = event.target.closest("[data-order-image-input]");
  if (!imageInput) {
    return;
  }

  const orderId = imageInput.getAttribute("data-order-image-input");
  const file = imageInput.files?.[0];
  if (!orderId || !file) {
    return;
  }

  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    await requestJson(`/api/orders/${orderId}/image`, {
      method: "POST",
      body: JSON.stringify({ image_data_url: imageDataUrl }),
    });
    await Promise.all([loadOrders(), loadDashboard()]);
    await refreshActiveClientDetail();
    await refreshActiveProductDetail();
    statusMessage.textContent = "Imagen de la compra actualizada.";
  } catch (error) {
    statusMessage.textContent = error.message;
    imageInput.value = "";
  }
});

if (clientDetailClearButton) {
  clientDetailClearButton.addEventListener("click", () => {
    state.clientDetail = null;
    state.clientDetailScope = null;
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
    if (!client.is_active) {
      statusMessage.textContent = "Este cliente esta inactivo y no puede usarse en nuevas cotizaciones.";
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

    if (!product.is_active) {
      statusMessage.textContent = "Este producto esta inactivo y no puede usarse en nuevas cotizaciones.";
      return;
    }

    applyProductToQuote(product);
    statusMessage.textContent = "Producto cargado desde su ficha comercial.";
    window.location.hash = "cotizacion";
  });

  productDetailContainer.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-product-inventory-form]");
    if (!form) {
      return;
    }

    event.preventDefault();
    const productId = form.getAttribute("data-product-inventory-form");
    if (!productId) {
      statusMessage.textContent = "No fue posible identificar el producto para el inventario.";
      return;
    }

    const formData = new FormData(form);
    try {
      await requestJson(`/api/products/${encodeURIComponent(productId)}/inventory`, {
        method: "POST",
        body: JSON.stringify({
          movement_type: String(formData.get("movement_type") || "").trim(),
          quantity: Number(formData.get("quantity") || 0),
          note: String(formData.get("note") || "").trim(),
        }),
      });
      await Promise.all([loadCatalog(), loadProductDetail(productId, { shouldScroll: false })]);
      statusMessage.textContent = "Movimiento de inventario registrado.";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
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
      getItems: () => getActiveClients(),
      getLabel: clientSearchLabel,
      getSearchText: clientSearchLabel,
      onSelect: (client) => {
        applyClientToQuote(client);
        statusMessage.textContent = "Cliente aplicado a la cotizacion.";
      },
      emptyMessage: "No hay clientes con esas letras",
    }),
    createAutocompleteController(directOrderClientSelect, {
      getItems: () => getActiveClients(),
      getLabel: clientSearchLabel,
      getSearchText: clientSearchLabel,
      onSelect: (client) => {
        applyClientToDirectOrder(client);
        if (directOrderStatusMessage) {
          directOrderStatusMessage.textContent = "Cliente aplicado a la compra directa.";
        }
      },
      emptyMessage: "No hay clientes con esas letras",
    }),
    createAutocompleteController(productSelect, {
      getItems: () => getActiveProducts(),
      getLabel: productSearchLabel,
      getSearchText: productSearchLabel,
      onSelect: (product) => {
        applyProductToQuote(product);
        statusMessage.textContent = "Producto cargado en la calculadora.";
      },
      emptyMessage: "No hay productos con esas letras",
    }),
    createAutocompleteController(directOrderProductSelect, {
      getItems: () => getActiveProducts(),
      getLabel: productSearchLabel,
      getSearchText: productSearchLabel,
      onSelect: (product) => {
        loadProductIntoDirectOrderCalculator(product);
        if (directOrderStatusMessage) {
          directOrderStatusMessage.textContent = "Producto cargado en la compra directa.";
        }
      },
      emptyMessage: "No hay productos con esas letras",
    }),
    createAutocompleteController(inventoryPurchaseProductSelect, {
      getItems: () => getActiveProducts(),
      getLabel: productSearchLabel,
      getSearchText: productSearchLabel,
      onSelect: (product) => {
        applyProductToInventoryPurchaseSelection(product);
        statusMessage.textContent = "Producto aplicado al abastecimiento.";
      },
      emptyMessage: "No hay productos con esas letras",
    }),
    createAutocompleteController(productCategoryInput, {
      getItems: () => getActiveProductCategories(),
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        productCategoryInput.value = item.name;
      },
      emptyMessage: "No hay categorias con esas letras",
    }),
    createAutocompleteController(productStoreInput, {
      getItems: () => getActiveProductStores(),
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        productStoreInput.value = item.name;
      },
      emptyMessage: "No hay tiendas con esas letras",
    }),
    createAutocompleteController(pendingClientSelect, {
      getItems: () => getActiveClients(),
      getLabel: clientSearchLabel,
      getSearchText: clientSearchLabel,
      onSelect: (client) => {
        applyClientToPending(client);
        statusMessage.textContent = "Cliente aplicado al pendiente.";
      },
      emptyMessage: "No hay clientes con esas letras",
    }),
    createAutocompleteController(pendingCategoryInput, {
      getItems: () => getActiveProductCategories(),
      getLabel: (item) => item.name,
      getSearchText: (item) => item.name,
      onSelect: (item) => {
        pendingCategoryInput.value = item.name;
      },
      emptyMessage: "No hay categorias con esas letras",
    }),
    createAutocompleteController(pendingStoreInput, {
      getItems: () => getActiveProductStores(),
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
  resetDirectOrderComposerState();
  resetQuoteEditingState();
  renderQuoteLineItems();
  renderQuoteLiveSummary();
  renderInventoryPurchaseDraft();
  resetClientForm();
  resetProductForm();
  resetProductCategoryForm();
  resetProductStoreForm();
  syncClientViewButtons();
  syncCollapsiblePanels();
  setupAutocomplete();
  await loadSession();
  state.dashboardPeriod = dashboardPeriodSelect.value || "daily";
  if (expenseForm) {
    expenseForm.elements.namedItem("expense_date").value = toDateInputValue(new Date());
  }
  if (inventoryPurchaseForm) {
    inventoryPurchaseForm.elements.namedItem("purchase_date").value = toDateInputValue(new Date());
    inventoryPurchaseForm.elements.namedItem("item_quantity").value = 1;
  }
  await Promise.all([
    loadCatalog(),
    loadHistory(),
    loadPendingRequests(),
    loadInventoryPurchases(),
    loadOrders(),
    loadWhatsAppAdmin(),
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

if (copyPublicRegistrationUrlButton) {
  copyPublicRegistrationUrlButton.addEventListener("click", async () => {
    const value = publicRegistrationUrlInput?.value || "";
    if (!value) {
      statusMessage.textContent = "No encontramos el enlace publico de registro para esta empresa.";
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      statusMessage.textContent = "Enlace publico copiado. Ya puedes compartirlo con tus clientes.";
      window.location.hash = "administracion";
    } catch (_error) {
      statusMessage.textContent = "No fue posible copiar el enlace publico en este navegador.";
    }
  });
}

clientViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setClientCatalogView(button.getAttribute("data-client-view") || "list");
  });
});

[
  [clientsListSearchInput, "clients"],
  [productsListSearchInput, "products"],
  [productCategoriesSearchInput, "categories"],
  [productStoresSearchInput, "stores"],
].forEach(([input, filterKey]) => {
  if (!input) {
    return;
  }
  input.addEventListener("input", () => {
    state.adminFilters[filterKey] = input.value || "";
    refreshAdminCatalogViews();
  });
});

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-collapsible-target]");
  if (!toggleButton) {
    return;
  }

  const panelKey = toggleButton.getAttribute("data-collapsible-target");
  if (!panelKey) {
    return;
  }

  const currentValue = Object.prototype.hasOwnProperty.call(state.collapsiblePanels, panelKey)
    ? Boolean(state.collapsiblePanels[panelKey])
    : getCollapsibleDefaultOpen(panelKey);
  state.collapsiblePanels[panelKey] = !currentValue;
  applyCollapsiblePanel(panelKey);
});

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
