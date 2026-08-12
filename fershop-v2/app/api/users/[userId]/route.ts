import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { requireAdminRequest } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { getUserStoreError, updateUser } from "@/lib/users";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = requireAdminRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }
  try {
    const { userId } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const user = await updateUser(
      userId,
      {
        name: String(payload.name ?? ""),
        email: String(payload.email ?? ""),
        username: String(payload.username ?? ""),
        password: String(payload.password ?? ""),
        role: String(payload.role ?? "OPERACION") as UserRole,
        isActive: payload.isActive !== false,
      },
      session
    );
    await recordAuditLog({
      action: "UPDATE",
      actor: session,
      entityType: "user",
      entityId: user.id,
      summary: `Usuario ${user.username} actualizado`,
      metadata: { isActive: user.isActive, role: user.role },
    });
    return NextResponse.json({ user });
  } catch (error) {
    const failure = getUserStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
