export const ATTACHMENT_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];
export const ATTACHMENT_ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];
export const ATTACHMENT_MAX_MB = 5;
export const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024;

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function hasAllowedAttachmentExtension(fileName = "") {
  const normalizedFileName = normalizeText(fileName);
  return ATTACHMENT_ALLOWED_EXTENSIONS.some((extension) => normalizedFileName.endsWith(extension));
}

export function isAllowedAttachmentType({ fileName = "", fileType = "" } = {}) {
  const normalizedMimeType = normalizeText(fileType);

  if (ATTACHMENT_ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    return true;
  }

  return hasAllowedAttachmentExtension(fileName);
}

export function validateAttachmentDescriptor(
  { fileName = "", fileType = "", fileSize = 0 } = {},
  options = {},
) {
  const maxFileSizeBytes = Math.min(Number(options.maxFileSizeBytes) || ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_BYTES);
  const normalizedFileSize = Number(fileSize) || 0;

  if (!isAllowedAttachmentType({ fileName, fileType })) {
    return "Lampiran hanya boleh berupa gambar PNG atau JPG.";
  }

  if (normalizedFileSize <= 0) {
    return "Ukuran file lampiran tidak valid.";
  }

  if (normalizedFileSize > maxFileSizeBytes) {
    const maxFileSizeMb = Math.max(1, Math.round(maxFileSizeBytes / (1024 * 1024)));
    return `Ukuran lampiran maksimal ${maxFileSizeMb} MB per file.`;
  }

  return "";
}
