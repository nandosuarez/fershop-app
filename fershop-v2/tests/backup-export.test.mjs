import assert from "node:assert/strict";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import { createCompressedBackupStream } from "../lib/backup-export.ts";

async function readCompressedBackup(input) {
  const compressed = await new Response(createCompressedBackupStream(input)).arrayBuffer();
  return JSON.parse(gunzipSync(Buffer.from(compressed)).toString("utf8"));
}

test("genera una copia comprimida completa leyendo un archivo a la vez", async () => {
  const assets = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      asset_type: "PRODUCT_IMAGE",
      file_name: "producto.jpg",
      mime_type: "image/jpeg",
      byte_length: 3,
      data_base64: "YWJj",
      created_at: "2026-11-21T12:00:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      asset_type: "ORDER_ATTACHMENT",
      file_name: "factura.pdf",
      mime_type: "application/pdf",
      byte_length: 4,
      data_base64: "ZGVmZw==",
      created_at: "2026-11-21T12:01:00.000Z",
    },
  ];
  const requestedCursors = [];

  const backup = await readCompressedBackup({
    exportedAtIso: "2026-11-21T13:00:00.000Z",
    exportedBy: { id: "admin-1", username: "fershop_admin" },
    documentKeys: ["customers", "operations"],
    assetSummary: { count: 2, byteLength: 7 },
    readDocument: async (key) => ({ key }),
    listUsers: async () => [{ id: "admin-1", role: "ADMIN" }],
    readNextAsset: async (afterId) => {
      requestedCursors.push(afterId);
      if (!afterId) return assets[0];
      if (afterId === assets[0].id) return assets[1];
      return null;
    },
  });

  assert.equal(backup.format, "fershop-v2-backup");
  assert.equal(backup.version, 2);
  assert.equal(backup.compression, "gzip");
  assert.deepEqual(backup.documents, {
    customers: { key: "customers" },
    operations: { key: "operations" },
  });
  assert.equal(backup.users[0].role, "ADMIN");
  assert.deepEqual(backup.assets, assets);
  assert.deepEqual(requestedCursors, [null, assets[0].id, assets[1].id]);
});

test("genera una copia valida cuando no existen archivos", async () => {
  const backup = await readCompressedBackup({
    exportedAtIso: "2026-11-21T13:00:00.000Z",
    exportedBy: { id: "admin-1", username: "fershop_admin" },
    documentKeys: [],
    assetSummary: { count: 0, byteLength: 0 },
    readDocument: async () => null,
    listUsers: async () => [],
    readNextAsset: async () => null,
  });

  assert.deepEqual(backup.documents, {});
  assert.deepEqual(backup.assets, []);
});
