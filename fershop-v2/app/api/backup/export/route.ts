import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { requireAdminRequest } from "@/lib/auth";
import { getDb, hasDatabaseConfiguration } from "@/lib/db";
import { getAllAppDocuments } from "@/lib/server/document-store";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = requireAdminRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const assets = hasDatabaseConfiguration()
    ? (
        await getDb().query<{
          id: string;
          asset_type: string;
          file_name: string;
          mime_type: string;
          byte_length: number;
          data_base64: string;
          created_at: Date;
        }>(
          `
            SELECT id, asset_type, file_name, mime_type, byte_length,
                   ENCODE(data, 'base64') AS data_base64, created_at
            FROM fershop_v2.app_asset
            ORDER BY created_at
          `
        )
      ).rows
    : [];

  const backup = {
    format: "fershop-v2-backup",
    version: 1,
    exportedAtIso: new Date().toISOString(),
    exportedBy: { id: session.userId, username: session.username },
    documents: await getAllAppDocuments(),
    users: hasDatabaseConfiguration() ? await listUsers() : [],
    assets,
  };

  await recordAuditLog({
    action: "EXPORT",
    actor: session,
    entityType: "backup",
    summary: "Backup operativo JSON descargado",
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="backup_fershop_${fileDate}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
