import { ReportsWorkbench } from "@/components/reports-workbench";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function SalesByDateReportPage() {
  const snapshot = await getOperationsSnapshot();
  return <ReportsWorkbench orders={snapshot.orders} view="range" />;
}
