import { CapitalReportWorkbench } from "@/components/capital-report-workbench";
import { getExpenseSnapshot } from "@/lib/server/expense-store";
import { getInventorySnapshot, getPurchaseOrders } from "@/lib/server/inventory-store";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function CapitalReportPage() {
  const [operations, inventory, purchaseOrders, expenses] = await Promise.all([
    getOperationsSnapshot(),
    getInventorySnapshot(),
    getPurchaseOrders(),
    getExpenseSnapshot(),
  ]);

  return (
    <CapitalReportWorkbench
      orders={operations.orders}
      inventory={inventory}
      purchaseOrders={purchaseOrders}
      expenses={expenses.expenses}
    />
  );
}
