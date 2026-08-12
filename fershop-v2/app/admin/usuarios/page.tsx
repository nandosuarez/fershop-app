import { UsersWorkbench } from "@/components/users-workbench";
import { requireAdminPage } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireAdminPage();
  return <UsersWorkbench initialUsers={await listUsers()} currentUserId={session.userId} />;
}
