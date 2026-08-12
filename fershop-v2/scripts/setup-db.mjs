import { randomBytes, scrypt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

const { Pool } = pg;
const scryptAsync = promisify(scrypt);
const keyLength = 64;
const currentDir = dirname(fileURLToPath(import.meta.url));
const projectDir = join(currentDir, "..");
const schemaPath = join(projectDir, "database", "schema.sql");
const documentKeys = ["customers", "expenses", "inventory", "operations", "products"];

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, keyLength);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function readSeedDocument(key) {
  return JSON.parse(
    await readFile(join(projectDir, "database", "seeds", `${key}.json`), "utf8")
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminName = process.env.ADMIN_NAME || "Administrador FerShop";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  }
  if (adminPassword.length < 10) {
    throw new Error("ADMIN_PASSWORD must have at least 10 characters.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(await readFile(schemaPath, "utf8"));

    const existingAdmin = await client.query(
      `SELECT id FROM fershop_v2.app_user WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [adminEmail]
    );
    if (existingAdmin.rowCount === 0) {
      await client.query(
        `
          INSERT INTO fershop_v2.app_user
            (name, email, username, password_hash, role)
          VALUES ($1, LOWER($2), LOWER($3), $4, 'SUPERADMIN')
        `,
        [adminName, adminEmail, adminUsername, await hashPassword(adminPassword)]
      );
      console.log("Initial administrator created.");
    } else {
      console.log("Administrator already exists; password was not overwritten.");
    }

    for (const key of documentKeys) {
      await client.query(
        `
          INSERT INTO fershop_v2.app_document (document_key, payload)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (document_key) DO NOTHING
        `,
        [key, JSON.stringify(await readSeedDocument(key))]
      );
    }

    await client.query("COMMIT");
    console.log("FerShop database schema and initial data are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
