import { NewOrderWorkbench } from "@/components/new-order-workbench";
import { getCustomers } from "@/lib/server/customer-store";
import { getInventorySnapshot } from "@/lib/server/inventory-store";
import { getOrder } from "@/lib/server/operations-store";
import { getProducts } from "@/lib/server/product-store";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const params = await searchParams;
  const [products, customers, inventory, initialOrder] = await Promise.all([
    getProducts(),
    getCustomers(),
    getInventorySnapshot(),
    params.editar ? getOrder(params.editar) : Promise.resolve(undefined),
  ]);
  return (
    <NewOrderWorkbench
      products={products}
      customers={customers}
      inventoryItems={inventory.items}
      initialOrder={initialOrder}
    />
  );
}
