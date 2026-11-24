import { NewOrderWorkbench } from "@/components/new-order-workbench";
import { getCustomers } from "@/lib/server/customer-store";
import { getOrder } from "@/lib/server/operations-store";
import { getProductsWithInventoryBalances } from "@/lib/server/product-store";

export const dynamic = "force-dynamic";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const params = await searchParams;
  const [{ products, inventoryBalances }, customers, initialOrder] = await Promise.all([
    getProductsWithInventoryBalances(),
    getCustomers(),
    params.editar ? getOrder(params.editar) : Promise.resolve(undefined),
  ]);
  return (
    <NewOrderWorkbench
      products={products}
      customers={customers}
      inventoryAvailability={[...inventoryBalances].map(
        ([productId, availableQuantity]) => ({ productId, availableQuantity })
      )}
      initialOrder={initialOrder}
    />
  );
}
