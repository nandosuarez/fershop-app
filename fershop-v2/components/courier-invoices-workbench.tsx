"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FormattedNumberInput } from "@/components/formatted-number-input";
import { ListSearch } from "@/components/list-search";
import { formatCop } from "@/lib/commerce";
import {
  allocateCourierPayment,
  convertCourierPayment,
  roundUsd,
  type CourierPayableItem,
} from "@/lib/courier-payment";
import { matchesSearch } from "@/lib/search";
import type {
  CourierCharge,
  CourierGuide,
  CourierInvoice,
  CourierInvoicePreview,
  CourierInvoiceSnapshot,
  CourierPaymentCurrency,
  GeneralCourierPaymentResult,
} from "@/lib/types";

interface CourierInvoicesWorkbenchProps {
  initialSnapshot: CourierInvoiceSnapshot;
  initialInvoiceId?: string;
}

interface ApiErrorPayload {
  message?: string;
}

type StatusFilter = "all" | "receipt_pending" | "payment_pending" | "complete";
type DetailAction = "receipt" | "payment" | null;

const formatUsd = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTodayInColombia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(date: string) {
  const value = date.includes("T") ? new Date(date) : new Date(`${date}T12:00:00-05:00`);
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(value);
}

function getInvoiceTotalUsd(invoice: CourierInvoice) {
  return roundMoney(
    invoice.guides.reduce((sum, guide) => sum + guide.amountUsd, 0) +
      invoice.charges.reduce((sum, charge) => sum + charge.amountUsd, 0)
  );
}

function getGuidePaidUsd(invoice: CourierInvoice, guideId: string) {
  return roundMoney(
    invoice.payments.reduce(
      (sum, payment) =>
        sum + payment.allocations
          .filter((allocation) => allocation.guideId === guideId)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amountUsd, 0),
      0
    )
  );
}

function getChargePaidUsd(invoice: CourierInvoice, chargeId: string) {
  return roundMoney(
    invoice.payments.reduce(
      (sum, payment) =>
        sum + payment.allocations
          .filter((allocation) => allocation.chargeId === chargeId)
          .reduce((allocationSum, allocation) => allocationSum + allocation.amountUsd, 0),
      0
    )
  );
}

function getInvoicePaidUsd(invoice: CourierInvoice) {
  return roundMoney(invoice.payments.reduce((sum, payment) => sum + payment.amountUsd, 0));
}

function getCalculatedPreviewTotal(preview: CourierInvoicePreview) {
  return roundMoney(
    preview.guides.reduce((sum, guide) => sum + Number(guide.amountUsd || 0), 0) +
      preview.charges.reduce((sum, charge) => sum + Number(charge.amountUsd || 0), 0)
  );
}

function getPendingPayables(invoice: CourierInvoice) {
  const items: CourierPayableItem[] = [];
  invoice.guides.forEach((guide, index) => {
    const pendingUsd = roundUsd(guide.amountUsd - getGuidePaidUsd(invoice, guide.id));
    if (pendingUsd > 0) {
      items.push({
        invoiceId: invoice.id,
        invoiceDate: invoice.invoiceDate,
        invoiceCreatedAtIso: invoice.createdAtIso,
        itemId: guide.id,
        itemType: "guide",
        itemOrder: index,
        pendingUsd,
      });
    }
  });
  invoice.charges.forEach((charge, index) => {
    const pendingUsd = roundUsd(charge.amountUsd - getChargePaidUsd(invoice, charge.id));
    if (pendingUsd > 0) {
      items.push({
        invoiceId: invoice.id,
        invoiceDate: invoice.invoiceDate,
        invoiceCreatedAtIso: invoice.createdAtIso,
        itemId: charge.id,
        itemType: "charge",
        itemOrder: invoice.guides.length + index,
        pendingUsd,
      });
    }
  });
  return items;
}

function tryConvertPayment(
  currency: CourierPaymentCurrency,
  amount: number,
  exchangeRateCop: number
) {
  try {
    return convertCourierPayment(currency, amount, exchangeRateCop);
  } catch {
    return null;
  }
}

export function CourierInvoicesWorkbench({
  initialSnapshot,
  initialInvoiceId,
}: CourierInvoicesWorkbenchProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    initialInvoiceId && initialSnapshot.invoices.some((invoice) => invoice.id === initialInvoiceId)
      ? initialInvoiceId
      : null
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CourierInvoicePreview | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [detailAction, setDetailAction] = useState<DetailAction>(null);
  const [actionDate, setActionDate] = useState(getTodayInColombia);
  const [actionNote, setActionNote] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState<CourierPaymentCurrency>("COP");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentExchangeRate, setPaymentExchangeRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Zelle");
  const [paymentReference, setPaymentReference] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isGeneralPaymentOpen, setIsGeneralPaymentOpen] = useState(false);
  const [generalPaymentCurrency, setGeneralPaymentCurrency] =
    useState<CourierPaymentCurrency>("COP");
  const [generalPaymentAmount, setGeneralPaymentAmount] = useState(0);
  const [generalPaymentExchangeRate, setGeneralPaymentExchangeRate] = useState(0);
  const [generalPaymentDate, setGeneralPaymentDate] = useState(getTodayInColombia);
  const [generalPaymentMethod, setGeneralPaymentMethod] = useState("Transferencia");
  const [generalPaymentReference, setGeneralPaymentReference] = useState("");
  const [generalPaymentError, setGeneralPaymentError] = useState<string | null>(null);
  const [isGeneralPaymentSaving, setIsGeneralPaymentSaving] = useState(false);
  const detailActionRef = useRef<HTMLDivElement>(null);

  const selectedInvoice = useMemo(
    () => snapshot.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [selectedInvoiceId, snapshot.invoices]
  );
  const filteredInvoices = useMemo(
    () =>
      snapshot.invoices.filter((invoice) => {
        const totalUsd = getInvoiceTotalUsd(invoice);
        const paidUsd = getInvoicePaidUsd(invoice);
        const receiptComplete = invoice.guides.every((guide) => guide.receivedAtIso);
        const paymentComplete = paidUsd >= totalUsd - 0.02;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "receipt_pending" && !receiptComplete) ||
          (statusFilter === "payment_pending" && !paymentComplete) ||
          (statusFilter === "complete" && receiptComplete && paymentComplete);
        return (
          matchesStatus &&
          matchesSearch(search, [
            invoice.courierName,
            invoice.invoiceNumber,
            invoice.invoiceDate,
            invoice.billedTo,
            ...invoice.guides.map((guide) => guide.guideNumber),
          ])
        );
      }),
    [search, snapshot.invoices, statusFilter]
  );
  const selectedPaymentUsd = selectedInvoice
    ? roundMoney(
        selectedInvoice.guides
          .filter((guide) => selectedGuideIds.includes(guide.id))
          .reduce(
            (sum, guide) => sum + Math.max(guide.amountUsd - getGuidePaidUsd(selectedInvoice, guide.id), 0),
            0
          ) +
          selectedInvoice.charges
            .filter((charge) => selectedChargeIds.includes(charge.id))
            .reduce(
              (sum, charge) => sum + Math.max(charge.amountUsd - getChargePaidUsd(selectedInvoice, charge.id), 0),
              0
            )
      )
    : 0;
  const selectedPendingReceiptCount = selectedInvoice
    ? selectedInvoice.guides.filter(
        (guide) => selectedGuideIds.includes(guide.id) && !guide.receivedAtIso
      ).length
    : 0;
  const selectedPendingPaymentCount = selectedInvoice
    ? selectedInvoice.guides.filter(
        (guide) =>
          selectedGuideIds.includes(guide.id) &&
          getGuidePaidUsd(selectedInvoice, guide.id) < guide.amountUsd - 0.02
      ).length +
      selectedInvoice.charges.filter(
        (charge) =>
          selectedChargeIds.includes(charge.id) &&
          getChargePaidUsd(selectedInvoice, charge.id) < charge.amountUsd - 0.02
      ).length
    : 0;
  const selectedPaymentAmounts = tryConvertPayment(
    paymentCurrency,
    paymentAmount,
    paymentExchangeRate
  );
  const allPendingPayables = useMemo(
    () => snapshot.invoices.flatMap((invoice) => getPendingPayables(invoice)),
    [snapshot.invoices]
  );
  const generalPaymentAmounts = tryConvertPayment(
    generalPaymentCurrency,
    generalPaymentAmount,
    generalPaymentExchangeRate
  );
  const generalPaymentAllocations = useMemo(() => {
    if (!generalPaymentAmounts) return [];
    try {
      return allocateCourierPayment(allPendingPayables, generalPaymentAmounts.amountUsd);
    } catch {
      return [];
    }
  }, [allPendingPayables, generalPaymentAmounts]);

  useEffect(() => {
    if (detailAction) {
      detailActionRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [detailAction]);

  function resetImport() {
    setInvoiceFile(null);
    setPreview(null);
    setImportError(null);
    setIsReading(false);
    setIsSaving(false);
  }

  function closeImport() {
    if (!isReading && !isSaving) {
      setIsImportOpen(false);
      resetImport();
    }
  }

  function openInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setSelectedGuideIds([]);
    setSelectedChargeIds([]);
    setDetailAction(null);
    setDetailError(null);
    setActionDate(getTodayInColombia());
    setActionNote("");
    setPaymentAmount(0);
    setPaymentExchangeRate(0);
    setPaymentReference("");
  }

  async function analyzePdf() {
    if (!invoiceFile) {
      setImportError("Selecciona la factura PDF.");
      return;
    }
    setIsReading(true);
    setImportError(null);
    try {
      const body = new FormData();
      body.append("file", invoiceFile);
      const response = await fetch("/api/courier-invoices/preview", { method: "POST", body });
      const payload = (await response.json()) as { preview?: CourierInvoicePreview; message?: string };
      if (!response.ok || !payload.preview) {
        throw new Error(payload.message || "No pudimos analizar la factura.");
      }
      setPreview(payload.preview);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "No pudimos analizar la factura.");
    } finally {
      setIsReading(false);
    }
  }

  async function saveInvoice() {
    if (!invoiceFile || !preview) {
      return;
    }
    const calculatedTotalUsd = getCalculatedPreviewTotal(preview);
    if (Math.abs(calculatedTotalUsd - Number(preview.declaredTotalUsd || 0)) > 0.02) {
      setImportError(`El total debe coincidir con las lineas: ${formatUsd.format(calculatedTotalUsd)}.`);
      return;
    }
    setIsSaving(true);
    setImportError(null);
    try {
      const body = new FormData();
      body.append("file", invoiceFile);
      body.append("invoice", JSON.stringify({ ...preview, calculatedTotalUsd }));
      const response = await fetch("/api/courier-invoices", { method: "POST", body });
      const payload = (await response.json()) as {
        snapshot?: CourierInvoiceSnapshot;
        invoice?: CourierInvoice;
        message?: string;
      };
      if (!response.ok || !payload.snapshot || !payload.invoice) {
        throw new Error(payload.message || "No pudimos guardar la factura.");
      }
      setSnapshot(payload.snapshot);
      setFeedback(`Factura ${payload.invoice.invoiceNumber} importada con ${payload.invoice.guides.length} guias.`);
      setIsImportOpen(false);
      resetImport();
      openInvoice(payload.invoice.id);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "No pudimos guardar la factura.");
    } finally {
      setIsSaving(false);
    }
  }

  function updatePreviewGuide(index: number, field: keyof CourierInvoicePreview["guides"][number], value: string) {
    setPreview((current) => {
      if (!current) return current;
      const guides = current.guides.map((guide, guideIndex) =>
        guideIndex === index
          ? { ...guide, [field]: field === "guideNumber" ? value : Number(value) }
          : guide
      );
      return { ...current, guides, calculatedTotalUsd: getCalculatedPreviewTotal({ ...current, guides }) };
    });
  }

  function updatePreviewCharge(index: number, field: keyof CourierInvoicePreview["charges"][number], value: string) {
    setPreview((current) => {
      if (!current) return current;
      const charges = current.charges.map((charge, chargeIndex) =>
        chargeIndex === index
          ? { ...charge, [field]: field === "description" ? value : Number(value) }
          : charge
      );
      return { ...current, charges, calculatedTotalUsd: getCalculatedPreviewTotal({ ...current, charges }) };
    });
  }

  function toggleGuide(guideId: string) {
    setSelectedGuideIds((current) =>
      current.includes(guideId) ? current.filter((id) => id !== guideId) : [...current, guideId]
    );
  }

  function toggleCharge(chargeId: string) {
    setSelectedChargeIds((current) =>
      current.includes(chargeId) ? current.filter((id) => id !== chargeId) : [...current, chargeId]
    );
  }

  function openReceiptAction() {
    if (!selectedPendingReceiptCount) {
      setDetailError("Selecciona al menos una caja pendiente de recibir.");
      return;
    }
    setDetailAction("receipt");
    setDetailError(null);
  }

  function openPaymentAction() {
    if (!selectedPendingPaymentCount) {
      setDetailError("Selecciona cajas o cargos pendientes de pago.");
      return;
    }
    setPaymentAmount(0);
    setPaymentExchangeRate(0);
    setDetailAction("payment");
    setDetailError(null);
  }

  function selectPendingReceipt() {
    if (!selectedInvoice) return;
    setSelectedGuideIds(selectedInvoice.guides.filter((guide) => !guide.receivedAtIso).map((guide) => guide.id));
    setSelectedChargeIds([]);
    setDetailAction("receipt");
    setDetailError(null);
  }

  function selectPendingPayment() {
    if (!selectedInvoice) return;
    setSelectedGuideIds(
      selectedInvoice.guides
        .filter((guide) => getGuidePaidUsd(selectedInvoice, guide.id) < guide.amountUsd - 0.02)
        .map((guide) => guide.id)
    );
    setSelectedChargeIds(
      selectedInvoice.charges
        .filter((charge) => getChargePaidUsd(selectedInvoice, charge.id) < charge.amountUsd - 0.02)
        .map((charge) => charge.id)
    );
    setPaymentAmount(0);
    setPaymentExchangeRate(0);
    setDetailAction("payment");
    setDetailError(null);
  }

  async function submitReceipt() {
    if (!selectedInvoice) return;
    const guideIds = selectedInvoice.guides
      .filter((guide) => selectedGuideIds.includes(guide.id) && !guide.receivedAtIso)
      .map((guide) => guide.id);
    if (!guideIds.length) {
      setDetailError("Selecciona al menos una guia pendiente de recibir.");
      return;
    }
    setIsUpdating(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/courier-invoices/${encodeURIComponent(selectedInvoice.id)}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideIds, receivedDate: actionDate, note: actionNote }),
      });
      const payload = (await response.json()) as { snapshot?: CourierInvoiceSnapshot; message?: string };
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.message || "No pudimos registrar la recepcion.");
      }
      setSnapshot(payload.snapshot);
      setFeedback(`${guideIds.length} caja${guideIds.length === 1 ? "" : "s"} marcada${guideIds.length === 1 ? "" : "s"} como recibida${guideIds.length === 1 ? "" : "s"}.`);
      setSelectedGuideIds([]);
      setDetailAction(null);
      setActionNote("");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "No pudimos registrar la recepcion.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function submitPayment() {
    if (!selectedInvoice) return;
    const guideIds = selectedInvoice.guides
      .filter(
        (guide) =>
          selectedGuideIds.includes(guide.id) && getGuidePaidUsd(selectedInvoice, guide.id) < guide.amountUsd - 0.02
      )
      .map((guide) => guide.id);
    const chargeIds = selectedInvoice.charges
      .filter(
        (charge) =>
          selectedChargeIds.includes(charge.id) && getChargePaidUsd(selectedInvoice, charge.id) < charge.amountUsd - 0.02
      )
      .map((charge) => charge.id);
    if (!guideIds.length && !chargeIds.length) {
      setDetailError("Selecciona guias o cargos pendientes de pago.");
      return;
    }
    if (!selectedPaymentAmounts) {
      setDetailError("Escribe el valor del abono y una tasa valida.");
      return;
    }
    if (selectedPaymentAmounts.amountUsd > selectedPaymentUsd + 0.001) {
      setDetailError("El abono supera el saldo pendiente de los elementos seleccionados.");
      return;
    }
    setIsUpdating(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/courier-invoices/${encodeURIComponent(selectedInvoice.id)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideIds,
          chargeIds,
          paymentCurrency,
          amount: paymentAmount,
          exchangeRateCop: paymentExchangeRate,
          paymentDate: actionDate,
          method: paymentMethod,
          reference: paymentReference,
        }),
      });
      const payload = (await response.json()) as { snapshot?: CourierInvoiceSnapshot; message?: string };
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.message || "No pudimos registrar el pago.");
      }
      setSnapshot(payload.snapshot);
      setFeedback(
        `Abono de ${formatUsd.format(selectedPaymentAmounts.amountUsd)} registrado y distribuido en lo seleccionado.`
      );
      setSelectedGuideIds([]);
      setSelectedChargeIds([]);
      setDetailAction(null);
      setPaymentAmount(0);
      setPaymentExchangeRate(0);
      setPaymentReference("");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "No pudimos registrar el pago.");
    } finally {
      setIsUpdating(false);
    }
  }

  function openGeneralPayment() {
    setGeneralPaymentCurrency("COP");
    setGeneralPaymentAmount(0);
    setGeneralPaymentExchangeRate(0);
    setGeneralPaymentDate(getTodayInColombia());
    setGeneralPaymentMethod("Transferencia");
    setGeneralPaymentReference("");
    setGeneralPaymentError(null);
    setIsGeneralPaymentOpen(true);
  }

  async function submitGeneralPayment() {
    if (!generalPaymentAmounts) {
      setGeneralPaymentError("Escribe el valor del abono y una tasa valida.");
      return;
    }
    if (generalPaymentAmounts.amountUsd > snapshot.metrics.pendingPaymentUsd + 0.001) {
      setGeneralPaymentError("El abono supera el saldo total pendiente de las cajas.");
      return;
    }
    if (!generalPaymentAllocations.length) {
      setGeneralPaymentError("No encontramos saldos para distribuir este abono.");
      return;
    }
    setIsGeneralPaymentSaving(true);
    setGeneralPaymentError(null);
    try {
      const response = await fetch("/api/courier-invoices/payments/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentCurrency: generalPaymentCurrency,
          amount: generalPaymentAmount,
          exchangeRateCop: generalPaymentExchangeRate,
          paymentDate: generalPaymentDate,
          method: generalPaymentMethod,
          reference: generalPaymentReference,
        }),
      });
      const payload = (await response.json()) as {
        snapshot?: CourierInvoiceSnapshot;
        result?: GeneralCourierPaymentResult;
        message?: string;
      };
      if (!response.ok || !payload.snapshot || !payload.result) {
        throw new Error(payload.message || "No pudimos registrar el abono general.");
      }
      setSnapshot(payload.snapshot);
      setFeedback(
        `Abono general de ${formatUsd.format(payload.result.amountUsd)} distribuido en ${payload.result.allocatedItems} caja${payload.result.allocatedItems === 1 ? "" : "s"} o cargo${payload.result.allocatedItems === 1 ? "" : "s"}.`
      );
      setIsGeneralPaymentOpen(false);
    } catch (error) {
      setGeneralPaymentError(
        error instanceof Error ? error.message : "No pudimos registrar el abono general."
      );
    } finally {
      setIsGeneralPaymentSaving(false);
    }
  }

  return (
    <>
      <main className="ops-page courier-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">Logistica internacional</p>
            <h1>Cajas / Courier</h1>
          </div>
          <div className="courier-header-actions">
            <button
              type="button"
              className="ops-button"
              disabled={snapshot.metrics.pendingPaymentUsd <= 0}
              onClick={openGeneralPayment}
            >
              Abono general
            </button>
            <button
              type="button"
              className="ops-button ops-button--primary"
              onClick={() => {
                resetImport();
                setIsImportOpen(true);
              }}
            >
              <span aria-hidden="true">+</span> Importar factura PDF
            </button>
          </div>
        </div>

        {feedback ? <p className="ops-success-notice" role="status">{feedback}</p> : null}

        <section className="courier-summary-grid" aria-label="Resumen de cajas y courier">
          <article className="ops-card courier-summary-card">
            <span>Facturas</span><strong>{snapshot.metrics.totalInvoices}</strong><small>{snapshot.metrics.totalGuides} guias registradas</small>
          </article>
          <article className="ops-card courier-summary-card">
            <span>Peso acumulado</span><strong>{snapshot.metrics.totalWeightLb.toLocaleString("es-CO")} lb</strong><small>Carga facturada</small>
          </article>
          <article className="ops-card courier-summary-card courier-summary-card--warning">
            <span>Pendientes por recibir</span><strong>{snapshot.metrics.pendingReceiptGuides}</strong><small>{snapshot.metrics.receivedGuides} cajas recibidas</small>
          </article>
          <article className="ops-card courier-summary-card courier-summary-card--money">
            <span>Pendiente por pagar</span><strong>{formatUsd.format(snapshot.metrics.pendingPaymentUsd)}</strong><small>Pagado: {formatCop(snapshot.metrics.paidCop)}</small>
          </article>
        </section>

        <section className="ops-card ops-table-card courier-invoice-list">
          <div className="ops-card__header">
            <div><h2>Facturas importadas</h2><span>{filteredInvoices.length} resultado{filteredInvoices.length === 1 ? "" : "s"}</span></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filtrar por estado">
              <option value="all">Todos los estados</option>
              <option value="receipt_pending">Pendientes por recibir</option>
              <option value="payment_pending">Pendientes por pagar</option>
              <option value="complete">Completadas</option>
            </select>
          </div>
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar factura, courier, cliente o VIL"
            resultLabel={`${filteredInvoices.length} resultado${filteredInvoices.length === 1 ? "" : "s"}`}
          />
          {filteredInvoices.length ? (
            <div className="ops-table-scroll">
              <table className="ops-table courier-invoice-table">
                <thead><tr><th>Fecha / factura</th><th>Courier</th><th>Cajas</th><th>Peso</th><th>Total</th><th>Recepcion</th><th>Pago</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const received = invoice.guides.filter((guide) => guide.receivedAtIso).length;
                    const totalUsd = getInvoiceTotalUsd(invoice);
                    const paidUsd = getInvoicePaidUsd(invoice);
                    return (
                      <tr key={invoice.id}>
                        <td><strong>#{invoice.invoiceNumber}</strong><small>{formatDate(invoice.invoiceDate)}</small></td>
                        <td><strong>{invoice.courierName}</strong>{invoice.billedTo ? <small>{invoice.billedTo}</small> : null}</td>
                        <td>{invoice.guides.length}</td>
                        <td>{invoice.guides.reduce((sum, guide) => sum + guide.weightLb, 0).toLocaleString("es-CO")} lb</td>
                        <td><strong>{formatUsd.format(totalUsd)}</strong></td>
                        <td><span className={received === invoice.guides.length ? "courier-badge is-complete" : "courier-badge is-pending"}>{received}/{invoice.guides.length}</span></td>
                        <td><span className={paidUsd >= totalUsd - 0.02 ? "courier-badge is-complete" : "courier-badge is-pending"}>{paidUsd >= totalUsd - 0.02 ? "Pagada" : `${formatUsd.format(totalUsd - paidUsd)} pendiente`}</span></td>
                        <td><button type="button" className="ops-button ops-button--compact" onClick={() => openInvoice(invoice.id)}>Ver detalle</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="courier-empty-state">
              <strong>{snapshot.invoices.length ? "No encontramos facturas" : "Aun no hay facturas de courier"}</strong>
              <span>{snapshot.invoices.length ? "Prueba otro termino o estado." : "Importa el primer PDF para comenzar el control de las cajas."}</span>
            </div>
          )}
        </section>
      </main>

      {isImportOpen ? (
        <div className="order-modal-backdrop courier-modal-backdrop" role="presentation">
          <form
            className="order-modal courier-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="courier-import-title"
            onSubmit={(event) => { event.preventDefault(); void (preview ? saveInvoice() : analyzePdf()); }}
          >
            <div className="order-modal__header">
              <div><h2 id="courier-import-title">Importar factura del courier</h2><small>El PDF se conserva junto con los datos extraidos.</small></div>
              <button type="button" aria-label="Cerrar" onClick={closeImport}>&times;</button>
            </div>
            <div className="courier-import-body">
              {!preview ? (
                <label className="courier-upload-zone">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => {
                      setInvoiceFile(event.target.files?.[0] ?? null);
                      setImportError(null);
                    }}
                  />
                  <span className="courier-upload-zone__icon">PDF</span>
                  <strong>{invoiceFile?.name ?? "Selecciona la factura PDF"}</strong>
                  <small>Maximo 10 MB. Primero mostraremos una vista previa para confirmar.</small>
                </label>
              ) : (
                <>
                  <div className="courier-preview-heading">
                    <div><span>Archivo analizado</span><strong>{invoiceFile?.name}</strong></div>
                    <button type="button" className="ops-button ops-button--compact" onClick={() => setPreview(null)}>Cambiar PDF</button>
                  </div>
                  {preview.warnings.length ? (
                    <div className="courier-warning-list">{preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
                  ) : (
                    <p className="courier-parser-success">Lectura completada. Confirma los datos antes de guardar.</p>
                  )}
                  <div className="courier-preview-fields">
                    <label><span>Courier</span><input value={preview.courierName} onChange={(event) => setPreview({ ...preview, courierName: event.target.value })} /></label>
                    <label><span>Factura</span><input value={preview.invoiceNumber} onChange={(event) => setPreview({ ...preview, invoiceNumber: event.target.value })} /></label>
                    <label><span>Fecha</span><input type="date" value={preview.invoiceDate} onChange={(event) => setPreview({ ...preview, invoiceDate: event.target.value })} /></label>
                    <label><span>Facturado a</span><input value={preview.billedTo ?? ""} onChange={(event) => setPreview({ ...preview, billedTo: event.target.value })} /></label>
                  </div>
                  <div className="courier-preview-section">
                    <div className="courier-preview-section__title"><strong>Guias detectadas</strong><button type="button" onClick={() => setPreview({ ...preview, guides: [...preview.guides, { guideNumber: "VIL", weightLb: 0, rateUsd: 0, amountUsd: 0 }] })}>+ Agregar guia</button></div>
                    <div className="courier-preview-table-wrap">
                      <table className="courier-preview-table"><thead><tr><th>VIL</th><th>Peso lb</th><th>Tarifa USD</th><th>Valor USD</th><th /></tr></thead><tbody>
                        {preview.guides.map((guide, index) => (
                          <tr key={`${guide.guideNumber}-${index}`}>
                            <td><input value={guide.guideNumber} onChange={(event) => updatePreviewGuide(index, "guideNumber", event.target.value)} /></td>
                            <td><input type="number" min="0" step="0.01" value={guide.weightLb} onChange={(event) => updatePreviewGuide(index, "weightLb", event.target.value)} /></td>
                            <td><input type="number" min="0" step="0.01" value={guide.rateUsd} onChange={(event) => updatePreviewGuide(index, "rateUsd", event.target.value)} /></td>
                            <td><input type="number" min="0" step="0.01" value={guide.amountUsd} onChange={(event) => updatePreviewGuide(index, "amountUsd", event.target.value)} /></td>
                            <td><button type="button" aria-label={`Eliminar ${guide.guideNumber}`} onClick={() => setPreview({ ...preview, guides: preview.guides.filter((_, guideIndex) => guideIndex !== index) })}>&times;</button></td>
                          </tr>
                        ))}
                      </tbody></table>
                    </div>
                  </div>
                  <div className="courier-preview-section">
                    <div className="courier-preview-section__title"><strong>Cargos adicionales</strong><button type="button" onClick={() => setPreview({ ...preview, charges: [...preview.charges, { description: "", amountUsd: 0 }] })}>+ Agregar cargo</button></div>
                    {preview.charges.length ? preview.charges.map((charge, index) => (
                      <div className="courier-charge-editor" key={`${charge.description}-${index}`}>
                        <input value={charge.description} placeholder="Ej. Seguro" onChange={(event) => updatePreviewCharge(index, "description", event.target.value)} />
                        <input type="number" min="0" step="0.01" value={charge.amountUsd} onChange={(event) => updatePreviewCharge(index, "amountUsd", event.target.value)} />
                        <button type="button" aria-label={`Eliminar ${charge.description}`} onClick={() => setPreview({ ...preview, charges: preview.charges.filter((_, chargeIndex) => chargeIndex !== index) })}>&times;</button>
                      </div>
                    )) : <p className="courier-no-charges">La factura no tiene cargos adicionales.</p>}
                  </div>
                  <div className="courier-preview-totals">
                    <div><span>Suma de lineas</span><strong>{formatUsd.format(getCalculatedPreviewTotal(preview))}</strong></div>
                    <label><span>Total declarado</span><span className="courier-usd-input">US$ <input type="number" min="0" step="0.01" value={preview.declaredTotalUsd} onChange={(event) => setPreview({ ...preview, declaredTotalUsd: Number(event.target.value) })} /></span></label>
                  </div>
                </>
              )}
              {importError ? <p className="order-form-error" role="alert">{importError}</p> : null}
            </div>
            <div className="order-modal__footer">
              <span>{preview ? `${preview.guides.length} guia${preview.guides.length === 1 ? "" : "s"} lista${preview.guides.length === 1 ? "" : "s"} para importar` : "Revisaremos cada columna del documento"}</span>
              <div><button type="button" className="ops-button" disabled={isReading || isSaving} onClick={closeImport}>Cancelar</button><button type="submit" className="ops-button ops-button--primary" disabled={isReading || isSaving || !invoiceFile}>{isReading ? "Analizando..." : isSaving ? "Guardando..." : preview ? "Guardar factura" : "Analizar PDF"}</button></div>
            </div>
          </form>
        </div>
      ) : null}

      {isGeneralPaymentOpen ? (
        <div className="order-modal-backdrop courier-modal-backdrop" role="presentation">
          <form
            className="order-modal courier-general-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="courier-general-payment-title"
            onSubmit={(event) => {
              event.preventDefault();
              void submitGeneralPayment();
            }}
          >
            <div className="order-modal__header">
              <div>
                <p className="ops-kicker">Distribucion automatica</p>
                <h2 id="courier-general-payment-title">Registrar abono general</h2>
                <small>Se aplicara desde la factura mas antigua, sin importar si la caja ya fue recibida.</small>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                disabled={isGeneralPaymentSaving}
                onClick={() => setIsGeneralPaymentOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="courier-general-payment-body">
              <div className="courier-general-payment-summary">
                <div>
                  <span>Saldo total pendiente</span>
                  <strong>{formatUsd.format(snapshot.metrics.pendingPaymentUsd)}</strong>
                </div>
                <small>{allPendingPayables.length} cajas o cargos con saldo</small>
              </div>

              <div className="courier-general-payment-fields">
                <label>
                  <span>Moneda del pago</span>
                  <select
                    value={generalPaymentCurrency}
                    onChange={(event) => {
                      setGeneralPaymentCurrency(event.target.value as CourierPaymentCurrency);
                      setGeneralPaymentAmount(0);
                      setGeneralPaymentError(null);
                    }}
                  >
                    <option value="COP">Pesos colombianos</option>
                    <option value="USD">Dolares</option>
                  </select>
                </label>
                <label>
                  <span>
                    {generalPaymentCurrency === "USD" ? "Valor abonado en USD" : "Valor abonado en COP"}
                  </span>
                  <span className="product-money-input">
                    <span>{generalPaymentCurrency === "USD" ? "US$" : "$"}</span>
                    <FormattedNumberInput
                      min={generalPaymentCurrency === "USD" ? 0.01 : 1}
                      maxFractionDigits={generalPaymentCurrency === "USD" ? 2 : 0}
                      value={generalPaymentAmount}
                      onValueChange={(value) => {
                        setGeneralPaymentAmount(value);
                        setGeneralPaymentError(null);
                      }}
                    />
                  </span>
                </label>
                <label>
                  <span>Tasa COP por USD</span>
                  <span className="product-money-input">
                    <span>$</span>
                    <FormattedNumberInput
                      min={1}
                      maxFractionDigits={2}
                      value={generalPaymentExchangeRate}
                      onValueChange={(value) => {
                        setGeneralPaymentExchangeRate(value);
                        setGeneralPaymentError(null);
                      }}
                    />
                  </span>
                </label>
                <label>
                  <span>Fecha de pago</span>
                  <input
                    type="date"
                    value={generalPaymentDate}
                    onChange={(event) => setGeneralPaymentDate(event.target.value)}
                  />
                </label>
                <label>
                  <span>Metodo</span>
                  <input
                    list="courier-general-payment-methods"
                    value={generalPaymentMethod}
                    onChange={(event) => setGeneralPaymentMethod(event.target.value)}
                  />
                  <datalist id="courier-general-payment-methods">
                    <option value="Zelle" />
                    <option value="Bancolombia" />
                    <option value="Transferencia" />
                    <option value="Efectivo" />
                  </datalist>
                </label>
                <label>
                  <span>Referencia opcional</span>
                  <input
                    value={generalPaymentReference}
                    onChange={(event) => setGeneralPaymentReference(event.target.value)}
                  />
                </label>
              </div>

              <div className="courier-general-conversion">
                <span>Este abono representa</span>
                <strong>{formatUsd.format(generalPaymentAmounts?.amountUsd ?? 0)}</strong>
                <small>{formatCop(generalPaymentAmounts?.amountCop ?? 0)}</small>
              </div>

              <section className="courier-general-preview">
                <div className="courier-preview-section__title">
                  <strong>Vista previa de la distribucion</strong>
                  <span>
                    {generalPaymentAllocations.length} caja
                    {generalPaymentAllocations.length === 1 ? "" : "s"} o cargo
                    {generalPaymentAllocations.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="courier-general-preview-list">
                  {generalPaymentAllocations.length ? (
                    generalPaymentAllocations.map((allocation, index) => {
                      const invoice = snapshot.invoices.find(
                        (candidate) => candidate.id === allocation.invoiceId
                      );
                      const guide = invoice?.guides.find(
                        (candidate) => candidate.id === allocation.itemId
                      );
                      const charge = invoice?.charges.find(
                        (candidate) => candidate.id === allocation.itemId
                      );
                      return (
                        <div key={`${allocation.invoiceId}-${allocation.itemId}`}>
                          <span className="courier-general-preview-index">{index + 1}</span>
                          <div>
                            <strong>{guide?.guideNumber ?? charge?.description ?? "Cargo"}</strong>
                            <small>
                              Factura #{invoice?.invoiceNumber ?? "-"} · {formatDate(allocation.invoiceDate)}
                              {guide?.receivedAtIso ? " · Recibida" : guide ? " · Sin recibir" : ""}
                            </small>
                          </div>
                          <div>
                            <span>Se aplica</span>
                            <strong>{formatUsd.format(allocation.amountUsd)}</strong>
                          </div>
                          <div>
                            <span>Queda</span>
                            <strong>{formatUsd.format(roundUsd(allocation.pendingUsd - allocation.amountUsd))}</strong>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>Escribe el valor y la tasa para ver como se distribuira el abono.</p>
                  )}
                </div>
              </section>
              {generalPaymentError ? (
                <p className="order-form-error" role="alert">{generalPaymentError}</p>
              ) : null}
            </div>
            <div className="order-modal__footer">
              <span>La distribucion puede dejar una caja parcialmente pagada.</span>
              <div>
                <button
                  type="button"
                  className="ops-button"
                  disabled={isGeneralPaymentSaving}
                  onClick={() => setIsGeneralPaymentOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ops-button ops-button--primary"
                  disabled={isGeneralPaymentSaving || !generalPaymentAllocations.length}
                >
                  {isGeneralPaymentSaving ? "Distribuyendo..." : "Registrar y distribuir"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {selectedInvoice ? (
        <div className="order-modal-backdrop courier-modal-backdrop" role="presentation">
          <section className="order-modal courier-detail-modal" role="dialog" aria-modal="true" aria-labelledby="courier-detail-title">
            <div className="order-modal__header">
              <div><p className="ops-kicker">{selectedInvoice.courierName}</p><h2 id="courier-detail-title">Factura #{selectedInvoice.invoiceNumber}</h2><small>{formatDate(selectedInvoice.invoiceDate)}{selectedInvoice.billedTo ? ` · ${selectedInvoice.billedTo}` : ""}</small></div>
              <button type="button" aria-label="Cerrar" onClick={() => setSelectedInvoiceId(null)}>&times;</button>
            </div>
            <div className="courier-detail-body">
              <div className="courier-detail-summary">
                <div><span>Cajas</span><strong>{selectedInvoice.guides.length}</strong></div>
                <div><span>Peso</span><strong>{selectedInvoice.guides.reduce((sum, guide) => sum + guide.weightLb, 0).toLocaleString("es-CO")} lb</strong></div>
                <div><span>Total</span><strong>{formatUsd.format(getInvoiceTotalUsd(selectedInvoice))}</strong></div>
                <div><span>Pendiente</span><strong>{formatUsd.format(getInvoiceTotalUsd(selectedInvoice) - getInvoicePaidUsd(selectedInvoice))}</strong></div>
                <a href={selectedInvoice.sourceFile.url} target="_blank" rel="noreferrer">Ver PDF original</a>
              </div>
              <div className="courier-detail-actions">
                <button type="button" className="ops-button" onClick={selectPendingReceipt}>Seleccionar todas por recibir</button>
                <button type="button" className="ops-button ops-button--primary" onClick={selectPendingPayment}>Seleccionar todo por pagar</button>
              </div>
              <div className="courier-detail-table-wrap">
                <table className="courier-detail-table">
                  <thead><tr><th><span className="sr-only">Seleccionar</span></th><th>Guia / VIL</th><th>Peso</th><th>Tarifa</th><th>Valor</th><th>Recepcion</th><th>Pago</th></tr></thead>
                  <tbody>
                    {selectedInvoice.guides.map((guide) => {
                      const paidUsd = getGuidePaidUsd(selectedInvoice, guide.id);
                      return (
                        <tr key={guide.id}>
                          <td><input type="checkbox" checked={selectedGuideIds.includes(guide.id)} onChange={() => toggleGuide(guide.id)} aria-label={`Seleccionar ${guide.guideNumber}`} /></td>
                          <td><strong>{guide.guideNumber}</strong>{guide.receiptNote ? <small>{guide.receiptNote}</small> : null}</td>
                          <td>{guide.weightLb.toLocaleString("es-CO")} lb</td>
                          <td>{formatUsd.format(guide.rateUsd)}</td>
                          <td><strong>{formatUsd.format(guide.amountUsd)}</strong></td>
                          <td>{guide.receivedAtIso ? <span className="courier-badge is-complete">Recibida {formatDate(guide.receivedAtIso)}</span> : <span className="courier-badge is-pending">Pendiente</span>}</td>
                          <td>{paidUsd >= guide.amountUsd - 0.02 ? <span className="courier-badge is-complete">Pagada</span> : <span className="courier-badge is-pending">{formatUsd.format(guide.amountUsd - paidUsd)}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedInvoice.charges.length ? (
                <div className="courier-extra-charges"><div className="courier-preview-section__title"><strong>Cargos adicionales</strong></div>{selectedInvoice.charges.map((charge) => { const paidUsd = getChargePaidUsd(selectedInvoice, charge.id); return <label key={charge.id}><input type="checkbox" checked={selectedChargeIds.includes(charge.id)} onChange={() => toggleCharge(charge.id)} /><span>{charge.description}</span><strong>{formatUsd.format(charge.amountUsd)}</strong><em className={paidUsd >= charge.amountUsd - 0.02 ? "is-paid" : ""}>{paidUsd >= charge.amountUsd - 0.02 ? "Pagado" : "Pendiente"}</em></label>; })}</div>
              ) : null}
              {detailAction === "receipt" ? (
                <div className="courier-action-panel" ref={detailActionRef}>
                  <div><strong>Confirmar recepcion</strong><span>Se marcaran solo las guias seleccionadas que aun esten pendientes.</span></div>
                  <label><span>Fecha de recepcion</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} /></label>
                  <label className="is-wide"><span>Nota opcional</span><input value={actionNote} placeholder="Ej. Caja recibida completa y en buen estado" onChange={(event) => setActionNote(event.target.value)} /></label>
                  <button type="button" className="ops-button ops-button--primary" disabled={isUpdating} onClick={() => void submitReceipt()}>{isUpdating ? "Guardando..." : "Marcar como recibidas"}</button>
                </div>
              ) : null}
              {detailAction === "payment" ? (
                <div className="courier-action-panel courier-payment-panel" ref={detailActionRef}>
                  <div className="courier-payment-total"><span>Saldo seleccionado</span><strong>{formatUsd.format(selectedPaymentUsd)}</strong></div>
                  <label>
                    <span>Moneda</span>
                    <select
                      value={paymentCurrency}
                      onChange={(event) => {
                        setPaymentCurrency(event.target.value as CourierPaymentCurrency);
                        setPaymentAmount(0);
                        setDetailError(null);
                      }}
                    >
                      <option value="COP">Pesos colombianos</option>
                      <option value="USD">Dolares</option>
                    </select>
                  </label>
                  <label>
                    <span>{paymentCurrency === "USD" ? "Valor abonado en USD" : "Valor abonado en COP"}</span>
                    <span className="product-money-input">
                      <span>{paymentCurrency === "USD" ? "US$" : "$"}</span>
                      <FormattedNumberInput
                        min={paymentCurrency === "USD" ? 0.01 : 1}
                        maxFractionDigits={paymentCurrency === "USD" ? 2 : 0}
                        value={paymentAmount}
                        onValueChange={(value) => {
                          setPaymentAmount(value);
                          setDetailError(null);
                        }}
                      />
                    </span>
                  </label>
                  <label>
                    <span>Tasa COP por USD</span>
                    <span className="product-money-input">
                      <span>$</span>
                      <FormattedNumberInput
                        min={1}
                        maxFractionDigits={2}
                        value={paymentExchangeRate}
                        onValueChange={(value) => {
                          setPaymentExchangeRate(value);
                          setDetailError(null);
                        }}
                      />
                    </span>
                  </label>
                  <label><span>Fecha de pago</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} /></label>
                  <label><span>Metodo</span><input list="courier-payment-methods" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /><datalist id="courier-payment-methods"><option value="Zelle" /><option value="Bancolombia" /><option value="Transferencia" /><option value="Efectivo" /></datalist></label>
                  <label><span>Referencia opcional</span><input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></label>
                  <div className="courier-derived-rate">
                    <span>Se aplicara</span>
                    <strong>{formatUsd.format(selectedPaymentAmounts?.amountUsd ?? 0)}</strong>
                    <small>{formatCop(selectedPaymentAmounts?.amountCop ?? 0)}</small>
                  </div>
                  <button type="button" className="ops-button ops-button--primary" disabled={isUpdating || !selectedPaymentAmounts} onClick={() => void submitPayment()}>{isUpdating ? "Guardando..." : "Registrar abono"}</button>
                </div>
              ) : null}
              {detailError ? <p className="order-form-error" role="alert">{detailError}</p> : null}
              {selectedInvoice.payments.length ? (
                <div className="courier-payment-history"><div className="courier-preview-section__title"><strong>Pagos registrados</strong></div>{[...selectedInvoice.payments].reverse().map((payment) => <div key={payment.id}><span>{formatDate(payment.paymentDate)} · {payment.method}{payment.reference ? ` · ${payment.reference}` : ""}{payment.batchId ? " · Abono general" : ""}</span><strong>{formatUsd.format(payment.amountUsd)} / {formatCop(payment.amountCop)}</strong><small>TRM efectiva {formatCop(Math.round(payment.exchangeRateCop))}{payment.paymentCurrency ? ` · Pagado en ${payment.paymentCurrency}` : ""}</small></div>)}</div>
              ) : null}
            </div>
            <div className="order-modal__footer">
              <span>
                {selectedGuideIds.length} guia{selectedGuideIds.length === 1 ? "" : "s"} seleccionada{selectedGuideIds.length === 1 ? "" : "s"}
                {selectedChargeIds.length ? ` · ${selectedChargeIds.length} cargo${selectedChargeIds.length === 1 ? "" : "s"}` : ""}
              </span>
              <div>
                <button type="button" className="ops-button" disabled={!selectedPendingReceiptCount || isUpdating} onClick={openReceiptAction}>
                  Registrar recepcion{selectedPendingReceiptCount ? ` (${selectedPendingReceiptCount})` : ""}
                </button>
                <button type="button" className="ops-button ops-button--primary" disabled={!selectedPendingPaymentCount || isUpdating} onClick={openPaymentAction}>
                  Registrar pago{selectedPendingPaymentCount ? ` (${selectedPendingPaymentCount})` : ""}
                </button>
                <button type="button" className="ops-button" onClick={() => setSelectedInvoiceId(null)}>Cerrar</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
