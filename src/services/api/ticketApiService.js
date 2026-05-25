import { apiBaseUrl, apiRequest, buildApiUrl, getBackendSessionToken } from "@/config/backend";
import { ATTACHMENT_MAX_BYTES, validateAttachmentDescriptor } from "@shared/attachmentRules";

export const NOTIFICATIONS_CHANGED_EVENT = "ticketing:notifications-changed";

function buildTicketListQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "All") {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

function dispatchNotificationsChanged(userId) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: { userId } }));
}

function normalizeAttachmentPayload(files) {
  return (files || []).map((file) => ({
    file_name: file.file_name || file.fileName || file.name || "attachment",
    file_url: file.file_url || file.fileUrl || "#",
    file_type: file.file_type || file.fileType || file.type || "application/octet-stream",
    file_size: file.file_size || file.fileSize || file.size || 0,
  }));
}

async function uploadFileToBackendEndpoint(upload, file) {
  if (!apiBaseUrl) {
    throw new Error("API backend belum dikonfigurasi. Periksa API_PUBLIC_URL di backend/.env.");
  }

  const token = getBackendSessionToken();
  const params = new URLSearchParams({
    scope: upload.scope || "new-ticket",
    fileName: file.name,
  });

  if (upload.ticketId) {
    params.set("ticketId", upload.ticketId);
  }

  const response = await fetch(`${upload.upload_url}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": upload.attachment.file_type || file.type || "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(payload?.message || `Upload lampiran "${file.name}" ke storage gagal diproses.`);
  }

  return payload.attachment;
}

async function uploadFilesToBackendStorage(files, options = {}) {
  if (!files?.length) {
    return [];
  }

  files.forEach((file) => {
    const validationMessage = validateAttachmentDescriptor(
      {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
      { maxFileSizeBytes: ATTACHMENT_MAX_BYTES },
    );

    if (validationMessage) {
      throw new Error(validationMessage);
    }
  });

  return Promise.all(
    files.map((file) =>
      uploadFileToBackendEndpoint(
        {
          upload_url: buildApiUrl("/uploads/direct"),
          attachment: {
            file_type: file.type || "application/octet-stream",
          },
          scope: options.scope || "new-ticket",
          ticketId: options.ticketId || null,
        },
        file,
      ),
    ),
  );
}

export async function listTickets({ filters = {} } = {}) {
  const response = await apiRequest(`/tickets${buildTicketListQuery(filters)}`);
  return response.tickets || [];
}

export async function getDashboardData() {
  const response = await apiRequest("/dashboard/summary");
  return response.summary;
}

export async function getTicketDetail(ticketId) {
  const response = await apiRequest(`/tickets/${ticketId}`);
  return response.ticket;
}

export async function createTicket(values, currentProfile) {
  if (!currentProfile?.id) {
    throw new Error("Session user tidak tersedia.");
  }

  const uploadedAttachments = await uploadFilesToBackendStorage(values.attachments, {
    scope: "new-ticket",
  });

  const response = await apiRequest("/tickets", {
    method: "POST",
    body: {
      ...values,
      attachments: normalizeAttachmentPayload(uploadedAttachments),
    },
  });

  dispatchNotificationsChanged(currentProfile.id);
  return response.ticket;
}

export async function updateTicket(ticketId, updates) {
  const response = await apiRequest(`/tickets/${ticketId}`, {
    method: "PUT",
    body: updates,
  });

  return response.ticket;
}

export async function addTicketAttachments(ticketId, files, currentProfile) {
  if (!currentProfile?.id) {
    throw new Error("Session user tidak tersedia.");
  }

  if (!files?.length) {
    throw new Error("Pilih minimal satu file sebelum mengunggah lampiran.");
  }

  const uploadedAttachments = await uploadFilesToBackendStorage(files, {
    scope: "ticket",
    ticketId,
  });

  const response = await apiRequest(`/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: {
      attachments: normalizeAttachmentPayload(uploadedAttachments),
    },
  });

  return response.ticket;
}

export async function deleteTicket(ticketId, currentProfile) {
  if (!currentProfile?.id) {
    throw new Error("Session user tidak tersedia.");
  }

  if (!["admin", "super_admin"].includes(currentProfile.role || "")) {
    throw new Error("Hanya admin yang dapat menghapus tiket.");
  }

  await apiRequest(`/tickets/${ticketId}`, {
    method: "DELETE",
  });

  return true;
}

export async function addComment(ticketId, values) {
  const uploadedAttachments = await uploadFilesToBackendStorage(values.attachments, {
    scope: "comment",
    ticketId,
  });

  const response = await apiRequest(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: {
      ...values,
      attachments: normalizeAttachmentPayload(uploadedAttachments),
    },
  });

  return response.ticket;
}

export async function listAnnouncements() {
  const response = await apiRequest("/announcements/active");
  return response.announcements || [];
}

export function subscribeToNotifications(userId, onChange) {
  if (!userId || typeof onChange !== "function") {
    return () => {};
  }

  const handleChange = (event) => {
    if (!event?.detail?.userId || event.detail.userId === userId) {
      onChange();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
    }
  };
}

export async function listNotifications(userId) {
  if (!userId) {
    return [];
  }

  const response = await apiRequest("/notifications?limit=8");
  return response.notifications || [];
}

export async function markAllNotificationsRead(userId) {
  if (!userId) {
    return [];
  }

  const response = await apiRequest("/notifications/read-all", {
    method: "POST",
    body: { limit: 8 },
  });

  dispatchNotificationsChanged(userId);
  return response.notifications || [];
}

export async function markNotificationRead(userId, notificationId) {
  if (!userId || !notificationId) {
    return [];
  }

  const response = await apiRequest(`/notifications/${notificationId}/read`, {
    method: "POST",
    body: { limit: 8 },
  });

  dispatchNotificationsChanged(userId);
  return response.notifications || [];
}
