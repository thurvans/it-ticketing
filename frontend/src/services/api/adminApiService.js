import { apiRequest } from "@/config/backend";

function buildReportSummaryQuery(filters = {}) {
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

export async function listProfiles(roleFilter) {
  const query = roleFilter && roleFilter !== "All" ? `?role=${encodeURIComponent(roleFilter)}` : "";
  const response = await apiRequest(`/profiles${query}`);
  return response.profiles || [];
}

export async function listTechnicians() {
  const response = await apiRequest("/profiles/technicians/metrics");
  return response.technicians || [];
}

export async function saveManagedProfile(payload) {
  const endpoint = payload.id ? `/admin/profiles/${payload.id}` : "/admin/profiles";
  const method = payload.id ? "PUT" : "POST";
  const response = await apiRequest(endpoint, {
    method,
    body: payload,
  });

  return response.profile;
}

export async function deleteManagedProfile(profileId) {
  const response = await apiRequest(`/admin/profiles/${profileId}`, {
    method: "DELETE",
  });

  return response.deletedId;
}

export async function listCategories() {
  const response = await apiRequest("/categories");
  return response.categories || [];
}

export async function saveCategory(payload) {
  const endpoint = payload.id ? `/categories/${payload.id}` : "/categories";
  const method = payload.id ? "PUT" : "POST";
  const response = await apiRequest(endpoint, {
    method,
    body: payload,
  });

  return response.category;
}

export async function deleteCategory(categoryId) {
  const response = await apiRequest(`/categories/${categoryId}`, {
    method: "DELETE",
  });

  return response.deletedId;
}

export async function listSlaSettings() {
  const response = await apiRequest("/admin/sla-settings");
  return response.slaSettings || [];
}

export async function saveSlaSetting(payload) {
  const endpoint = payload.id ? `/admin/sla-settings/${payload.id}` : "/admin/sla-settings";
  const method = payload.id ? "PUT" : "POST";
  const response = await apiRequest(endpoint, {
    method,
    body: payload,
  });

  return response.slaSetting;
}

export async function listAdminAnnouncements() {
  const response = await apiRequest("/admin/announcements");
  return response.announcements || [];
}

export async function saveAnnouncement(payload) {
  const endpoint = payload.id ? `/admin/announcements/${payload.id}` : "/admin/announcements";
  const method = payload.id ? "PUT" : "POST";
  const response = await apiRequest(endpoint, {
    method,
    body: payload,
  });

  return response.announcement;
}

export async function deleteAnnouncement(announcementId) {
  const response = await apiRequest(`/admin/announcements/${announcementId}`, {
    method: "DELETE",
  });

  return response.deletedId;
}

export async function listAuditLogs() {
  const response = await apiRequest("/admin/audit-logs");
  return response.auditLogs || [];
}

export async function getReportSummary(filters = {}) {
  const response = await apiRequest(`/admin/reports/summary${buildReportSummaryQuery(filters)}`);
  return response.summary || null;
}
