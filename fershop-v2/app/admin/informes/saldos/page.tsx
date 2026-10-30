import { PendingBalancesWorkbench } from "@/components/pending-balances-workbench";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function PendingBalancesReportPage() {
  const snapshot = await getOperationsSnapshot();
  return <PendingBalancesWorkbench orders={snapshot.orders} />;
}
