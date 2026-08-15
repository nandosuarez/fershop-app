import { InventoryWorkbench } from "@/components/inventory-workbench";
import { getInventorySnapshot } from "@/lib/server/inventory-store";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  return <InventoryWorkbench snapshot={await getInventorySnapshot()} />;
}
