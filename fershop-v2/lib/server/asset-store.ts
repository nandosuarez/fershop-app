import { getDb, hasDatabaseConfiguration } from "@/lib/db";

interface AssetRow {
  data: Buffer;
  file_name: string;
  mime_type: string;
}

export async function saveProductImage(input: {
  data: Buffer;
  fileName: string;
  mimeType: string;
}) {
  if (!hasDatabaseConfiguration()) {
    return null;
  }
  const result = await getDb().query<{ id: string }>(
    `
      INSERT INTO fershop_v2.app_asset
        (asset_type, file_name, mime_type, byte_length, data)
      VALUES ('PRODUCT_IMAGE', $1, $2, $3, $4)
      RETURNING id
    `,
    [input.fileName, input.mimeType, input.data.byteLength, input.data]
  );
  return result.rows[0].id;
}

export async function getProductImage(imageId: string) {
  if (!hasDatabaseConfiguration()) {
    return null;
  }
  const result = await getDb().query<AssetRow>(
    `
      SELECT file_name, mime_type, data
      FROM fershop_v2.app_asset
      WHERE id = $1 AND asset_type = 'PRODUCT_IMAGE'
      LIMIT 1
    `,
    [imageId]
  );
  return result.rowCount ? result.rows[0] : null;
}
