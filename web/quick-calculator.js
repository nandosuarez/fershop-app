const quickCalculatorForm = document.getElementById("quick-calculator-form");
const quickSuggestedValue = document.getElementById("quick-calc-suggested");
const quickProfitValue = document.getElementById("quick-calc-profit");
const quickTotalUsdValue = document.getElementById("quick-calc-total-usd");
const quickTotalCopValue = document.getElementById("quick-calc-total-cop");

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

function quickNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderQuickCalculator() {
  if (!quickCalculatorForm) {
    return;
  }

  const formData = new FormData(quickCalculatorForm);
  const priceUsd = Math.max(0, quickNumber(formData.get("price_usd")));
  const shippingUsd = Math.max(0, quickNumber(formData.get("shipping_usd")));
  const exchangeRateCop = Math.max(0, quickNumber(formData.get("exchange_rate_cop")));
  const marginPercent = Math.min(99, Math.max(0, quickNumber(formData.get("margin_percent"))));
  const marginRate = marginPercent / 100;
  const totalUsd = priceUsd + shippingUsd;
  const baseCop = totalUsd * exchangeRateCop;
  const suggestedCop = marginRate >= 1 ? baseCop : baseCop / (1 - marginRate);
  const profitCop = suggestedCop - baseCop;

  if (quickSuggestedValue) {
    quickSuggestedValue.textContent = quickCopFormatter.format(suggestedCop);
  }
  if (quickProfitValue) {
    quickProfitValue.textContent = `Utilidad: ${quickCopFormatter.format(profitCop)}`;
  }
  if (quickTotalUsdValue) {
    quickTotalUsdValue.textContent = quickUsdFormatter.format(totalUsd);
  }
  if (quickTotalCopValue) {
    quickTotalCopValue.textContent = quickCopFormatter.format(baseCop);
  }
}

if (quickCalculatorForm) {
  quickCalculatorForm.addEventListener("input", renderQuickCalculator);
  renderQuickCalculator();
}
