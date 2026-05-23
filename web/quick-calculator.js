const quickCalculatorForm = document.getElementById("quick-calculator-form");
const quickSuggestedValue = document.getElementById("quick-calc-suggested");
const quickProfitValue = document.getElementById("quick-calc-profit");
const quickTotalUsdValue = document.getElementById("quick-calc-total-usd");
const quickTotalCopValue = document.getElementById("quick-calc-total-cop");
const quickTaxUsdValue = document.getElementById("quick-calc-tax-usd");
const quickTaxedUsdValue = document.getElementById("quick-calc-taxed-usd");
const quickMarginLabel = document.getElementById("quick-calc-margin-label");
const quickCostCopValue = document.getElementById("quick-calc-cost-cop");
const quickProfitCopValue = document.getElementById("quick-calc-profit-cop");
const quickStatusNode = document.getElementById("quick-calc-status");
const quickCopyButton = document.getElementById("quick-calc-copy");
const quickResetButton = document.getElementById("quick-calc-reset");
const quickPresetButtons = Array.from(document.querySelectorAll("[data-quick-set][data-quick-value]"));

const QUICK_TAX_RATE = 0.07;
const QUICK_STORAGE_KEY = "fershop_quick_calculator_v1";
const QUICK_DEFAULTS = {
  price_usd: "",
  shipping_usd: "8",
  exchange_rate_cop: "3800",
  margin_percent: "30",
};

let quickLastSuggestedCop = 0;

const quickCopFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const quickUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function quickToNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quickSetStatus(message, tone = "info") {
  if (!quickStatusNode) {
    return;
  }
  quickStatusNode.textContent = String(message || "");
  quickStatusNode.classList.remove("is-success", "is-error");
  if (tone === "success") {
    quickStatusNode.classList.add("is-success");
  } else if (tone === "error") {
    quickStatusNode.classList.add("is-error");
  }
}

function quickPersistForm() {
  if (!quickCalculatorForm) {
    return;
  }
  try {
    const data = new FormData(quickCalculatorForm);
    const payload = {
      price_usd: String(data.get("price_usd") ?? "").trim(),
      shipping_usd: String(data.get("shipping_usd") ?? "").trim(),
      exchange_rate_cop: String(data.get("exchange_rate_cop") ?? "").trim(),
      margin_percent: String(data.get("margin_percent") ?? "").trim(),
    };
    window.localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage errors in private mode or restricted browsers.
  }
}

function quickHydrateForm() {
  if (!quickCalculatorForm) {
    return;
  }
  let payload = null;
  try {
    const raw = window.localStorage.getItem(QUICK_STORAGE_KEY);
    if (raw) {
      payload = JSON.parse(raw);
    }
  } catch (_error) {
    payload = null;
  }

  const fields = {
    price_usd: quickCalculatorForm.elements.namedItem("price_usd"),
    shipping_usd: quickCalculatorForm.elements.namedItem("shipping_usd"),
    exchange_rate_cop: quickCalculatorForm.elements.namedItem("exchange_rate_cop"),
    margin_percent: quickCalculatorForm.elements.namedItem("margin_percent"),
  };

  Object.entries(fields).forEach(([name, field]) => {
    if (!(field instanceof HTMLInputElement)) {
      return;
    }
    const storedValue =
      payload && typeof payload[name] === "string" && payload[name].trim()
        ? payload[name].trim()
        : QUICK_DEFAULTS[name];
    field.value = storedValue;
  });
}

function quickRender() {
  if (!quickCalculatorForm) {
    return;
  }

  const formData = new FormData(quickCalculatorForm);
  const priceUsd = Math.max(0, quickToNumber(formData.get("price_usd")));
  const shippingUsd = Math.max(0, quickToNumber(formData.get("shipping_usd")));
  const exchangeRateCop = Math.max(1, quickToNumber(formData.get("exchange_rate_cop")));
  const marginPercent = Math.min(99, Math.max(0, quickToNumber(formData.get("margin_percent"))));
  const marginRate = marginPercent / 100;
  const taxUsd = priceUsd * QUICK_TAX_RATE;
  const taxedPriceUsd = priceUsd + taxUsd;
  const totalUsd = taxedPriceUsd + shippingUsd;
  const baseCop = totalUsd * exchangeRateCop;
  const suggestedCop = baseCop / (1 - marginRate);
  const profitCop = suggestedCop - baseCop;

  quickLastSuggestedCop = suggestedCop;

  if (quickSuggestedValue) {
    quickSuggestedValue.textContent = quickCopFormatter.format(suggestedCop);
  }
  if (quickProfitValue) {
    quickProfitValue.textContent = `Utilidad: ${quickCopFormatter.format(profitCop)}`;
  }
  if (quickTaxedUsdValue) {
    quickTaxedUsdValue.textContent = quickUsdFormatter.format(taxedPriceUsd);
  }
  if (quickTaxUsdValue) {
    quickTaxUsdValue.textContent = quickUsdFormatter.format(taxUsd);
  }
  if (quickTotalUsdValue) {
    quickTotalUsdValue.textContent = quickUsdFormatter.format(totalUsd);
  }
  if (quickTotalCopValue) {
    quickTotalCopValue.textContent = quickCopFormatter.format(baseCop);
  }
  if (quickMarginLabel) {
    quickMarginLabel.textContent = `${marginPercent.toFixed(1).replace(/\.0$/, "")}%`;
  }
  if (quickCostCopValue) {
    quickCostCopValue.textContent = quickCopFormatter.format(baseCop);
  }
  if (quickProfitCopValue) {
    quickProfitCopValue.textContent = quickCopFormatter.format(profitCop);
  }
}

function quickApplyPreset(fieldName, value) {
  if (!quickCalculatorForm) {
    return;
  }
  const field = quickCalculatorForm.elements.namedItem(fieldName);
  if (!(field instanceof HTMLInputElement)) {
    return;
  }
  field.value = String(value);
  quickPersistForm();
  quickRender();
}

async function quickCopySuggestedPrice() {
  if (!quickLastSuggestedCop || quickLastSuggestedCop <= 0) {
    quickSetStatus("Calcula un valor primero para poder copiarlo.", "error");
    return;
  }
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    quickSetStatus("Este navegador no permite copiar automaticamente.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(quickCopFormatter.format(quickLastSuggestedCop));
    quickSetStatus("Precio sugerido copiado al portapapeles.", "success");
  } catch (_error) {
    quickSetStatus("No se pudo copiar el valor en este navegador.", "error");
  }
}

function quickReset() {
  if (!quickCalculatorForm) {
    return;
  }
  const fields = {
    price_usd: quickCalculatorForm.elements.namedItem("price_usd"),
    shipping_usd: quickCalculatorForm.elements.namedItem("shipping_usd"),
    exchange_rate_cop: quickCalculatorForm.elements.namedItem("exchange_rate_cop"),
    margin_percent: quickCalculatorForm.elements.namedItem("margin_percent"),
  };

  Object.entries(fields).forEach(([name, field]) => {
    if (field instanceof HTMLInputElement) {
      field.value = QUICK_DEFAULTS[name];
    }
  });

  quickPersistForm();
  quickRender();
  quickSetStatus("Valores reiniciados.", "success");
}

if (quickCalculatorForm) {
  quickHydrateForm();
  quickRender();
  quickSetStatus("Listo para calcular.");

  quickCalculatorForm.addEventListener("input", () => {
    quickPersistForm();
    quickRender();
  });

  quickPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const fieldName = button.getAttribute("data-quick-set");
      const value = button.getAttribute("data-quick-value");
      if (!fieldName || value === null) {
        return;
      }
      quickApplyPreset(fieldName, value);
      quickSetStatus(`Aplicado: ${button.textContent?.trim() || "valor rapido"}.`, "success");
    });
  });

  if (quickCopyButton) {
    quickCopyButton.addEventListener("click", () => {
      quickCopySuggestedPrice();
    });
  }

  if (quickResetButton) {
    quickResetButton.addEventListener("click", quickReset);
  }
}
