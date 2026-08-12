import { products } from "@/lib/catalog";
import type {
  CartItem,
  CartSummary,
  ComputedCartLine,
  DashboardOrder,
  PaymentPolicy,
  Product,
  SaleMode,
} from "@/lib/types";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
  return copFormatter.format(value);
}

export function getSaleModeLabel(mode: SaleMode): string {
  return mode === "immediate" ? "Entrega inmediata" : "Pedido por encargo";
}

export function getPaymentPolicyLabel(policy: PaymentPolicy): string {
  return policy === "full_today" ? "Paga completo hoy" : "50% hoy y 50% al llegar";
}

export function getDueTodayForProduct(product: Product, lineTotalCop: number): number {
  return product.paymentPolicy === "full_today" ? lineTotalCop : Math.round(lineTotalCop * 0.5);
}

export function getDueOnArrivalForProduct(product: Product, lineTotalCop: number): number {
  return Math.max(lineTotalCop - getDueTodayForProduct(product, lineTotalCop), 0);
}

export function computeLine(product: Product, quantity: number): ComputedCartLine {
  const lineTotalCop = product.priceCop * quantity;
  return {
    product,
    quantity,
    lineTotalCop,
    dueTodayCop: getDueTodayForProduct(product, lineTotalCop),
    dueOnArrivalCop: getDueOnArrivalForProduct(product, lineTotalCop),
  };
}

export function getOrderProfitCop(order: DashboardOrder): number | null {
  if (!order.items?.length) {
    return null;
  }

  let profitCop = 0;
  for (const item of order.items) {
    if (typeof item.unitCostCop !== "number") {
      return null;
    }
    const shippingCostCop = item.unitShippingCostCop ?? 0;
    profitCop +=
      (item.unitPriceCop - item.unitCostCop - shippingCostCop) * item.quantity;
  }
  return Math.round(profitCop);
}

export function summarizeCart(items: CartItem[], catalogProducts: Product[] = products): CartSummary {
  const lines = items
    .map((item) => {
      const product = catalogProducts.find((candidate) => candidate.id === item.productId);
      if (!product) {
        return null;
      }
      return computeLine(product, Math.max(item.quantity, 1));
    })
    .filter((line): line is ComputedCartLine => line !== null);

  return lines.reduce<CartSummary>(
    (summary, line) => {
      summary.lines.push(line);
      summary.totalCop += line.lineTotalCop;
      summary.dueTodayCop += line.dueTodayCop;
      summary.dueOnArrivalCop += line.dueOnArrivalCop;
      if (line.product.saleMode === "immediate") {
        summary.immediateUnits += line.quantity;
      } else {
        summary.preorderUnits += line.quantity;
      }
      return summary;
    },
    {
      lines: [],
      totalCop: 0,
      dueTodayCop: 0,
      dueOnArrivalCop: 0,
      immediateUnits: 0,
      preorderUnits: 0,
    }
  );
}
