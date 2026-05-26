import {
  apiRequest,
  clearBackendSessionToken,
  getBackendSessionToken,
  setBackendSessionToken,
} from "@/config/backend";

function buildBackendSessionPayload(payload) {
  return {
    user: payload?.user || null,
    profile: payload?.profile || null,
  };
}

function clearSession() {
  clearBackendSessionToken();
}

async function handleInactiveProfile(profile) {
  if (!profile || profile.is_active !== false) {
    return profile;
  }

  clearSession();
  throw new Error("Akun Anda sedang nonaktif. Hubungi admin IT untuk mengaktifkan kembali akses.");
}

export async function restoreSession() {
  if (!getBackendSessionToken()) {
    return { user: null, profile: null };
  }

  try {
    const session = buildBackendSessionPayload(await apiRequest("/auth/session"));

    if (!session.user?.id) {
      return { user: null, profile: null };
    }

    await handleInactiveProfile(session.profile);
    return session;
  } catch {
    clearSession();
    return { user: null, profile: null };
  }
}

export async function signIn({ email, password }) {
  const session = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (session?.token) {
    setBackendSessionToken(session.token);
  }

  await handleInactiveProfile(session.profile);
  return buildBackendSessionPayload(session);
}

export async function register(payload) {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: payload,
  });

  if (response?.token) {
    setBackendSessionToken(response.token);
  }

  return {
    ...response,
    ...buildBackendSessionPayload(response),
  };
}

export async function signOut() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });
  } catch {
    // Abaikan error logout agar session lokal tetap bisa dibersihkan.
  } finally {
    clearSession();
  }
}

export async function requestPasswordReset(email) {
  return apiRequest("/auth/password-reset", {
    method: "POST",
    body: { email },
  });
}

export async function updatePassword(password) {
  await apiRequest("/auth/password", {
    method: "PUT",
    body: { password },
  });
}

export async function activateAccount(token) {
  return apiRequest("/auth/activate", {
    method: "POST",
    body: { token },
  });
}

export async function resetPasswordWithToken({ token, password }) {
  return apiRequest("/auth/password-reset/confirm", {
    method: "POST",
    body: { token, password },
  });
}

export async function refreshProfile(userId) {
  if (!userId) {
    return null;
  }

  const session = buildBackendSessionPayload(await apiRequest("/auth/session"));
  return session.profile || null;
}

export async function updateProfile(userId, updates) {
  if (!userId) {
    throw new Error("Session user tidak ditemukan.");
  }

  const payload = {
    full_name: updates.full_name?.trim() || "",
    department: updates.department?.trim() || "",
    position: updates.position?.trim() || "",
    specialization: updates.specialization?.trim() || "",
    phone: updates.phone?.trim() || "",
  };

  const response = await apiRequest("/auth/profile", {
    method: "PUT",
    body: payload,
  });

  return response.profile || null;
}
