"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatCop } from "@/lib/commerce";
import {
  calculateMarginPercent,
  calculateProductPrice,
} from "@/lib/price-calculation";

const defaultExchangeRateCop = 3800;
const defaultTaxPercent = 7;
const defaultMarginPercent = 30;

export function StandalonePriceCalculator() {
  const [purchasePriceUsd, setPurchasePriceUsd] = useState(0);
  const [taxPercent, setTaxPercent] = useState(defaultTaxPercent);
  const [shippingUsd, setShippingUsd] = useState(0);
  const [exchangeRateCop, setExchangeRateCop] = useState(defaultExchangeRateCop);
  const [marginPercent, setMarginPercent] = useState(defaultMarginPercent);
  const [finalSalePriceCop, setFinalSalePriceCop] = useState(0);
  const isInitialCalculation = useRef(true);
  const skipNextSuggestedPriceSync = useRef(false);

  const calculation = useMemo(
    () =>
      calculateProductPrice({
        purchasePriceUsd,
        taxPercent,
        shippingUsd,
        exchangeRateCop,
        marginPercent,
      }),
    [exchangeRateCop, marginPercent, purchasePriceUsd, shippingUsd, taxPercent]
  );

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
    const nextMargin = calculateMarginPercent(calculation.totalCostCop, normalizedPrice);
    if (Math.abs(nextMargin - marginPercent) > 0.001) {
      skipNextSuggestedPriceSync.current = true;
      setMarginPercent(nextMargin);
    }
  }

  function resetCalculator() {
    isInitialCalculation.current = true;
    skipNextSuggestedPriceSync.current = false;
    setPurchasePriceUsd(0);
    setTaxPercent(defaultTaxPercent);
    setShippingUsd(0);
    setExchangeRateCop(defaultExchangeRateCop);
    setMarginPercent(defaultMarginPercent);
    setFinalSalePriceCop(0);
  }

  return (
    <main className="ops-page calculator-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">Precios</p>
          <h1>Calculadora</h1>
        </div>
        <button type="button" className="ops-button" onClick={resetCalculator}>
          Limpiar
        </button>
      </div>

      <section className="ops-card calculator-page-card">
        <div className="pricing-calculator-body calculator-page-body">
          <section className="pricing-calculator-inputs">
            <div className="pricing-input-grid">
              <label className="product-form-field product-form-field--wide">
                <span>Precio de compra USD</span>
                <span className="calculator-currency-input">
                  <span>US$</span>
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    step="0.01"
                    value={purchasePriceUsd || ""}
                    placeholder="0.00"
                    onChange={(event) =>
                      setPurchasePriceUsd(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>Impuesto USA</span>
                <span className="calculator-currency-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxPercent}
                    onChange={(event) =>
                      setTaxPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                    }
                  />
                  <span>%</span>
                </span>
              </label>

              <label className="product-form-field">
                <span>Envio USD</span>
                <span className="calculator-currency-input">
                  <span>US$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={shippingUsd || ""}
                    placeholder="0.00"
                    onChange={(event) =>
                      setShippingUsd(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>TRM</span>
                <span className="calculator-currency-input">
                  <span>$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={exchangeRateCop || ""}
                    onChange={(event) =>
                      setExchangeRateCop(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </span>
              </label>

              <label className="product-form-field">
                <span>Margen</span>
                <span className="calculator-currency-input">
                  <input
                    type="number"
                    max={99.9}
                    step="0.01"
                    value={marginPercent}
                    onChange={(event) => setMarginPercent(Number(event.target.value) || 0)}
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
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={finalSalePriceCop || ""}
                  placeholder="0"
                  onChange={(event) => updateFinalSalePrice(Number(event.target.value))}
                />
              </span>
            </label>

            <div className="calculator-profit">
              <span>Utilidad estimada</span>
              <strong>{formatCop(profitCop)}</strong>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
