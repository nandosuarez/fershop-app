import type { CourierInvoicePreview } from "./types";

export interface PositionedPdfText {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface TextLine {
  page: number;
  y: number;
  items: PositionedPdfText[];
}

const lineTolerance = 1.5;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseNumber(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function groupIntoLines(items: PositionedPdfText[]) {
  const lines: TextLine[] = [];
  const sorted = [...items]
    .filter((item) => item.text.trim())
    .sort((left, right) => left.page - right.page || right.y - left.y || left.x - right.x);

  for (const item of sorted) {
    const current = lines.at(-1);
    if (
      !current ||
      current.page !== item.page ||
      Math.abs(current.y - item.y) > lineTolerance
    ) {
      lines.push({ page: item.page, y: item.y, items: [item] });
      continue;
    }
    current.items.push(item);
    current.items.sort((left, right) => left.x - right.x);
  }
  return lines;
}

function findValueBelow(items: PositionedPdfText[], labelPattern: RegExp, valuePattern: RegExp) {
  const label = items.find((item) => labelPattern.test(item.text.trim()));
  if (!label) {
    return "";
  }
  return (
    items
      .filter(
        (item) =>
          item.page === label.page &&
          item.y < label.y &&
          label.y - item.y <= 45 &&
          Math.abs(item.x - label.x) <= 80 &&
          valuePattern.test(item.text.trim())
      )
      .sort((left, right) => label.y - left.y - (label.y - right.y))[0]?.text.trim() ?? ""
  );
}

function normalizeInvoiceDate(value: string) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return "";
  }
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findBilledTo(items: PositionedPdfText[]) {
  const label = items.find((item) => /^bill\s+to$/i.test(item.text.trim()));
  if (!label) {
    return undefined;
  }
  return items
    .filter(
      (item) =>
        item.page === label.page &&
        item.y < label.y &&
        label.y - item.y <= 40 &&
        Math.abs(item.x - label.x) <= 140
    )
    .sort((left, right) => right.y - left.y || left.x - right.x)[0]?.text.trim();
}

function getDeclaredTotal(items: PositionedPdfText[]) {
  const totalLabel = items
    .filter((item) => /^total$/i.test(item.text.trim()))
    .sort((left, right) => left.y - right.y)[0];
  const candidates = items
    .filter(
      (item) =>
        /^\$[\d,.]+$/.test(item.text.trim()) &&
        (!totalLabel ||
          (item.page === totalLabel.page && Math.abs(item.y - totalLabel.y) <= 25 && item.x > totalLabel.x))
    )
    .map((item) => parseNumber(item.text))
    .filter((value): value is number => value !== null);
  return candidates.at(-1) ?? 0;
}

export function parseCourierInvoiceTextItems(items: PositionedPdfText[]): CourierInvoicePreview {
  const cleanItems = items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text);
  const lines = groupIntoLines(cleanItems);
  const completeText = cleanItems.map((item) => item.text).join(" ");
  const warnings: string[] = [];

  const courierName = /DNR\s+USA\s+CARGO/i.test(completeText) ? "DNR USA CARGO" : "";
  const rawDate = findValueBelow(cleanItems, /^date$/i, /^\d{1,2}\/\d{1,2}\/\d{4}$/);
  const invoiceDate = normalizeInvoiceDate(rawDate);
  const invoiceNumber = findValueBelow(cleanItems, /^invoice\s*#$/i, /^[A-Z0-9-]+$/i);
  const guides = lines.flatMap((line) => {
    const guideItem = line.items.find((item) => /VIL/i.test(item.text));
    const guideMatch = guideItem?.text.replace(/\s/g, "").match(/VIL\d{6,}/i);
    if (!guideItem || !guideMatch) {
      return [];
    }
    const weight = line.items
      .filter((item) => item.x < guideItem.x)
      .map((item) => parseNumber(item.text))
      .find((value): value is number => value !== null);
    const valuesToRight = line.items
      .filter((item) => item.x > guideItem.x + 100)
      .map((item) => parseNumber(item.text))
      .filter((value): value is number => value !== null);
    const rateUsd = valuesToRight.at(-2);
    const amountUsd = valuesToRight.at(-1);
    if (weight === undefined || rateUsd === undefined || amountUsd === undefined) {
      warnings.push(`Revisa los valores de la guia ${guideMatch[0].toUpperCase()}.`);
      return [];
    }
    return [
      {
        guideNumber: guideMatch[0].toUpperCase(),
        weightLb: roundMoney(weight),
        rateUsd: roundMoney(rateUsd),
        amountUsd: roundMoney(amountUsd),
      },
    ];
  });

  const charges = lines.flatMap((line) => {
    const descriptionItem = line.items.find((item) => /^(insurance|seguro)$/i.test(item.text));
    if (!descriptionItem) {
      return [];
    }
    const rightValues = line.items
      .filter((item) => item.x > descriptionItem.x + 100)
      .map((item) => parseNumber(item.text))
      .filter((value): value is number => value !== null);
    const amountUsd = rightValues.at(-1);
    return amountUsd === undefined
      ? []
      : [{ description: descriptionItem.text.toUpperCase(), amountUsd: roundMoney(amountUsd) }];
  });

  const duplicateGuides = guides.filter(
    (guide, index) => guides.findIndex((candidate) => candidate.guideNumber === guide.guideNumber) !== index
  );
  if (duplicateGuides.length) {
    warnings.push("El PDF contiene numeros de guia repetidos.");
  }
  for (const guide of guides) {
    if (Math.abs(roundMoney(guide.weightLb * guide.rateUsd) - guide.amountUsd) > 0.02) {
      warnings.push(`El valor de ${guide.guideNumber} no coincide con peso por tarifa.`);
    }
  }

  const calculatedTotalUsd = roundMoney(
    guides.reduce((sum, guide) => sum + guide.amountUsd, 0) +
      charges.reduce((sum, charge) => sum + charge.amountUsd, 0)
  );
  const declaredTotalUsd = roundMoney(getDeclaredTotal(cleanItems) || calculatedTotalUsd);
  if (!courierName) {
    warnings.push("No identificamos automaticamente el courier.");
  }
  if (!invoiceNumber) {
    warnings.push("No identificamos el numero de factura.");
  }
  if (!invoiceDate) {
    warnings.push("No identificamos la fecha de la factura.");
  }
  if (!guides.length) {
    warnings.push("No encontramos guias VIL en el documento.");
  }
  if (Math.abs(declaredTotalUsd - calculatedTotalUsd) > 0.02) {
    warnings.push("El total declarado no coincide con la suma de las guias y cargos adicionales.");
  }

  return {
    courierName,
    invoiceNumber,
    invoiceDate,
    billedTo: findBilledTo(cleanItems),
    currency: "USD",
    guides,
    charges,
    declaredTotalUsd,
    calculatedTotalUsd,
    warnings,
  };
}

export async function parseCourierInvoicePdf(data: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof pdfjs.getDocument>[0]);
  try {
    const document = await loadingTask.promise;
    const items: PositionedPdfText[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) {
          continue;
        }
        items.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          page: pageNumber,
        });
      }
    }
    return parseCourierInvoiceTextItems(items);
  } finally {
    await loadingTask.destroy();
  }
}
