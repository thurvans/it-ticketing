import crypto from "node:crypto";
import { AwsClient } from "aws4fetch";
import { config } from "./config.js";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const PRESIGNED_URL_TTL_SECONDS = Math.max(60, Number(config.r2PresignTtlSeconds) || 3600);
const hasR2Credentials = Boolean(
  config.r2Endpoint && config.r2BucketName && config.r2AccessKeyId && config.r2SecretAccessKey,
);

const r2Client = hasR2Credentials
  ? new AwsClient({
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
      service: "s3",
      region: "auto",
      retries: 0,
    })
  : null;

function isAbsoluteUrl(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function sanitizePathSegment(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitizeFileName(fileName = "") {
  const normalized = String(fileName || "attachment")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

  return normalized || "attachment";
}

function buildObjectPrefix(scope, ticketId) {
  if (scope === "workspace-logo") {
    return "workspace/branding";
  }

  if (scope === "comment" && ticketId) {
    return `tickets/${ticketId}/comments`;
  }

  if (scope === "ticket" && ticketId) {
    return `tickets/${ticketId}/attachments`;
  }

  return "tickets/pending";
}

function buildObjectKey(fileName, options = {}) {
  const safeFileName = sanitizeFileName(fileName);
  const ticketSegment = sanitizePathSegment(options.ticketId || "");
  const prefix = buildObjectPrefix(options.scope, ticketSegment);
  return `${prefix}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
}

function normalizeStoredObjectKey(value = "") {
  const normalized = String(value || "").trim();

  if (!normalized || normalized === "#" || isAbsoluteUrl(normalized)) {
    return normalized;
  }

  return normalized.replace(/^\/+/, "");
}

function encodeObjectKey(objectKey = "") {
  return normalizeStoredObjectKey(objectKey)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBucketObjectUrl(objectKey) {
  const encodedKey = encodeObjectKey(objectKey);
  return `${config.r2Endpoint}/${config.r2BucketName}/${encodedKey}`;
}

function buildPublicObjectUrl(objectKey) {
  const normalizedKey = normalizeStoredObjectKey(objectKey);

  if (!config.r2PublicBaseUrl || !normalizedKey || normalizedKey === "#" || isAbsoluteUrl(normalizedKey)) {
    return normalizedKey;
  }

  return `${config.r2PublicBaseUrl}/${encodeObjectKey(normalizedKey)}`;
}

function withExpiresQuery(url, expiresIn = PRESIGNED_URL_TTL_SECONDS) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("X-Amz-Expires", String(expiresIn));
  return nextUrl.toString();
}

async function signObjectRequest(url, method, headers = {}) {
  const request = await r2Client.sign(url, {
    method,
    headers,
    aws: {
      service: "s3",
      region: "auto",
      signQuery: true,
    },
  });

  return request.url.toString();
}

export function isR2Configured() {
  return Boolean(r2Client);
}

export function assertR2Configured() {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 belum dikonfigurasi. Lengkapi variabel R2_* di backend/.env.");
  }
}

export async function createPresignedUploadBatch(files = [], options = {}) {
  assertR2Configured();

  const normalizedFiles = Array.isArray(files) ? files : [];

  return Promise.all(
    normalizedFiles.map(async (file) => {
      const fileName = String(file?.file_name || file?.fileName || "attachment").trim() || "attachment";
      const contentType = String(file?.file_type || file?.fileType || DEFAULT_CONTENT_TYPE).trim() || DEFAULT_CONTENT_TYPE;
      const fileSize = Number(file?.file_size || file?.fileSize || 0) || 0;
      const objectKey = buildObjectKey(fileName, options);
      const uploadUrl = await signObjectRequest(withExpiresQuery(buildBucketObjectUrl(objectKey)), "PUT", {
        "Content-Type": contentType,
      });

      return {
        upload_url: uploadUrl,
        attachment: {
          file_name: fileName,
          file_url: objectKey,
          file_type: contentType,
          file_size: fileSize,
        },
      };
    }),
  );
}

export async function uploadObjectBuffer(file, options = {}) {
  assertR2Configured();

  const fileName = String(file?.file_name || file?.fileName || "attachment").trim() || "attachment";
  const contentType = String(file?.file_type || file?.fileType || DEFAULT_CONTENT_TYPE).trim() || DEFAULT_CONTENT_TYPE;
  const fileSize = Number(file?.file_size || file?.fileSize || 0) || 0;
  const objectKey = buildObjectKey(fileName, options);
  const response = await r2Client.fetch(buildBucketObjectUrl(objectKey), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file?.buffer || file?.body || null,
    aws: {
      service: "s3",
      region: "auto",
    },
  });

  if (!response.ok) {
    throw new Error(`Upload object ${fileName} ke Cloudflare R2 gagal diproses.`);
  }

  return {
    file_name: fileName,
    file_url: objectKey,
    file_type: contentType,
    file_size: fileSize,
  };
}

export async function signObjectUrl(objectKey) {
  const normalizedKey = normalizeStoredObjectKey(objectKey);

  if (!normalizedKey || normalizedKey === "#") {
    return normalizedKey;
  }

  if (isAbsoluteUrl(normalizedKey)) {
    return normalizedKey;
  }

  if (config.r2PublicBaseUrl) {
    return buildPublicObjectUrl(normalizedKey);
  }

  if (!isR2Configured()) {
    return normalizedKey;
  }

  return signObjectRequest(withExpiresQuery(buildBucketObjectUrl(normalizedKey)), "GET");
}

export async function signAttachmentCollection(attachments = []) {
  const normalizedAttachments = Array.isArray(attachments) ? attachments : [];

  return Promise.all(
    normalizedAttachments.map(async (attachment) => {
      if (!attachment) {
        return attachment;
      }

      return {
        ...attachment,
        signed_url: await signObjectUrl(attachment.file_url),
      };
    }),
  );
}

export async function deleteStoredObjects(objectKeys = []) {
  const normalizedKeys = [...new Set((objectKeys || []).map(normalizeStoredObjectKey))]
    .filter((value) => value && value !== "#" && !isAbsoluteUrl(value));

  if (!normalizedKeys.length || !isR2Configured()) {
    return;
  }

  await Promise.all(
    normalizedKeys.map(async (objectKey) => {
      const response = await r2Client.fetch(buildBucketObjectUrl(objectKey), {
        method: "DELETE",
        aws: {
          service: "s3",
          region: "auto",
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Gagal menghapus object storage ${objectKey}.`);
      }
    }),
  );
}
