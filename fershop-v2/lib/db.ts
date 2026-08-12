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
      max: Number(process.env.POSTGRES_POOL_MAX ?? 10),
      ssl:
        process.env.POSTGRES_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return global.fershopPool;
}
