import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDb, hasDatabaseConfiguration } from "@/lib/db";

export type AppDocumentKey =
  | "categories"
  | "customers"
  | "expenses"
  | "inventory"
  | "operations"
  | "products";

interface DocumentRow {
  payload: unknown;
}

const dataDir = path.join(process.cwd(), "data");

function assertPersistenceConfiguration() {
  if (process.env.NODE_ENV === "production" && !hasDatabaseConfiguration()) {
    throw new Error("DATABASE_URL is required in production. Local JSON fallback is disabled.");
  }
}

function getLocalFile(key: AppDocumentKey) {
  return path.join(dataDir, `${key}.json`);
}

export async function readAppDocument<T>(key: AppDocumentKey): Promise<T | null> {
  assertPersistenceConfiguration();

  if (hasDatabaseConfiguration()) {
    const result = await getDb().query<DocumentRow>(
      `SELECT payload FROM fershop_v2.app_document WHERE document_key = $1 LIMIT 1`,
      [key]
    );
    return result.rowCount ? (result.rows[0].payload as T) : null;
  }

  try {
    return JSON.parse(await readFile(getLocalFile(key), "utf8")) as T;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeAppDocument<T>(key: AppDocumentKey, value: T): Promise<void> {
  assertPersistenceConfiguration();

  if (hasDatabaseConfiguration()) {
    await getDb().query(
      `
        INSERT INTO fershop_v2.app_document (document_key, payload)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (document_key)
        DO UPDATE SET payload = EXCLUDED.payload
      `,
      [key, JSON.stringify(value)]
    );
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(getLocalFile(key), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function getAllAppDocuments() {
  if (hasDatabaseConfiguration()) {
    const result = await getDb().query<{ document_key: AppDocumentKey; payload: unknown }>(
      `SELECT document_key, payload FROM fershop_v2.app_document ORDER BY document_key`
    );
    return Object.fromEntries(result.rows.map((row) => [row.document_key, row.payload]));
  }

  const keys: AppDocumentKey[] = [
    "categories",
    "customers",
    "expenses",
    "inventory",
    "operations",
    "products",
  ];
  const documents = await Promise.all(keys.map(async (key) => [key, await readAppDocument(key)]));
  return Object.fromEntries(documents);
}
