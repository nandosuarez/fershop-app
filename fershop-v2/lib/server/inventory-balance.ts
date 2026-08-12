import { readAppDocument } from "@/lib/server/document-store";

interface StoredInventoryMovement {
  productId: string;
  quantity: number;
}

interface StoredInventoryData {
  movements?: StoredInventoryMovement[];
}

export async function getInventoryBalances(): Promise<Map<string, number>> {
  const data = await readAppDocument<StoredInventoryData>("inventory");
  const balances = new Map<string, number>();
  (data?.movements ?? []).forEach((movement) => {
    if (
      typeof movement.productId === "string" &&
      Number.isFinite(movement.quantity)
    ) {
      balances.set(
        movement.productId,
        (balances.get(movement.productId) ?? 0) + movement.quantity
      );
    }
  });
  return balances;
}
