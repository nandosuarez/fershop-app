import { PurchaseOrdersWorkbench } from "@/components/purchase-orders-workbench";
import { getPurchaseOrders } from "@/lib/server/inventory-store";
import { getProducts } from "@/lib/server/product-store";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const [products, purchaseOrders] = await Promise.all([
    getProducts(),
    getPurchaseOrders(),
  ]);
  return (
    <PurchaseOrdersWorkbench
      products={products}
      initialPurchaseOrders={purchaseOrders}
    />
  );
}
