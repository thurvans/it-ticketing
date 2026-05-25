import { apiBaseUrl, apiRequest, buildApiUrl, getBackendSessionToken } from "@/config/backend";
import { ROLES } from "@/utils/constants";
import {
  getDefaultRolePermissions,
  normalizeRolePermissions,
  normalizeSystemSettings,
  PERMISSION_MODULES,
  SYSTEM_SETTING_FIELDS,
} from "@/utils/systemAccess";
import {
  WORKSPACE_LOGO_MAX_BYTES,
  validateWorkspaceLogoDescriptor,
} from "@shared/workspaceLogoRules";

function assertSuperAdmin(profile) {
  if (profile?.role !== "super_admin") {
    throw new Error("Hanya super admin yang dapat mengelola konfigurasi sistem dan permission matrix.");
  }
}

function coerceSettingValue(field, value) {
  if (field.type === "boolean") {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  if (field.type === "number") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : field.defaultValue;
  }

  const nextValue = String(value ?? "").trim();
  return nextValue || field.defaultValue;
}

function normalizeSettingsPayload(payload) {
  return SYSTEM_SETTING_FIELDS.reduce((accumulator, field) => {
    accumulator[field.key] = coerceSettingValue(field, payload?.[field.key]);
    return accumulator;
  }, {});
}

function lockSuperAdminPermissions(permissions) {
  const lockedPermissions = normalizeRolePermissions(permissions);
  lockedPermissions.super_admin = PERMISSION_MODULES.reduce((accumulator, module) => {
    accumulator[module.key] = true;
    return accumulator;
  }, {});
  return lockedPermissions;
}

export async function getSystemAccessConfig(options = {}) {
  const includePermissions = options.includePermissions !== false;

  if (!includePermissions) {
    const publicConfig = await apiRequest("/public/system-access");

    return {
      systemSettings: normalizeSystemSettings(publicConfig?.systemSettings),
      rolePermissions: getDefaultRolePermissions(),
    };
  }

  const config = await apiRequest("/system-access");

  return {
    systemSettings: normalizeSystemSettings(config?.systemSettings),
    rolePermissions: lockSuperAdminPermissions(config?.rolePermissions),
  };
}

export async function saveSystemSettings(payload, currentProfile) {
  assertSuperAdmin(currentProfile);

  const response = await apiRequest("/system-access/settings", {
    method: "PUT",
    body: normalizeSettingsPayload(payload),
  });

  return normalizeSystemSettings(response?.systemSettings);
}

export async function uploadWorkspaceLogo(file, currentProfile) {
  assertSuperAdmin(currentProfile);

  if (!file) {
    throw new Error("Pilih file logo terlebih dahulu.");
  }

  if (!apiBaseUrl) {
    throw new Error("API backend belum dikonfigurasi. Periksa API_PUBLIC_URL di backend/.env.");
  }

  const validationMessage = validateWorkspaceLogoDescriptor(
    {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    },
    { maxFileSizeBytes: WORKSPACE_LOGO_MAX_BYTES },
  );

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const token = getBackendSessionToken();
  const params = new URLSearchParams({
    fileName: file.name,
  });
  const response = await fetch(`${buildApiUrl("/system-access/logo-upload")}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(payload?.message || `Upload logo "${file.name}" gagal diproses.`);
  }

  return payload.logo;
}

export async function saveRolePermissions(payload, currentProfile) {
  assertSuperAdmin(currentProfile);

  const response = await apiRequest("/system-access/permissions", {
    method: "PUT",
    body: lockSuperAdminPermissions(payload),
  });

  return lockSuperAdminPermissions(response?.rolePermissions);
}

export function getRolePermissionsForRole(role, rolePermissions) {
  if (!ROLES.includes(role)) {
    return {};
  }

  const permissions = lockSuperAdminPermissions(rolePermissions);
  return permissions[role] || {};
}
