import { getDb, hasDatabaseConfiguration } from "@/lib/db";

interface AssetRow {
  data: Buffer;
  file_name: string;
  mime_type: string;
}

type AssetType = "PRODUCT_IMAGE" | "ORDER_ATTACHMENT";

async function saveAsset(
  assetType: AssetType,
  input: { data: Buffer; fileName: string; mimeType: string }
) {
  if (!hasDatabaseConfiguration()) {
    return null;
  }
  const result = await getDb().query<{ id: string }>(
    `
      INSERT INTO fershop_v2.app_asset
        (asset_type, file_name, mime_type, byte_length, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [assetType, input.fileName, input.mimeType, input.data.byteLength, input.data]
  );
  return result.rows[0].id;
}

async function getAsset(assetType: AssetType, assetId: string) {
  if (!hasDatabaseConfiguration()) {
    return null;
  }
  const result = await getDb().query<AssetRow>(
    `
      SELECT file_name, mime_type, data
      FROM fershop_v2.app_asset
      WHERE id = $1 AND asset_type = $2
      LIMIT 1
    `,
    [assetId, assetType]
  );
  return result.rowCount ? result.rows[0] : null;
}

export async function saveProductImage(input: {
  data: Buffer;
  fileName: string;
  mimeType: string;
}) {
  return saveAsset("PRODUCT_IMAGE", input);
}

export async function getProductImage(imageId: string) {
  return getAsset("PRODUCT_IMAGE", imageId);
}

export async function saveOrderAttachment(input: {
  data: Buffer;
  fileName: string;
  mimeType: string;
}) {
  return saveAsset("ORDER_ATTACHMENT", input);
}

export async function getOrderAttachment(attachmentId: string) {
  return getAsset("ORDER_ATTACHMENT", attachmentId);
}
