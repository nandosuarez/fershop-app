import { Pool } from "pg";

declare global {
  var fershopPool: Pool | undefined;
}

export function hasDatabaseConfiguration() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  if (!global.fershopPool) {
    global.fershopPool = new Pool({
      connectionString,
      max: Number(process.env.POSTGRES_POOL_MAX ?? 4),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      ssl:
        process.env.POSTGRES_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });

    global.fershopPool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error", error);
    });
  }

  return global.fershopPool;
}
