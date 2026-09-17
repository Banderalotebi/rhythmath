import { Storage } from "@google-cloud/storage";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getFile(storageKey: string) {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) {
    throw new Error("PRIVATE_OBJECT_DIR is not configured");
  }
  const parts = privateDir.replace(/^\/+/, "").split("/");
  const bucketName = parts.shift();
  if (!bucketName) {
    throw new Error("PRIVATE_OBJECT_DIR does not contain a bucket name");
  }
  const prefix = parts.join("/");
  const objectName = prefix ? `${prefix}/${storageKey}` : storageKey;
  return storage.bucket(bucketName).file(objectName);
}

export async function storeObject(
  storageKey: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  await getFile(storageKey).save(bytes, {
    resumable: false,
    metadata: { contentType },
  });
}

export async function deleteObject(storageKey: string): Promise<void> {
  await getFile(storageKey).delete({ ignoreNotFound: true });
}

export function streamObject(storageKey: string) {
  return getFile(storageKey).createReadStream();
}