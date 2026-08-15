import { OrdersWorkbench } from "@/components/orders-workbench";
import { getOperationsSnapshot } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string }>;
}) {
  const params = await searchParams;
  const snapshot = await getOperationsSnapshot();
  const orders = snapshot.orders.filter((order) => order.statusCode !== "delivered");

  return <OrdersWorkbench orders={orders} createdOrderId={params.creado} />;
}
