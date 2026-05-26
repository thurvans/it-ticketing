export const WORKSPACE_LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

export const WORKSPACE_LOGO_ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
export const WORKSPACE_LOGO_MAX_MB = 2;
export const WORKSPACE_LOGO_MAX_BYTES = WORKSPACE_LOGO_MAX_MB * 1024 * 1024;

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function hasAllowedWorkspaceLogoExtension(fileName = "") {
  const normalizedFileName = normalizeText(fileName);
  return WORKSPACE_LOGO_ALLOWED_EXTENSIONS.some((extension) => normalizedFileName.endsWith(extension));
}

export function isAllowedWorkspaceLogoType({ fileName = "", fileType = "" } = {}) {
  const normalizedMimeType = normalizeText(fileType);

  if (WORKSPACE_LOGO_ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    return true;
  }

  return hasAllowedWorkspaceLogoExtension(fileName);
}

export function validateWorkspaceLogoDescriptor(
  { fileName = "", fileType = "", fileSize = 0 } = {},
  options = {},
) {
  const maxFileSizeBytes = Math.max(1, Number(options.maxFileSizeBytes) || WORKSPACE_LOGO_MAX_BYTES);
  const normalizedFileSize = Number(fileSize) || 0;

  if (!isAllowedWorkspaceLogoType({ fileName, fileType })) {
    return "Logo workspace hanya boleh berupa PNG, JPG, SVG, atau WebP.";
  }

  if (normalizedFileSize <= 0) {
    return "Ukuran file logo tidak valid.";
  }

  if (normalizedFileSize > maxFileSizeBytes) {
    const maxFileSizeMb = Math.max(1, Math.round(maxFileSizeBytes / (1024 * 1024)));
    return `Ukuran logo workspace maksimal ${maxFileSizeMb} MB.`;
  }

  return "";
}
