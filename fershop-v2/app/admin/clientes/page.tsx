import { CustomersWorkbench } from "@/components/customers-workbench";
import { getCustomers } from "@/lib/server/customer-store";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  return <CustomersWorkbench initialCustomers={await getCustomers()} />;
}
