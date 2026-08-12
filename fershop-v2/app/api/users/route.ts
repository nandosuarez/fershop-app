import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { requireAdminRequest } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { createUser, getUserStoreError, listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = requireAdminRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }
  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: NextRequest) {
  const session = requireAdminRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const user = await createUser({
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      username: String(payload.username ?? ""),
      password: String(payload.password ?? ""),
      role: String(payload.role ?? "OPERACION") as UserRole,
      isActive: true,
    });
    await recordAuditLog({
      action: "CREATE",
      actor: session,
      entityType: "user",
      entityId: user.id,
      summary: `Usuario ${user.username} creado`,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const failure = getUserStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
