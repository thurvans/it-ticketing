import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const backendRootDir = path.resolve(path.dirname(currentFilePath), "..");
const baseEnvPath = path.join(backendRootDir, ".env");

dotenv.config({ path: baseEnvPath });

const appEnv = normalizeAppEnv(process.env.APP_ENV);
const appEnvFilePath = path.join(backendRootDir, `.env.${appEnv}`);

if (fs.existsSync(appEnvFilePath)) {
  dotenv.config({ path: appEnvFilePath, override: true });
}

function normalizeAppEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "production") {
    return "production";
  }

  return "development";
}

function toBoolean(value, defaultValue = false) {
  if (value == null || value === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

const r2AccountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const r2Endpoint = trimTrailingSlash(
  process.env.R2_ENDPOINT || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : ""),
);

export const config = {
  appEnv,
  isProduction: appEnv === "production",
  appName: process.env.APP_NAME || "IT Ticketing System",
  port: toNumber(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/it_ticketing",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  frontendAppUrl: trimTrailingSlash(process.env.FRONTEND_APP_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173"),
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${toNumber(process.env.PORT, 3001)}`,
  databaseSsl: toBoolean(process.env.DATABASE_SSL, false),
  sessionTtlDays: toNumber(process.env.SESSION_TTL_DAYS, 30),
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  brevoSmtpHost: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  brevoSmtpPort: toNumber(process.env.BREVO_SMTP_PORT, 587),
  brevoSmtpSecure: toBoolean(process.env.BREVO_SMTP_SECURE, false),
  brevoSmtpLogin: String(process.env.BREVO_SMTP_LOGIN || "").trim(),
  brevoSmtpKey: String(process.env.BREVO_SMTP_KEY || "").trim(),
  mailFromEmail: String(process.env.MAIL_FROM_EMAIL || "").trim(),
  mailFromName: String(process.env.MAIL_FROM_NAME || process.env.APP_NAME || "IT Ticketing System").trim(),
  mailReplyToEmail: String(process.env.MAIL_REPLY_TO_EMAIL || process.env.MAIL_FROM_EMAIL || "").trim(),
  mailReplyToName: String(process.env.MAIL_REPLY_TO_NAME || process.env.MAIL_FROM_NAME || process.env.APP_NAME || "").trim(),
  accountActivationTtlHours: toNumber(process.env.ACCOUNT_ACTIVATION_TTL_HOURS, 24),
  passwordResetTtlMinutes: toNumber(process.env.PASSWORD_RESET_TTL_MINUTES, 60),
  r2AccountId,
  r2Endpoint,
  r2BucketName: String(process.env.R2_BUCKET_NAME || "").trim(),
  r2AccessKeyId: String(process.env.R2_ACCESS_KEY_ID || "").trim(),
  r2SecretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || "").trim(),
  r2PublicBaseUrl: trimTrailingSlash(process.env.R2_PUBLIC_BASE_URL || ""),
  r2PresignTtlSeconds: toNumber(process.env.R2_PRESIGN_TTL_SECONDS, 3600),
};
