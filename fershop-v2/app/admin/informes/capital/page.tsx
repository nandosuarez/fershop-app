import { CapitalReportWorkbench } from "@/components/capital-report-workbench";
import { getInventorySnapshot, getPurchaseOrders } from "@/lib/server/inventory-store";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function CapitalReportPage() {
  const [operations, inventory, purchaseOrders] = await Promise.all([
    getOperationsSnapshot(),
    getInventorySnapshot(),
    getPurchaseOrders(),
  ]);

  return (
    <CapitalReportWorkbench
      orders={operations.orders}
      inventory={inventory}
      purchaseOrders={purchaseOrders}
    />
  );
}
