import { TrackingWorkbench } from "@/components/tracking-workbench";

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="ops-page order-detail-page">
      <TrackingWorkbench initialOrderId={params.order} />
    </main>
  );
}
