const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
export const isBackendConfigured = Boolean(apiBaseUrl);
export const BACKEND_SESSION_KEY = "it-ticketing-backend-session";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function buildApiUrl(path) {
  if (!apiBaseUrl) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export function getBackendSessionToken() {
  return getStorage()?.getItem(BACKEND_SESSION_KEY) || "";
}

export function setBackendSessionToken(token) {
  if (!token) {
    return;
  }

  getStorage()?.setItem(BACKEND_SESSION_KEY, token);
}

export function clearBackendSessionToken() {
  getStorage()?.removeItem(BACKEND_SESSION_KEY);
}

export async function apiRequest(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error("API backend belum dikonfigurasi. Periksa API_PUBLIC_URL di backend/.env.");
  }

  const headers = new Headers(options.headers || {});
  const token = getBackendSessionToken();
  const hasBody = options.body !== undefined;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(payload?.message || "Permintaan ke backend gagal diproses.");
    error.status = response.status;
    throw error;
  }

  return payload;
}
