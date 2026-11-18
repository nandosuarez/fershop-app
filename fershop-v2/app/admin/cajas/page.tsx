import { CourierInvoicesWorkbench } from "@/components/courier-invoices-workbench";
import { getCourierInvoiceSnapshot } from "@/lib/server/courier-invoice-store";

export const dynamic = "force-dynamic";

export default async function CourierInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const params = await searchParams;
  return (
    <CourierInvoicesWorkbench
      initialSnapshot={await getCourierInvoiceSnapshot()}
      initialInvoiceId={params.invoice}
    />
  );
}
