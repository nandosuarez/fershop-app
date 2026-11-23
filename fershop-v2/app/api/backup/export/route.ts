import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { requireAdminRequest } from "@/lib/auth";
import {
  createCompressedBackupStream,
  type BackupAssetRecord,
} from "@/lib/backup-export";
import { getDb, hasDatabaseConfiguration } from "@/lib/db";
import {
  APP_DOCUMENT_KEYS,
  readAppDocument,
  type AppDocumentKey,
} from "@/lib/server/document-store";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = requireAdminRequest(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const exportedAtIso = new Date().toISOString();
  const databaseConfigured = hasDatabaseConfiguration();
  const assetStats = databaseConfigured
    ? (
        await getDb().query<{ asset_count: string; byte_length: string }>(
          `
            SELECT COUNT(*)::text AS asset_count,
                   COALESCE(SUM(byte_length), 0)::text AS byte_length
            FROM fershop_v2.app_asset
            WHERE created_at <= $1::timestamptz
          `,
          [exportedAtIso]
        )
      ).rows[0]
    : { asset_count: "0", byte_length: "0" };

  await recordAuditLog({
    action: "EXPORT",
    actor: session,
    entityType: "backup",
    summary: "Copia local comprimida iniciada",
    metadata: {
      format: "json.gz",
      assets: Number(assetStats.asset_count),
      assetBytes: Number(assetStats.byte_length),
    },
  });

  const stream = createCompressedBackupStream({
    exportedAtIso,
    exportedBy: { id: session.userId, username: session.username },
    documentKeys: APP_DOCUMENT_KEYS,
    assetSummary: {
      count: Number(assetStats.asset_count),
      byteLength: Number(assetStats.byte_length),
    },
    readDocument: (key) => readAppDocument(key as AppDocumentKey),
    listUsers: () => (databaseConfigured ? listUsers() : Promise.resolve([])),
    readNextAsset: async (afterId) => {
      if (!databaseConfigured) {
        return null;
      }
      const result = await getDb().query<BackupAssetRecord>(
        `
          SELECT id, asset_type, file_name, mime_type, byte_length,
                 ENCODE(data, 'base64') AS data_base64, created_at
          FROM fershop_v2.app_asset
          WHERE created_at <= $1::timestamptz
            AND ($2::uuid IS NULL OR id > $2::uuid)
          ORDER BY id
          LIMIT 1
        `,
        [exportedAtIso, afterId]
      );
      return result.rowCount ? result.rows[0] : null;
    },
  });

  const fileDate = exportedAtIso.slice(0, 10);
  return new NextResponse(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="fershop_backup_${fileDate}.json.gz"`,
      "Content-Type": "application/gzip",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
