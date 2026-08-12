import type { SessionData } from "@/lib/auth-types";
import { getDb, hasDatabaseConfiguration } from "@/lib/db";

export async function recordAuditLog(input: {
  action: string;
  actor?: SessionData | null;
  entityType: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!hasDatabaseConfiguration()) {
    return;
  }
  await getDb().query(
    `
      INSERT INTO fershop_v2.audit_log
        (actor_user_id, actor_name, action, entity_type, entity_id, summary, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      input.actor?.userId ?? null,
      input.actor?.name ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.summary ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}
