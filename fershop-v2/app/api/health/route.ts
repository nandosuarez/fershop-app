import { NextRequest, NextResponse } from "next/server";

import { getDb, hasDatabaseConfiguration } from "@/lib/db";

export const dynamic = "force-dynamic";

const service = "fershop-v2";

export async function GET(request: NextRequest) {
  const databaseConfigured = hasDatabaseConfiguration();
  const deepCheck = request.nextUrl.searchParams.get("deep") === "1";

  // Render uses this endpoint as a liveness probe. Keep it independent from
  // PostgreSQL so a brief database recovery does not mark the web process as
  // unhealthy and replace the application response with a 502.
  if (!deepCheck) {
    return NextResponse.json({
      ok: true,
      service,
      persistence: databaseConfigured ? "postgresql" : "local-json",
      databaseConfigured,
    });
  }

  if (!databaseConfigured) {
    return NextResponse.json(
      {
        ok: process.env.NODE_ENV !== "production",
        service,
        persistence: "local-json",
        databaseConfigured: false,
      },
      { status: process.env.NODE_ENV === "production" ? 503 : 200 }
    );
  }

  try {
    const result = await getDb().query<{ documents: string }>(
      `SELECT COUNT(*)::text AS documents FROM fershop_v2.app_document`
    );

    return NextResponse.json({
      ok: true,
      service,
      persistence: "postgresql",
      databaseConfigured: true,
      documents: Number(result.rows[0].documents),
    });
  } catch (error) {
    console.error("Deep health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        service,
        persistence: "postgresql",
        databaseConfigured: true,
      },
      { status: 503 }
    );
  }
}
