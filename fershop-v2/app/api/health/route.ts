import { NextResponse } from "next/server";

import { getDb, hasDatabaseConfiguration } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseConfiguration()) {
    return NextResponse.json({
      ok: process.env.NODE_ENV !== "production",
      service: "fershop-v2",
      persistence: "local-json",
    }, { status: process.env.NODE_ENV === "production" ? 503 : 200 });
  }

  try {
    const result = await getDb().query<{ documents: string }>(
      `SELECT COUNT(*)::text AS documents FROM fershop_v2.app_document`
    );
    return NextResponse.json({
      ok: true,
      service: "fershop-v2",
      persistence: "postgresql",
      documents: Number(result.rows[0].documents),
    });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ ok: false, service: "fershop-v2" }, { status: 503 });
  }
}
