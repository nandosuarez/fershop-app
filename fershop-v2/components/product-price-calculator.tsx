"use client";

import { useMemo, useRef, useState, useEffect } from "react";

import { FormattedNumberInput } from "@/components/formatted-number-input";
import { formatCop } from "@/lib/commerce";
import {
  calculateMarginPercent,
  calculateProductPrice,
} from "@/lib/price-calculation";
import type { Product } from "@/lib/types";

interface ProductPriceCalculatorProps {
  product: Product;
  onClose: () => void;
  onUpdated: (product: Product) => void;
}

interface ApiErrorPayload {
  message?: string;
}

export function ProductPriceCalculator({
  product,
  onClose,
  onUpdated,
}: ProductPriceCalculatorProps) {
  const savedCalculation = product.pricingCalculation;
  const initialTrm = savedCalculation?.exchangeRateCop ?? 3800;
  const initialTax = savedCalculation?.taxPercent ?? 7;
  const initialPurchaseUsd =
    savedCalculation?.purchasePriceUsd ??
    (product.costCop
      ? Number((product.costCop / initialTrm / (1 + initialTax / 100)).toFixed(2))
      : 0);
  const initialShippingUsd =
    savedCalculation?.shippingUsd ??
    (product.shippingCostCop
      ? Number((product.shippingCostCop / initialTrm).toFixed(2))
      : 0);
  const initialTotalCost = (product.costCop ?? 0) + (product.shippingCostCop ?? 0);
  const initialMargin =
    savedCalculation?.marginPercent ??
    (initialTotalCost > 0 && product.priceCop > initialTotalCost
      ? Number(((1 - initialTotalCost / product.priceCop) * 100).toFixed(2))
      : 30);

  const [purchasePriceUsd, setPurchasePriceUsd] = useState(initialPurchaseUsd);
  const [taxPercent, setTaxPercent] = useState(initialTax);
  const [shippingUsd, setShippingUsd] = useState(initialShippingUsd);
  const [exchangeRateCop, setExchangeRateCop] = useState(initialTrm);
  const [marginPercent, setMarginPercent] = useState(initialMargin);
  const [finalSalePriceCop, setFinalSalePriceCop] = useState(product.priceCop);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialCalculation = useRef(true);
  const skipNextSuggestedPriceSync = useRef(false);

  const calculation = useMemo(() => {
    return calculateProductPrice({
      purchasePriceUsd,
      taxPercent,
      shippingUsd,
      exchangeRateCop,
      marginPercent,
    });
  }, [exchangeRateCop, marginPercent, purchasePriceUsd, shippingUsd, taxPercent]);

  useEffect(() => {
    if (isInitialCalculation.current) {
      isInitialCalculation.current = false;
      return;
    }
    if (skipNextSuggestedPriceSync.current) {
      skipNextSuggestedPriceSync.current = false;
      return;
    }
    setFinalSalePriceCop(calculation.suggestedSalePriceCop);
  }, [calculation.suggestedSalePriceCop]);

  const profitCop = finalSalePriceCop - calculation.totalCostCop;

  function updateFinalSalePrice(nextPriceCop: number) {
    const normalizedPrice = Math.max(0, nextPriceCop || 0);
    setFinalSalePriceCop(normalizedPrice);

    if (normalizedPrice <= 0 || calculation.totalCostCop <= 0) {
      return;
    }

    const calculatedMargin = calculateMarginPercent(
      calculation.totalCostCop,
      normalizedPrice
    );
    if (Math.abs(calculatedMargin - marginPercent) > 0.001) {
      skipNextSuggestedPriceSync.current = true;
      setMarginPercent(calculatedMargin);
    }
  }

  async function handleSubmit() {
    if (purchasePriceUsd <= 0) {
      setError("Escribe el precio de compra en USD.");
      return;
    }
    if (exchangeRateCop <= 0) {
      setError("Escribe la TRM.");
      return;
    }
    if (finalSalePriceCop <= 0) {
      setError("El precio de venta debe ser mayor a cero.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePriceUsd,
          taxPercent,
          shippingUsd,
          exchangeRateCop,
          marginPercent,
          finalSalePriceCop,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos actualizar el producto.");
      }
      const payload = (await response.json()) as { product: Product };
      onUpdated(payload.product);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos actualizar el producto.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="order-modal-backdrop" role="presentation">
      <form
        className="order-modal pricing-calculator-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-calculator-title"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="order-modal__header">
          <div>
            <h2 id="pricing-calculator-title">Calculadora de precio</h2>
            <small>{product.name}</small>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="pricing-calculator-body">
          <section className="pricing-calculator-inputs">
            <div className="pricing-input-grid">
              <label className="product-form-field product-form-field--wide">
                <span>Precio de compra USD</span>
                <span className="calculator-currency-input">
                  <span>US$</span>
                  <FormattedNumberInput
                    autoFocus
                    min={0}
                    maxFractionDigits={2}
                    value={purchasePriceUsd}
                    placeholder="0.00"
                    onValueChange={setPurchasePriceUsd}
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>Impuesto USA</span>
                <span className="calculator-currency-input">
                  <FormattedNumberInput
                    min={0}
                    max={100}
                    maxFractionDigits={2}
                    emptyWhenZero={false}
                    value={taxPercent}
                    onValueChange={setTaxPercent}
                  />
                  <span>%</span>
                </span>
              </label>

              <label className="product-form-field">
                <span>Envio USD</span>
                <span className="calculator-currency-input">
                  <span>US$</span>
                  <FormattedNumberInput
                    min={0}
                    maxFractionDigits={2}
                    value={shippingUsd}
                    placeholder="0.00"
                    onValueChange={setShippingUsd}
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>TRM</span>
                <span className="calculator-currency-input">
                  <span>$</span>
                  <FormattedNumberInput
                    min={1}
                    value={exchangeRateCop}
                    onValueChange={setExchangeRateCop}
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>Margen</span>
                <span className="calculator-currency-input">
                  <FormattedNumberInput
                    max={99.9}
                    maxFractionDigits={2}
                    allowNegative
                    emptyWhenZero={false}
                    value={marginPercent}
                    onValueChange={setMarginPercent}
                  />
                  <span>%</span>
                </span>
              </label>
            </div>

            <div className="calculator-presets">
              <span>Margen rapido</span>
              {[25, 30, 35].map((value) => (
                <button type="button" key={value} onClick={() => setMarginPercent(value)}>
                  {value}%
                </button>
              ))}
            </div>
          </section>

          <section className="pricing-calculator-results">
            <div className="calculator-result-lines">
              <div>
                <span>Costo del producto</span>
                <strong>{formatCop(calculation.productCostCop)}</strong>
              </div>
              <div>
                <span>Costo de envio</span>
                <strong>{formatCop(calculation.shippingCostCop)}</strong>
              </div>
              <div className="calculator-result-total">
                <span>Costo total</span>
                <strong>{formatCop(calculation.totalCostCop)}</strong>
              </div>
            </div>

            <label className="calculator-final-price">
              <span>Precio de venta</span>
              <span className="product-money-input">
                <span>$</span>
                <FormattedNumberInput
                  min={1}
                  value={finalSalePriceCop}
                  onValueChange={updateFinalSalePrice}
                />
              </span>
            </label>

            <div className="calculator-profit">
              <span>Utilidad estimada</span>
              <strong>{formatCop(profitCop)}</strong>
            </div>

            {error ? <p className="order-form-error" role="alert">{error}</p> : null}
          </section>
        </div>

        <div className="order-modal__footer">
          <span />
          <div>
            <button type="button" className="ops-button" disabled={isSaving} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="ops-button ops-button--primary" disabled={isSaving}>
              {isSaving ? "Actualizando..." : "Aplicar y actualizar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
