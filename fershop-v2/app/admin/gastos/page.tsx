import { ExpensesWorkbench } from "@/components/expenses-workbench";
import { getExpenseSnapshot } from "@/lib/server/expense-store";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  return <ExpensesWorkbench initialSnapshot={await getExpenseSnapshot()} />;
}
