import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { config } from "../config/env.js";

/** @type {S3Client | null} */
let client = null;

function getClient() {
  if (!config.assets.enabled) {
    return null;
  }
  if (!client) {
    const options = { region: config.assets.region };
    if (config.assets.endpoint) {
      options.endpoint = config.assets.endpoint;
      options.forcePathStyle = true;
      options.credentials = {
        accessKeyId: config.assets.accessKeyId,
        secretAccessKey: config.assets.secretAccessKey,
      };
    }
    client = new S3Client(options);
  }
  return client;
}

export async function ensureAssetsBucket() {
  const s3 = getClient();
  if (!s3) {
    return false;
  }

  const bucket = config.assets.bucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    return true;
  }
}

/**
 * @param {Buffer} body
 * @param {string} contentType
 * @param {string} originalName
 * @param {string} publicBaseUrl
 */
export async function uploadAsset(body, contentType, originalName, publicBaseUrl) {
  const s3 = getClient();
  if (!s3) {
    throw new Error("Asset storage is not configured");
  }

  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `uploads/${nanoid(10)}-${safeName || "file"}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.assets.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const base = publicBaseUrl.replace(/\/$/, "");
  return {
    key,
    url: `${base}/api/assets/${encodeURIComponent(key)}`,
  };
}

/**
 * @param {string} key
 */
export async function getAssetObject(key) {
  const s3 = getClient();
  if (!s3) {
    return null;
  }

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.assets.bucket,
      Key: key,
    })
  );

  const body = await response.Body?.transformToByteArray();
  if (!body) {
    return null;
  }

  return {
    body: Buffer.from(body),
    contentType: response.ContentType || "application/octet-stream",
  };
}

export function assetsStatus() {
  return {
    enabled: config.assets.enabled,
    bucket: config.assets.bucket,
    endpoint: config.assets.endpoint || "(AWS default)",
  };
}
