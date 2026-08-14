import { ReportsWorkbench } from "@/components/reports-workbench";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const snapshot = await getOperationsSnapshot();
  return <ReportsWorkbench orders={snapshot.orders} />;
}
