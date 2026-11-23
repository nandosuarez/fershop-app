export interface BackupAssetRecord {
  id: string;
  asset_type: string;
  file_name: string;
  mime_type: string;
  byte_length: number;
  data_base64: string;
  created_at: Date | string;
}

export interface BackupAssetSummary {
  count: number;
  byteLength: number;
}

export interface BackupExportInput {
  exportedAtIso: string;
  exportedBy: {
    id: string;
    username: string;
  };
  documentKeys: readonly string[];
  assetSummary: BackupAssetSummary;
  readDocument: (key: string) => Promise<unknown>;
  listUsers: () => Promise<unknown[]>;
  readNextAsset: (afterId: string | null) => Promise<BackupAssetRecord | null>;
}

async function* generateBackupJson(input: BackupExportInput) {
  yield "{";
  yield `"format":"fershop-v2-backup","version":2,"compression":"gzip",`;
  yield `"exportedAtIso":${JSON.stringify(input.exportedAtIso)},`;
  yield `"exportedBy":${JSON.stringify(input.exportedBy)},`;
  yield `"assetSummary":${JSON.stringify(input.assetSummary)},`;
  yield '"documents":{';

  for (const [index, key] of input.documentKeys.entries()) {
    const document = await input.readDocument(key);
    yield `${index ? "," : ""}${JSON.stringify(key)}:${JSON.stringify(document ?? null)}`;
  }

  yield `},"users":${JSON.stringify(await input.listUsers())},"assets":[`;

  let firstAsset = true;
  let afterId: string | null = null;
  while (true) {
    const asset = await input.readNextAsset(afterId);
    if (!asset) {
      break;
    }
    if (asset.id === afterId) {
      throw new Error("Backup asset cursor did not advance.");
    }

    yield `${firstAsset ? "" : ","}${JSON.stringify(asset)}`;
    firstAsset = false;
    afterId = asset.id;
  }

  yield "]}";
}

export function createBackupJsonStream(input: BackupExportInput) {
  const encoder = new TextEncoder();
  const iterator = generateBackupJson(input)[Symbol.asyncIterator]();
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await iterator.next();
        if (result.done) {
          finished = true;
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(result.value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      if (!finished) {
        await iterator.return?.();
      }
    },
  });
}

export function createCompressedBackupStream(input: BackupExportInput) {
  const gzip = new CompressionStream("gzip");
  return createBackupJsonStream(input).pipeThrough({
    readable: gzip.readable,
    writable: gzip.writable as WritableStream<Uint8Array>,
  });
}
