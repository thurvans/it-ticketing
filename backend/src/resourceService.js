import crypto from "node:crypto";
import { pool, withTransaction } from "./db.js";
import {
  ATTACHMENT_MAX_BYTES,
  validateAttachmentDescriptor,
} from "../../shared/attachmentRules.js";
import {
  buildTicketNumberPrefix,
  PRIORITY_OPTIONS as PRIORITY_VALUES,
  REPORT_GROUP_BY_OPTIONS,
  STATUS_OPTIONS as STATUS_VALUES,
} from "../../shared/workspaceSchema.js";
import {
  createPresignedUploadBatch,
  deleteStoredObjects,
  signAttachmentCollection,
  uploadObjectBuffer,
} from "./storageService.js";
import { sendTicketNotificationEmail } from "./mailService.js";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const STATUS_OPTION_SET = new Set(STATUS_VALUES);
const PRIORITY_OPTION_SET = new Set(PRIORITY_VALUES);
const REPORT_GROUP_BY_SET = new Set(REPORT_GROUP_BY_OPTIONS);
const completedStatuses = new Set(["Resolved", "Closed", "Rejected"]);
const dailyFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" });
const monthlyFormatter = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" });
const EDITABLE_TICKET_FIELDS = [
  "title",
  "description",
  "category_id",
  "priority",
  "department",
  "location",
  "contact_number",
];
const EDITABLE_FIELD_LABELS = {
  title: "judul",
  description: "deskripsi",
  category_id: "kategori",
  priority: "prioritas",
  department: "departemen",
  location: "lokasi",
  contact_number: "nomor kontak",
};

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix = "id") {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function queryOne(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows[0] || null;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function toTime(value) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeEmail(email = "") {
  return normalizeText(email);
}

function normalizeBooleanSetting(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function normalizeAttachmentInput(attachments = []) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map((attachment) => {
    const normalizedAttachment = {
      file_name: String(attachment?.file_name || attachment?.fileName || "attachment").trim() || "attachment",
      file_url: String(attachment?.file_url || attachment?.fileUrl || "#").trim() || "#",
      file_type: String(attachment?.file_type || attachment?.fileType || "application/octet-stream").trim()
        || "application/octet-stream",
      file_size: Number(attachment?.file_size || attachment?.fileSize || 0) || 0,
    };
    const validationMessage = validateAttachmentDescriptor({
      fileName: normalizedAttachment.file_name,
      fileType: normalizedAttachment.file_type,
      fileSize: normalizedAttachment.file_size,
    });

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    return normalizedAttachment;
  });
}

function normalizeAttachmentRow(row) {
  return {
    ...row,
    file_size: Number(row.file_size) || 0,
  };
}

function getPriorityResolutionHours(priority) {
  return {
    Low: 72,
    Medium: 48,
    High: 24,
    Critical: 4,
  }[priority] || 48;
}

function getPriorityRank(priority) {
  return PRIORITY_VALUES.indexOf(priority);
}

function getStatusRank(status) {
  return STATUS_VALUES.indexOf(status);
}

function getTicketResolutionHours(ticket) {
  const createdAt = toTime(ticket?.created_at);
  const finishedAt = toTime(ticket?.closed_at || ticket?.resolved_at);

  if (!createdAt || !finishedAt || finishedAt < createdAt) {
    return null;
  }

  return (finishedAt - createdAt) / (1000 * 60 * 60);
}

function isSameDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
  );
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDailyLabel(date) {
  return dailyFormatter.format(date);
}

function formatMonthlyLabel(date) {
  return monthlyFormatter.format(date);
}

function getTrendBucket(date, groupBy) {
  if (groupBy === "monthly") {
    const bucketDate = new Date(date.getFullYear(), date.getMonth(), 1);

    return {
      key: `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`,
      label: formatMonthlyLabel(bucketDate),
      time: bucketDate.getTime(),
    };
  }

  if (groupBy === "weekly") {
    const bucketDate = startOfWeek(date);

    return {
      key: `${bucketDate.getFullYear()}-W${formatDailyLabel(bucketDate)}`,
      label: `Minggu ${formatDailyLabel(bucketDate)}`,
      time: bucketDate.getTime(),
    };
  }

  const bucketDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return {
    key: bucketDate.toISOString().slice(0, 10),
    label: formatDailyLabel(bucketDate),
    time: bucketDate.getTime(),
  };
}

function isTicketOverdue(ticket, referenceDate = new Date()) {
  const deadlineTime = toTime(ticket?.sla_deadline);

  if (!deadlineTime || completedStatuses.has(ticket?.status)) {
    return false;
  }

  return deadlineTime < referenceDate.getTime();
}

function getApproachingSlaThresholdHours(priority) {
  return (
    {
      Critical: 2,
      High: 6,
      Medium: 12,
      Low: 24,
    }[priority] || 12
  );
}

function isTicketApproachingSla(ticket, referenceDate = new Date()) {
  if (completedStatuses.has(ticket?.status) || isTicketOverdue(ticket, referenceDate) || !ticket?.sla_deadline) {
    return false;
  }

  const deadlineTime = toTime(ticket.sla_deadline);

  if (!deadlineTime) {
    return false;
  }

  const remainingHours = (deadlineTime - referenceDate.getTime()) / (1000 * 60 * 60);
  return remainingHours <= getApproachingSlaThresholdHours(ticket.priority);
}

function calculateAverageResolutionHours(tickets) {
  const durations = tickets.map(getTicketResolutionHours).filter((value) => value !== null);

  if (!durations.length) {
    return null;
  }

  return durations.reduce((total, value) => total + value, 0) / durations.length;
}

function calculateAverageRating(tickets) {
  const ratings = tickets
    .map((ticket) => Number(ticket.rating))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!ratings.length) {
    return null;
  }

  return ratings.reduce((total, value) => total + value, 0) / ratings.length;
}

function countTicketsCompletedToday(tickets, referenceDate = new Date()) {
  return tickets.filter((ticket) => {
    const completionDate = ticket?.closed_at || ticket?.resolved_at;

    if (!completionDate) {
      return false;
    }

    return isSameDay(new Date(completionDate), referenceDate);
  }).length;
}

function summarizeByLabel(items, getLabel) {
  const counts = items.reduce((accumulator, item) => {
    const label = getLabel(item) || "-";
    accumulator.set(label, (accumulator.get(label) || 0) + 1);
    return accumulator;
  }, new Map());

  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

function buildTrendSeries(tickets, options = {}) {
  const {
    groupBy = "daily",
    field = "created_at",
    limit = 8,
  } = options;
  const normalizedGroupBy = REPORT_GROUP_BY_SET.has(groupBy) ? groupBy : "daily";
  const bucketMap = new Map();

  tickets.forEach((ticket) => {
    const rawValue = ticket?.[field];

    if (!rawValue) {
      return;
    }

    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const bucket = getTrendBucket(date, normalizedGroupBy);
    const currentValue = bucketMap.get(bucket.key);

    if (currentValue) {
      currentValue.value += 1;
      return;
    }

    bucketMap.set(bucket.key, {
      key: bucket.key,
      label: bucket.label,
      value: 1,
      time: bucket.time,
    });
  });

  return [...bucketMap.values()]
    .sort((left, right) => left.time - right.time)
    .slice(limit * -1)
    .map(({ key, label, value }) => ({ key, label, value }));
}

function buildFixedCounts(options, tickets, selector) {
  return options.map((label) => ({
    label,
    value: tickets.filter((ticket) => selector(ticket) === label).length,
  }));
}

function filterTicketsForReport(tickets, filters = {}) {
  const query = normalizeText(filters.query);
  const startTime = toTime(filters.startDate ? `${filters.startDate}T00:00:00` : null);
  const endTime = toTime(filters.endDate ? `${filters.endDate}T23:59:59` : null);

  return tickets.filter((ticket) => {
    const matchesQuery = !query
      || [
        ticket.ticket_number,
        ticket.title,
        ticket.creator?.full_name,
        ticket.assignee?.full_name,
        ticket.category?.name,
        ticket.department,
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(query));
    const matchesStatus = !filters.status || filters.status === "All" || ticket.status === filters.status;
    const matchesPriority = !filters.priority || filters.priority === "All" || ticket.priority === filters.priority;
    const matchesCategory = !filters.categoryId || filters.categoryId === "All" || ticket.category_id === filters.categoryId;
    const matchesTechnician = !filters.assignedTo || filters.assignedTo === "All" || ticket.assigned_to === filters.assignedTo;
    const matchesDepartment = !filters.department || filters.department === "All" || ticket.department === filters.department;
    const createdTime = toTime(ticket.created_at);
    const matchesStart = !startTime || (createdTime && createdTime >= startTime);
    const matchesEnd = !endTime || (createdTime && createdTime <= endTime);

    return (
      matchesQuery
      && matchesStatus
      && matchesPriority
      && matchesCategory
      && matchesTechnician
      && matchesDepartment
      && matchesStart
      && matchesEnd
    );
  });
}

function sortTicketsCollection(tickets, sortBy = "latest") {
  const rows = [...tickets];

  rows.sort((left, right) => {
    if (sortBy === "oldest") {
      return (toTime(left.created_at) || 0) - (toTime(right.created_at) || 0);
    }

    if (sortBy === "priority") {
      return getPriorityRank(right.priority) - getPriorityRank(left.priority);
    }

    if (sortBy === "status") {
      return getStatusRank(left.status) - getStatusRank(right.status);
    }

    if (sortBy === "sla") {
      const leftTime = toTime(left.sla_deadline) || Number.MAX_SAFE_INTEGER;
      const rightTime = toTime(right.sla_deadline) || Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    }

    return (toTime(right.updated_at) || 0) - (toTime(left.updated_at) || 0);
  });

  return rows;
}

function buildReportSummaryFromData(tickets, categories, technicians, filters = {}) {
  const filteredTickets = filterTicketsForReport(tickets, filters);
  const overdueTickets = filteredTickets.filter((ticket) => isTicketOverdue(ticket));
  const avgResolutionHours = calculateAverageResolutionHours(filteredTickets);
  const avgRating = calculateAverageRating(filteredTickets);
  const groupBy = REPORT_GROUP_BY_SET.has(filters.groupBy) ? filters.groupBy : "daily";
  const departments = [...new Set(tickets.map((ticket) => ticket.department).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );

  return {
    totalTickets: filteredTickets.length,
    overdueTickets: overdueTickets.length,
    avgResolutionHours,
    avgRating,
    ratedTickets: filteredTickets.filter((ticket) => Number(ticket.rating) > 0).length,
    completedToday: countTicketsCompletedToday(filteredTickets),
    byStatus: buildFixedCounts(STATUS_VALUES, filteredTickets, (ticket) => ticket.status),
    byPriority: buildFixedCounts(PRIORITY_VALUES, filteredTickets, (ticket) => ticket.priority),
    byCategory: categories.map((category) => ({
      label: category.name,
      value: filteredTickets.filter((ticket) => ticket.category_id === category.id).length,
    })),
    byTechnician: technicians.map((technician) => ({
      label: technician.full_name,
      value: filteredTickets.filter((ticket) => ticket.assigned_to === technician.id).length,
    })),
    byDepartment: summarizeByLabel(filteredTickets, (ticket) => ticket.department || "Tanpa Departemen"),
    ratingDistribution: [1, 2, 3, 4, 5].map((value) => ({
      label: `${value}`,
      value: filteredTickets.filter((ticket) => Number(ticket.rating) === value).length,
    })),
    trend: buildTrendSeries(filteredTickets, { groupBy, field: "created_at", limit: 8 }),
    departments,
  };
}

function buildDashboardSummaryFromData(tickets, announcements) {
  const overdueTickets = tickets.filter((ticket) => isTicketOverdue(ticket));
  const nearSlaTickets = tickets.filter((ticket) => isTicketApproachingSla(ticket));
  const highPriorityTickets = [...tickets]
    .sort((left, right) => getPriorityRank(right.priority) - getPriorityRank(left.priority))
    .slice(0, 5);

  return {
    stats: {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "Open").length,
      assigned: tickets.filter((ticket) => ticket.status === "Assigned").length,
      inProgress: tickets.filter((ticket) => ticket.status === "In Progress").length,
      waitingUser: tickets.filter((ticket) => ticket.status === "Waiting User").length,
      resolved: tickets.filter((ticket) => ticket.status === "Resolved").length,
      closed: tickets.filter((ticket) => ticket.status === "Closed").length,
      overdue: overdueTickets.length,
      completedToday: countTicketsCompletedToday(tickets),
      avgResolutionHours: calculateAverageResolutionHours(tickets),
      avgRating: calculateAverageRating(tickets),
    },
    recentTickets: tickets.slice(0, 5),
    highPriorityTickets,
    byStatus: summarizeByLabel(tickets, (ticket) => ticket.status),
    byPriority: summarizeByLabel(tickets, (ticket) => ticket.priority),
    byCategory: summarizeByLabel(tickets, (ticket) => ticket.category?.name || "Tanpa Kategori"),
    byTechnician: summarizeByLabel(tickets, (ticket) => ticket.assignee?.full_name || "Belum di-assign"),
    trend: buildTrendSeries(tickets, { groupBy: "daily", field: "created_at", limit: 7 }),
    trendDaily: buildTrendSeries(tickets, { groupBy: "daily", field: "created_at", limit: 7 }),
    trendWeekly: buildTrendSeries(tickets, { groupBy: "weekly", field: "created_at", limit: 6 }),
    trendMonthly: buildTrendSeries(tickets, { groupBy: "monthly", field: "created_at", limit: 6 }),
    nearSlaTickets: [...nearSlaTickets]
      .sort((left, right) => (toTime(left.sla_deadline) || Number.MAX_SAFE_INTEGER) - (toTime(right.sla_deadline) || Number.MAX_SAFE_INTEGER))
      .slice(0, 5),
    overdueTickets: [...overdueTickets]
      .sort((left, right) => (toTime(left.sla_deadline) || Number.MAX_SAFE_INTEGER) - (toTime(right.sla_deadline) || Number.MAX_SAFE_INTEGER))
      .slice(0, 5),
    announcements: announcements.slice(0, 3),
  };
}

function isEditableTicketFieldPresent(updates) {
  return EDITABLE_TICKET_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(updates, field));
}

function getEditableFieldChanges(previousTicket, updates) {
  return EDITABLE_TICKET_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(updates, field) &&
      (previousTicket?.[field] || null) !== (updates?.[field] || null),
  );
}

function buildTicketUpdateDescription(changedFields) {
  if (!changedFields.length) {
    return "Detail tiket diperbarui.";
  }

  return `Detail tiket diperbarui: ${changedFields.join(", ")}.`;
}

function assertAdminProfile(profile, message = "Anda tidak memiliki akses untuk aksi ini.") {
  if (!ADMIN_ROLES.has(profile?.role || "")) {
    throw new Error(message);
  }
}

function assertTicketVisible(ticket, currentProfile) {
  if (!ticket) {
    throw new Error("Tiket tidak ditemukan.");
  }

  const actorRole = currentProfile?.role || "";

  if (ADMIN_ROLES.has(actorRole)) {
    return;
  }

  if (actorRole === "technician" && ticket.assigned_to === currentProfile?.id) {
    return;
  }

  if (ticket.created_by === currentProfile?.id) {
    return;
  }

  throw new Error("Anda tidak memiliki akses ke tiket ini.");
}

function assertTicketUpdateAllowed(currentTicket, updates, currentProfile) {
  const actorRole = currentProfile?.role || "";
  const isAdmin = ADMIN_ROLES.has(actorRole);
  const isOwner = currentTicket.created_by === currentProfile?.id;
  const isAssignedTechnician = currentTicket.assigned_to === currentProfile?.id;

  if (Object.prototype.hasOwnProperty.call(updates, "assigned_to") && !isAdmin) {
    throw new Error("Hanya admin yang dapat mengubah assignment teknisi.");
  }

  if (isEditableTicketFieldPresent(updates)) {
    if (isAdmin) {
      return;
    }

    if (!isOwner || currentTicket.status !== "Open") {
      throw new Error("Tiket hanya dapat diedit oleh pembuatnya selama masih berstatus Open.");
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (isAdmin) {
      return;
    }

    if (actorRole === "technician" && !isAssignedTechnician) {
      throw new Error("Anda tidak memiliki akses untuk mengubah status tiket ini.");
    }

    if (actorRole === "user") {
      if (!isOwner) {
        throw new Error("Anda tidak memiliki akses untuk mengubah status tiket ini.");
      }

      if (!["Open", "Closed"].includes(updates.status)) {
        throw new Error("User hanya dapat melakukan close atau reopen tiket.");
      }
    }
  }
}

function normalizeUploadScope(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["ticket", "comment"].includes(normalized) ? normalized : "new-ticket";
}

async function insertAuditLog(entry, client = pool) {
  await client.query(
    `
      insert into audit_logs (id, user_id, action, module, target_id, description, ip_address, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      entry.id || generateId("audit"),
      entry.user_id || null,
      entry.action,
      entry.module,
      entry.target_id || null,
      entry.description || null,
      entry.ip_address || "127.0.0.1",
      entry.created_at || nowIso(),
    ],
  );
}

async function insertNotification(userId, title, message, type, relatedTicketId, client = pool) {
  if (!userId) {
    return null;
  }

  const notification = {
    id: generateId("notif"),
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    related_ticket_id: relatedTicketId || null,
    created_at: nowIso(),
  };

  await client.query(
    `
      insert into notifications (id, user_id, title, message, type, is_read, related_ticket_id, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      notification.id,
      notification.user_id,
      notification.title,
      notification.message,
      notification.type,
      false,
      notification.related_ticket_id,
      notification.created_at,
    ],
  );

  return notification;
}

async function isEmailNotificationEnabled(client = pool) {
  const row = await queryOne(
    client,
    `
      select value
      from system_settings
      where key = 'enable_email_notifications'
    `,
  );

  return normalizeBooleanSetting(row?.value, false);
}

function queueEmailJob(emailJobs, job) {
  if (!Array.isArray(emailJobs) || !job?.recipient?.email) {
    return;
  }

  emailJobs.push(job);
}

async function queueTicketNotificationEmail(userId, title, message, ticket, emailJobs, client = pool) {
  if (!Array.isArray(emailJobs) || !userId) {
    return;
  }

  const recipient = await findProfileById(userId, client);

  if (!recipient?.email) {
    return;
  }

  queueEmailJob(emailJobs, {
    recipient,
    title,
    message,
    ticketId: ticket?.id || null,
    ticketNumber: ticket?.ticket_number || null,
  });
}

async function insertNotificationWithEmail(
  { userId, title, message, type, relatedTicketId, ticket, emailJobs },
  client = pool,
) {
  const notification = await insertNotification(userId, title, message, type, relatedTicketId, client);

  if (notification) {
    await queueTicketNotificationEmail(
      userId,
      title,
      message,
      ticket || { id: relatedTicketId || null },
      emailJobs,
      client,
    );
  }

  return notification;
}

async function flushTicketNotificationEmails(emailJobs) {
  if (!Array.isArray(emailJobs) || !emailJobs.length) {
    return;
  }

  for (const emailJob of emailJobs) {
    try {
      await sendTicketNotificationEmail(emailJob);
    } catch (error) {
      console.error("Gagal mengirim email notifikasi tiket:", error);
    }
  }
}

async function insertTicketLog(ticketId, userId, action, oldValue, newValue, description, createdAt, client = pool) {
  await client.query(
    `
      insert into ticket_logs (id, ticket_id, user_id, action, old_value, new_value, description, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [generateId("log"), ticketId, userId || null, action, oldValue || null, newValue || null, description || null, createdAt || nowIso()],
  );
}

async function findProfileById(profileId, client = pool) {
  return queryOne(
    client,
    `
      select id, full_name, email, role, department, position, specialization, phone, is_active, created_at, updated_at
      from profiles
      where id = $1
    `,
    [profileId],
  );
}

async function findCategoryById(categoryId, client = pool) {
  return queryOne(
    client,
    `
      select id, name, description, is_active, sort_order, created_at, updated_at
      from ticket_categories
      where id = $1
    `,
    [categoryId],
  );
}

async function findSlaSettingById(slaId, client = pool) {
  return queryOne(
    client,
    `
      select id, priority, response_time_hours, resolution_time_hours, is_active, created_at, updated_at
      from sla_settings
      where id = $1
    `,
    [slaId],
  );
}

async function findSlaSettingByPriority(priority, client = pool) {
  return queryOne(
    client,
    `
      select id, priority, response_time_hours, resolution_time_hours, is_active, created_at, updated_at
      from sla_settings
      where priority = $1
      order by updated_at desc, created_at desc
      limit 1
    `,
    [priority],
  );
}

async function findAnnouncementById(announcementId, client = pool) {
  return queryOne(
    client,
    `
      select id, title, content, is_active, start_date, end_date, created_by, created_at, updated_at
      from announcements
      where id = $1
    `,
    [announcementId],
  );
}

async function findTicketRowById(ticketId, client = pool) {
  return queryOne(
    client,
    `
      select
        id,
        ticket_number,
        title,
        description,
        category_id,
        priority,
        status,
        created_by,
        assigned_to,
        department,
        location,
        contact_number,
        sla_deadline,
        resolved_at,
        closed_at,
        rating,
        feedback,
        created_at,
        updated_at
      from tickets
      where id = $1
    `,
    [ticketId],
  );
}

async function fetchProfilesMap(profileIds, client = pool) {
  const ids = unique(profileIds);

  if (!ids.length) {
    return new Map();
  }

  const result = await client.query(
    `
      select id, full_name, email, role, department, position, specialization, phone, is_active, created_at, updated_at
      from profiles
      where id = any($1::text[])
    `,
    [ids],
  );

  return new Map(result.rows.map((row) => [row.id, row]));
}

async function buildAnnouncementRows(announcementRows, client = pool) {
  const profilesMap = await fetchProfilesMap(announcementRows.map((row) => row.created_by), client);

  return announcementRows.map((announcement) => ({
    ...announcement,
    creator: profilesMap.get(announcement.created_by) || null,
  }));
}

async function fetchCategoriesMap(categoryIds, client = pool) {
  const ids = unique(categoryIds);

  if (!ids.length) {
    return new Map();
  }

  const result = await client.query(
    `
      select id, name, description, is_active, sort_order, created_at, updated_at
      from ticket_categories
      where id = any($1::text[])
    `,
    [ids],
  );

  return new Map(result.rows.map((row) => [row.id, row]));
}

async function fetchTicketAttachmentsByTicketIds(ticketIds, client = pool) {
  const ids = unique(ticketIds);

  if (!ids.length) {
    return new Map();
  }

  const result = await client.query(
    `
      select id, ticket_id, uploaded_by, file_name, file_url, file_type, file_size, created_at
      from ticket_attachments
      where ticket_id = any($1::text[])
      order by created_at asc, id asc
    `,
    [ids],
  );

  return result.rows.reduce((accumulator, row) => {
    const bucket = accumulator.get(row.ticket_id) || [];
    bucket.push(normalizeAttachmentRow(row));
    accumulator.set(row.ticket_id, bucket);
    return accumulator;
  }, new Map());
}

async function buildEnrichedTickets(ticketRows, client = pool) {
  const [profilesMap, categoriesMap, attachmentsByTicket] = await Promise.all([
    fetchProfilesMap(
      ticketRows.flatMap((ticket) => [ticket.created_by, ticket.assigned_to]),
      client,
    ),
    fetchCategoriesMap(ticketRows.map((ticket) => ticket.category_id), client),
    fetchTicketAttachmentsByTicketIds(ticketRows.map((ticket) => ticket.id), client),
  ]);

  return ticketRows.map((ticket) => ({
    ...ticket,
    category: categoriesMap.get(ticket.category_id) || null,
    creator: profilesMap.get(ticket.created_by) || null,
    assignee: profilesMap.get(ticket.assigned_to) || null,
    attachments: attachmentsByTicket.get(ticket.id) || [],
  }));
}

async function getVisibleTicketRows(currentProfile, client = pool) {
  if (!currentProfile?.id) {
    return [];
  }

  const actorRole = currentProfile.role || "";
  const params = [];
  let whereClause = "";

  if (actorRole === "user") {
    params.push(currentProfile.id);
    whereClause = "where created_by = $1";
  } else if (actorRole === "technician") {
    params.push(currentProfile.id);
    whereClause = "where assigned_to = $1";
  }

  const result = await client.query(
    `
      select
        id,
        ticket_number,
        title,
        description,
        category_id,
        priority,
        status,
        created_by,
        assigned_to,
        department,
        location,
        contact_number,
        sla_deadline,
        resolved_at,
        closed_at,
        rating,
        feedback,
        created_at,
        updated_at
      from tickets
      ${whereClause}
      order by updated_at desc, created_at desc, id asc
    `,
    params,
  );

  return result.rows;
}

async function getNextCategorySortOrder(client = pool) {
  const row = await queryOne(client, "select coalesce(max(sort_order), 0)::int as value from ticket_categories");
  return Number(row?.value || 0) + 1;
}

async function getResolutionHoursForPriority(priority, client = pool) {
  const row = await queryOne(
    client,
    `
      select resolution_time_hours
      from sla_settings
      where priority = $1
        and is_active = true
      order by updated_at desc, created_at desc
      limit 1
    `,
    [priority],
  );

  return Number(row?.resolution_time_hours) || getPriorityResolutionHours(priority);
}

async function generateTicketNumber(client = pool) {
  const now = new Date();
  const prefix = buildTicketNumberPrefix(now);
  const row = await queryOne(
    client,
    `
      select ticket_number
      from tickets
      where ticket_number like $1
      order by ticket_number desc
      limit 1
    `,
    [`${prefix}%`],
  );

  const nextSequence = row?.ticket_number ? Number(row.ticket_number.slice(-4)) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

async function insertTicketAttachments(ticketId, currentProfileId, attachments, createdAt, client = pool) {
  for (const attachment of normalizeAttachmentInput(attachments)) {
    await client.query(
      `
        insert into ticket_attachments (id, ticket_id, uploaded_by, file_name, file_url, file_type, file_size, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        generateId("attachment"),
        ticketId,
        currentProfileId || null,
        attachment.file_name,
        attachment.file_url,
        attachment.file_type,
        attachment.file_size,
        createdAt || nowIso(),
      ],
    );
  }
}

async function insertCommentAttachments(ticketId, commentId, currentProfileId, attachments, createdAt, client = pool) {
  for (const attachment of normalizeAttachmentInput(attachments)) {
    await client.query(
      `
        insert into ticket_comment_attachments (
          id, ticket_id, comment_id, uploaded_by, file_name, file_url, file_type, file_size, created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        generateId("comment-attachment"),
        ticketId,
        commentId,
        currentProfileId || null,
        attachment.file_name,
        attachment.file_url,
        attachment.file_type,
        attachment.file_size,
        createdAt || nowIso(),
      ],
    );
  }
}

async function touchTicket(ticketId, updatedAt = nowIso(), client = pool) {
  await client.query("update tickets set updated_at = $2 where id = $1", [ticketId, updatedAt]);
}

async function notifyTicketParticipants(ticket, currentProfile, title, message, type, emailJobs = null, client = pool) {
  const recipients = unique([ticket.created_by, ticket.assigned_to]).filter((userId) => userId !== currentProfile?.id);

  for (const userId of recipients) {
    await insertNotificationWithEmail(
      {
        userId,
        title,
        message,
        type,
        relatedTicketId: ticket.id,
        ticket,
        emailJobs,
      },
      client,
    );
  }
}

export async function listProfiles(roleFilter, client = pool) {
  const params = [];
  let whereClause = "";

  if (roleFilter && roleFilter !== "All") {
    params.push(roleFilter);
    whereClause = "where role = $1";
  }

  const result = await client.query(
    `
      select id, full_name, email, role, department, position, specialization, phone, is_active, created_at, updated_at
      from profiles
      ${whereClause}
      order by created_at desc, id asc
    `,
    params,
  );

  return result.rows;
}

export async function listTechnicianMetrics(client = pool) {
  const [technicians, ticketRows] = await Promise.all([
    listProfiles("technician", client),
    client
      .query(
        `
          select assigned_to, status, created_at, resolved_at, closed_at
          from tickets
          where assigned_to is not null
        `,
      )
      .then((result) => result.rows),
  ]);

  return technicians.map((technician) => {
    const assignedTickets = ticketRows.filter((ticket) => ticket.assigned_to === technician.id);
    const resolvedDurations = assignedTickets
      .map(getTicketResolutionHours)
      .filter((value) => value !== null);

    return {
      ...technician,
      active_tickets: assignedTickets.filter((ticket) => !["Closed", "Rejected"].includes(ticket.status)).length,
      completed_tickets: assignedTickets.filter((ticket) => ticket.status === "Closed").length,
      average_resolution_hours: resolvedDurations.length
        ? resolvedDurations.reduce((total, value) => total + value, 0) / resolvedDurations.length
        : null,
    };
  });
}

export async function listCategories(client = pool) {
  const result = await client.query(
    `
      select id, name, description, is_active, sort_order, created_at, updated_at
      from ticket_categories
      order by sort_order asc, created_at asc, id asc
    `,
  );

  return result.rows;
}

export async function listSlaSettings(client = pool) {
  const result = await client.query(
    `
      select id, priority, response_time_hours, resolution_time_hours, is_active, created_at, updated_at
      from sla_settings
      order by resolution_time_hours asc, priority asc
    `,
  );

  return result.rows;
}

export async function saveSlaSetting(actorProfile, payload) {
  return withTransaction(async (client) => {
    assertAdminProfile(actorProfile, "Anda tidak memiliki akses untuk mengelola konfigurasi SLA.");

    const priority = payload?.priority || "";
    const responseTimeHours = toPositiveInteger(payload?.response_time_hours, 0);
    const resolutionTimeHours = toPositiveInteger(payload?.resolution_time_hours, 0);

    if (!PRIORITY_OPTION_SET.has(priority)) {
      throw new Error("Prioritas SLA tidak valid.");
    }

    if (responseTimeHours <= 0) {
      throw new Error("Target response time harus lebih besar dari 0 jam.");
    }

    if (resolutionTimeHours <= 0) {
      throw new Error("Target resolution time harus lebih besar dari 0 jam.");
    }

    const existingById = payload?.id ? await findSlaSettingById(payload.id, client) : null;
    const existingByPriority = await findSlaSettingByPriority(priority, client);

    if (payload?.id && !existingById) {
      throw new Error("Konfigurasi SLA tidak ditemukan.");
    }

    if (existingByPriority && existingByPriority.id !== payload?.id) {
      throw new Error("Prioritas SLA ini sudah memiliki konfigurasi aktif.");
    }

    const timestamp = nowIso();
    let savedSetting = null;

    if (existingById) {
      await client.query(
        `
          update sla_settings
          set
            priority = $2,
            response_time_hours = $3,
            resolution_time_hours = $4,
            is_active = $5,
            updated_at = $6
          where id = $1
        `,
        [
          existingById.id,
          priority,
          responseTimeHours,
          resolutionTimeHours,
          payload?.is_active !== false,
          timestamp,
        ],
      );

      savedSetting = await findSlaSettingById(existingById.id, client);
    } else {
      savedSetting = {
        id: generateId("sla"),
        priority,
        response_time_hours: responseTimeHours,
        resolution_time_hours: resolutionTimeHours,
        is_active: payload?.is_active !== false,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await client.query(
        `
          insert into sla_settings (id, priority, response_time_hours, resolution_time_hours, is_active, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          savedSetting.id,
          savedSetting.priority,
          savedSetting.response_time_hours,
          savedSetting.resolution_time_hours,
          savedSetting.is_active,
          savedSetting.created_at,
          savedSetting.updated_at,
        ],
      );
    }

    await insertAuditLog(
      {
        user_id: actorProfile.id,
        action: existingById ? "update_sla" : "create_sla",
        module: "sla_settings",
        target_id: savedSetting.id,
        description: existingById
          ? `Memperbarui SLA prioritas ${savedSetting.priority}.`
          : `Menambahkan SLA prioritas ${savedSetting.priority}.`,
        created_at: timestamp,
      },
      client,
    );

    return savedSetting;
  });
}

export async function saveCategory(actorProfile, payload) {
  return withTransaction(async (client) => {
    assertAdminProfile(actorProfile, "Anda tidak memiliki akses untuk mengelola kategori tiket.");

    const name = payload?.name?.trim() || "";
    const description = payload?.description?.trim() || "";

    if (!name) {
      throw new Error("Nama kategori wajib diisi.");
    }

    const timestamp = nowIso();
    let category = null;

    if (payload?.id) {
      const existingCategory = await findCategoryById(payload.id, client);

      if (!existingCategory) {
        throw new Error("Kategori tiket tidak ditemukan.");
      }

      await client.query(
        `
          update ticket_categories
          set
            name = $2,
            description = $3,
            is_active = $4,
            sort_order = $5,
            updated_at = $6
          where id = $1
        `,
        [
          payload.id,
          name,
          description || null,
          payload.is_active !== false,
          toPositiveInteger(payload.sort_order, existingCategory.sort_order || 1),
          timestamp,
        ],
      );

      category = await findCategoryById(payload.id, client);
    } else {
      category = {
        id: generateId("category"),
        name,
        description: description || null,
        is_active: payload?.is_active !== false,
        sort_order: toPositiveInteger(payload?.sort_order, await getNextCategorySortOrder(client)),
        created_at: timestamp,
        updated_at: timestamp,
      };

      await client.query(
        `
          insert into ticket_categories (id, name, description, is_active, sort_order, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          category.id,
          category.name,
          category.description,
          category.is_active,
          category.sort_order,
          category.created_at,
          category.updated_at,
        ],
      );
    }

    await insertAuditLog(
      {
        user_id: actorProfile.id,
        action: payload?.id ? "update_category" : "create_category",
        module: "ticket_categories",
        target_id: category.id,
        description: payload?.id
          ? `Memperbarui kategori ${category.name}.`
          : `Menambahkan kategori ${category.name}.`,
        created_at: timestamp,
      },
      client,
    );

    return category;
  });
}

export async function deleteCategory(actorProfile, categoryId) {
  return withTransaction(async (client) => {
    assertAdminProfile(actorProfile, "Anda tidak memiliki akses untuk mengelola kategori tiket.");

    if (!categoryId) {
      throw new Error("Kategori tiket tidak valid.");
    }

    const category = await findCategoryById(categoryId, client);

    if (!category) {
      throw new Error("Kategori tiket tidak ditemukan.");
    }

    const usageRow = await queryOne(
      client,
      `
        select count(*)::int as count
        from tickets
        where category_id = $1
      `,
      [categoryId],
    );

    if (Number(usageRow?.count || 0) > 0) {
      throw new Error("Kategori tidak dapat dihapus karena masih digunakan oleh tiket aktif.");
    }

    await client.query("delete from ticket_categories where id = $1", [categoryId]);
    await insertAuditLog(
      {
        user_id: actorProfile.id,
        action: "delete_category",
        module: "ticket_categories",
        target_id: categoryId,
        description: `Menghapus kategori ${category.name}.`,
      },
      client,
    );

    return categoryId;
  });
}

export async function listNotifications(userId, options = {}) {
  const client = options.client || pool;
  const limit = toPositiveInteger(options.limit, 8);

  if (!userId) {
    return [];
  }

  const result = await client.query(
    `
      select id, user_id, title, message, type, is_read, related_ticket_id, created_at
      from notifications
      where user_id = $1
      order by created_at desc, id asc
      limit $2
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function markAllNotificationsRead(userId, options = {}) {
  const limit = toPositiveInteger(options.limit, 8);

  return withTransaction(async (client) => {
    if (!userId) {
      return [];
    }

    await client.query(
      `
        update notifications
        set is_read = true
        where user_id = $1
          and is_read = false
      `,
      [userId],
    );

    return listNotifications(userId, { limit, client });
  });
}

export async function markNotificationRead(userId, notificationId, options = {}) {
  const limit = toPositiveInteger(options.limit, 8);

  return withTransaction(async (client) => {
    if (!userId || !notificationId) {
      return [];
    }

    await client.query(
      `
        update notifications
        set is_read = true
        where id = $1
          and user_id = $2
          and is_read = false
      `,
      [notificationId, userId],
    );

    return listNotifications(userId, { limit, client });
  });
}

export async function createAttachmentUploadUrls(payload, currentProfile, client = pool) {
  if (!currentProfile?.id) {
    throw new Error("Session user tidak tersedia.");
  }

  const files = Array.isArray(payload?.files) ? payload.files : [];

  if (!files.length) {
    throw new Error("Pilih minimal satu file sebelum menyiapkan upload lampiran.");
  }

  for (const file of files) {
    const validationMessage = validateAttachmentDescriptor(
      {
        fileName: file?.file_name || file?.fileName || "",
        fileType: file?.file_type || file?.fileType || "",
        fileSize: file?.file_size || file?.fileSize || 0,
      },
      { maxFileSizeBytes: ATTACHMENT_MAX_BYTES },
    );

    if (validationMessage) {
      throw new Error(validationMessage);
    }
  }

  const scope = normalizeUploadScope(payload?.scope);
  const ticketId = payload?.ticketId || null;

  if (scope !== "new-ticket") {
    if (!ticketId) {
      throw new Error("Ticket ID wajib disertakan untuk upload lampiran pada tiket yang sudah ada.");
    }

    const currentTicket = await findTicketRowById(ticketId, client);
    assertTicketVisible(currentTicket, currentProfile);
  }

  return createPresignedUploadBatch(files, {
    scope,
    ticketId,
  });
}

export async function uploadAttachmentBinary(payload, currentProfile, client = pool) {
  if (!currentProfile?.id) {
    throw new Error("Session user tidak tersedia.");
  }

  const fileName = String(payload?.fileName || payload?.file_name || "attachment").trim() || "attachment";
  const fileType = String(payload?.fileType || payload?.file_type || "application/octet-stream").trim()
    || "application/octet-stream";
  const buffer = Buffer.isBuffer(payload?.buffer) ? payload.buffer : Buffer.from(payload?.buffer || []);
  const fileSize = buffer.length;
  const validationMessage = validateAttachmentDescriptor({
    fileName,
    fileType,
    fileSize,
  });

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const scope = normalizeUploadScope(payload?.scope);
  const ticketId = payload?.ticketId || null;

  if (scope !== "new-ticket") {
    if (!ticketId) {
      throw new Error("Ticket ID wajib disertakan untuk upload lampiran pada tiket yang sudah ada.");
    }

    const currentTicket = await findTicketRowById(ticketId, client);
    assertTicketVisible(currentTicket, currentProfile);
  }

  return uploadObjectBuffer(
    {
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      buffer,
    },
    {
      scope,
      ticketId,
    },
  );
}

export async function listTickets(actorProfile, _filters = {}, client = pool) {
  const ticketRows = await getVisibleTicketRows(actorProfile, client);
  const tickets = await buildEnrichedTickets(ticketRows, client);
  return sortTicketsCollection(filterTicketsForReport(tickets, _filters), _filters.sortBy || "latest");
}

export async function getTicketDetail(ticketId, actorProfile, client = pool) {
  const ticketRow = await findTicketRowById(ticketId, client);
  assertTicketVisible(ticketRow, actorProfile);

  const [ticket] = await buildEnrichedTickets([ticketRow], client);
  const [commentRows, logRows, commentAttachmentRows] = await Promise.all([
    client
      .query(
        `
          select id, ticket_id, user_id, comment, is_internal, created_at
          from ticket_comments
          where ticket_id = $1
          order by created_at asc, id asc
        `,
        [ticketId],
      )
      .then((result) => result.rows),
    client
      .query(
        `
          select id, ticket_id, user_id, action, old_value, new_value, description, created_at
          from ticket_logs
          where ticket_id = $1
          order by created_at asc, id asc
        `,
        [ticketId],
      )
      .then((result) => result.rows),
    client
      .query(
        `
          select id, ticket_id, comment_id, uploaded_by, file_name, file_url, file_type, file_size, created_at
          from ticket_comment_attachments
          where ticket_id = $1
          order by created_at asc, id asc
        `,
        [ticketId],
      )
      .then((result) => result.rows.map(normalizeAttachmentRow)),
  ]);

  const profilesMap = await fetchProfilesMap(
    [
      ticket.created_by,
      ticket.assigned_to,
      ...commentRows.map((comment) => comment.user_id),
      ...logRows.map((log) => log.user_id),
    ],
    client,
  );

  const attachmentsByComment = commentAttachmentRows.reduce((accumulator, attachment) => {
    const bucket = accumulator.get(attachment.comment_id) || [];
    bucket.push(attachment);
    accumulator.set(attachment.comment_id, bucket);
    return accumulator;
  }, new Map());
  const signedTicketAttachments = await signAttachmentCollection(ticket.attachments || []);

  const comments = await Promise.all(
    commentRows.map(async (comment) => ({
      ...comment,
      user: profilesMap.get(comment.user_id) || null,
      attachments: await signAttachmentCollection(attachmentsByComment.get(comment.id) || []),
    })),
  );

  return {
    ...ticket,
    comments,
    logs: logRows.map((log) => ({
      ...log,
      user: profilesMap.get(log.user_id) || null,
    })),
    attachments: signedTicketAttachments,
  };
}

export async function createTicket(payload, currentProfile) {
  let emailJobs = null;

  const ticket = await withTransaction(async (client) => {
    if (!currentProfile?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    emailJobs = (await isEmailNotificationEnabled(client)) ? [] : null;

    const title = payload?.title?.trim() || "";
    const description = payload?.description?.trim() || "";
    const categoryId = payload?.category_id || "";
    const priority = payload?.priority || "";

    if (!title) {
      throw new Error("Judul tiket wajib diisi.");
    }

    if (!description) {
      throw new Error("Deskripsi tiket wajib diisi.");
    }

    if (!categoryId) {
      throw new Error("Kategori tiket wajib dipilih.");
    }

    if (!PRIORITY_OPTION_SET.has(priority)) {
      throw new Error("Prioritas tiket tidak valid.");
    }

    const category = await findCategoryById(categoryId, client);

    if (!category || category.is_active === false) {
      throw new Error("Kategori tiket tidak tersedia.");
    }

    const createdAt = nowIso();
    const ticketId = generateId("ticket");
    const ticketNumber = await generateTicketNumber(client);
    const resolutionHours = await getResolutionHoursForPriority(priority, client);
    const slaDeadline = new Date(Date.now() + resolutionHours * 60 * 60 * 1000).toISOString();

    await client.query(
      `
        insert into tickets (
          id, ticket_number, title, description, category_id, priority, status, created_by, assigned_to,
          department, location, contact_number, sla_deadline, resolved_at, closed_at, rating, feedback, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, null, null, null, null, $14, $15)
      `,
      [
        ticketId,
        ticketNumber,
        title,
        description,
        categoryId,
        priority,
        "Open",
        currentProfile.id,
        null,
        payload?.department?.trim() || null,
        payload?.location?.trim() || null,
        payload?.contact_number?.trim() || null,
        slaDeadline,
        createdAt,
        createdAt,
      ],
    );

    await insertTicketAttachments(ticketId, currentProfile.id, payload?.attachments || [], createdAt, client);
    await insertTicketLog(ticketId, currentProfile.id, "ticket_created", null, "Open", "Tiket baru dibuat.", createdAt, client);

    await insertNotificationWithEmail(
      {
        userId: currentProfile.id,
        title: "Tiket berhasil dibuat",
        message: `${ticketNumber} berhasil dibuat dan menunggu review admin.`,
        type: "ticket_created",
        relatedTicketId: ticketId,
        ticket: { id: ticketId, ticket_number: ticketNumber },
        emailJobs,
      },
      client,
    );

    const adminProfiles = await client.query(
      `
        select id
        from profiles
        where role = any($1::text[])
          and is_active = true
          and id <> $2
      `,
      [["admin", "super_admin"], currentProfile.id],
    );

    for (const adminProfile of adminProfiles.rows) {
      await insertNotificationWithEmail(
        {
          userId: adminProfile.id,
          title: "Tiket baru masuk",
          message: `${ticketNumber} baru saja dibuat oleh user.`,
          type: "ticket_created",
          relatedTicketId: ticketId,
          ticket: { id: ticketId, ticket_number: ticketNumber },
          emailJobs,
        },
        client,
      );
    }

    await insertAuditLog(
      {
        user_id: currentProfile.id,
        action: "create_ticket",
        module: "tickets",
        target_id: ticketId,
        description: `Membuat tiket ${ticketNumber}.`,
        created_at: createdAt,
      },
      client,
    );

    return getTicketDetail(ticketId, currentProfile, client);
  });

  await flushTicketNotificationEmails(emailJobs);
  return ticket;
}

export async function updateTicket(ticketId, updates, currentProfile) {
  let emailJobs = null;

  const ticket = await withTransaction(async (client) => {
    if (!currentProfile?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    emailJobs = (await isEmailNotificationEnabled(client)) ? [] : null;

    const currentTicket = await findTicketRowById(ticketId, client);
    assertTicketVisible(currentTicket, currentProfile);
    assertTicketUpdateAllowed(currentTicket, updates || {}, currentProfile);

    if (updates?.priority && !PRIORITY_OPTION_SET.has(updates.priority)) {
      throw new Error("Prioritas tiket tidak valid.");
    }

    if (updates?.status && !STATUS_OPTION_SET.has(updates.status)) {
      throw new Error("Status tiket tidak valid.");
    }

    if (Object.prototype.hasOwnProperty.call(updates || {}, "category_id")) {
      const category = await findCategoryById(updates.category_id, client);

      if (!category || category.is_active === false) {
        throw new Error("Kategori tiket tidak tersedia.");
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates || {}, "assigned_to") && updates.assigned_to) {
      const assignedProfile = await findProfileById(updates.assigned_to, client);

      if (!assignedProfile || assignedProfile.role !== "technician" || assignedProfile.is_active === false) {
        throw new Error("Teknisi assignment tidak valid.");
      }
    }

    const timestamp = nowIso();
    const editableFieldChanges = getEditableFieldChanges(currentTicket, updates || {});
    const changedFieldLabels = editableFieldChanges.map((field) => EDITABLE_FIELD_LABELS[field]);
    const previousStatus = currentTicket.status;
    const previousAssignee = currentTicket.assigned_to || null;
    const previousRating = currentTicket.rating ?? null;
    const previousFeedback = currentTicket.feedback || null;
    const previousPriority = currentTicket.priority;
    const previousCategoryId = currentTicket.category_id;
    const nextAssignee = Object.prototype.hasOwnProperty.call(updates || {}, "assigned_to")
      ? updates.assigned_to || null
      : previousAssignee;
    const nextRating = Object.prototype.hasOwnProperty.call(updates || {}, "rating")
      ? updates.rating ?? null
      : previousRating;
    const nextFeedback = Object.prototype.hasOwnProperty.call(updates || {}, "feedback")
      ? updates.feedback?.trim() || null
      : previousFeedback;
    const hasFeedbackUpdate = previousRating !== nextRating || previousFeedback !== nextFeedback;

    const nextTicket = {
      ...currentTicket,
      title: Object.prototype.hasOwnProperty.call(updates || {}, "title")
        ? updates.title?.trim() || ""
        : currentTicket.title,
      description: Object.prototype.hasOwnProperty.call(updates || {}, "description")
        ? updates.description?.trim() || ""
        : currentTicket.description,
      category_id: Object.prototype.hasOwnProperty.call(updates || {}, "category_id")
        ? updates.category_id
        : currentTicket.category_id,
      priority: Object.prototype.hasOwnProperty.call(updates || {}, "priority")
        ? updates.priority
        : currentTicket.priority,
      status: Object.prototype.hasOwnProperty.call(updates || {}, "status")
        ? updates.status
        : currentTicket.status,
      assigned_to: nextAssignee,
      department: Object.prototype.hasOwnProperty.call(updates || {}, "department")
        ? updates.department?.trim() || null
        : currentTicket.department,
      location: Object.prototype.hasOwnProperty.call(updates || {}, "location")
        ? updates.location?.trim() || null
        : currentTicket.location,
      contact_number: Object.prototype.hasOwnProperty.call(updates || {}, "contact_number")
        ? updates.contact_number?.trim() || null
        : currentTicket.contact_number,
      rating: nextRating,
      feedback: nextFeedback,
      resolved_at: currentTicket.resolved_at,
      closed_at: currentTicket.closed_at,
      updated_at: timestamp,
    };

    if (Object.prototype.hasOwnProperty.call(updates || {}, "status")) {
      if (updates.status === "Resolved") {
        nextTicket.resolved_at = timestamp;
        nextTicket.closed_at = null;
      }

      if (updates.status === "Closed") {
        nextTicket.resolved_at = currentTicket.resolved_at || timestamp;
        nextTicket.closed_at = timestamp;
      }

      if (!["Resolved", "Closed"].includes(updates.status)) {
        nextTicket.resolved_at = null;
        nextTicket.closed_at = null;
      }
    }

    await client.query(
      `
        update tickets
        set
          title = $2,
          description = $3,
          category_id = $4,
          priority = $5,
          status = $6,
          assigned_to = $7,
          department = $8,
          location = $9,
          contact_number = $10,
          resolved_at = $11,
          closed_at = $12,
          rating = $13,
          feedback = $14,
          updated_at = $15
        where id = $1
      `,
      [
        ticketId,
        nextTicket.title,
        nextTicket.description,
        nextTicket.category_id,
        nextTicket.priority,
        nextTicket.status,
        nextTicket.assigned_to,
        nextTicket.department,
        nextTicket.location,
        nextTicket.contact_number,
        nextTicket.resolved_at,
        nextTicket.closed_at,
        nextTicket.rating,
        nextTicket.feedback,
        nextTicket.updated_at,
      ],
    );

    if (updates?.status && previousStatus !== updates.status) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "status_change",
        previousStatus,
        updates.status,
        `Status tiket diubah menjadi ${updates.status}.`,
        timestamp,
        client,
      );

      await notifyTicketParticipants(
        { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
        currentProfile,
        "Status tiket diperbarui",
        `Tiket ${currentTicket.ticket_number} sekarang berstatus ${updates.status}.`,
        "status_change",
        emailJobs,
        client,
      );
    }

    if (Object.prototype.hasOwnProperty.call(updates || {}, "assigned_to") && previousAssignee !== nextAssignee) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "assigned",
        previousAssignee,
        nextAssignee,
        nextAssignee ? "Tiket di-assign ke teknisi." : "Assignment teknisi pada tiket dilepas.",
        timestamp,
        client,
      );

      if (currentTicket.created_by && currentTicket.created_by !== currentProfile.id) {
        await insertNotificationWithEmail(
          {
            userId: currentTicket.created_by,
            title: "Assignment tiket diperbarui",
            message: nextAssignee
              ? `Tiket ${currentTicket.ticket_number} telah di-assign ke teknisi.`
              : `Assignment teknisi untuk tiket ${currentTicket.ticket_number} telah dilepas.`,
            type: "ticket_assigned",
            relatedTicketId: ticketId,
            ticket: { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
            emailJobs,
          },
          client,
        );
      }

      if (nextAssignee && nextAssignee !== currentProfile.id) {
        await insertNotificationWithEmail(
          {
            userId: nextAssignee,
            title: "Tiket baru ditugaskan",
            message: `Anda menerima assignment tiket ${currentTicket.ticket_number}.`,
            type: "assignment",
            relatedTicketId: ticketId,
            ticket: { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
            emailJobs,
          },
          client,
        );
      }
    }

    if (editableFieldChanges.includes("priority")) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "priority_changed",
        previousPriority,
        updates.priority,
        `Prioritas tiket diubah menjadi ${updates.priority}.`,
        timestamp,
        client,
      );

      await notifyTicketParticipants(
        { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
        currentProfile,
        "Prioritas tiket diperbarui",
        `Prioritas tiket ${currentTicket.ticket_number} diubah menjadi ${updates.priority}.`,
        "priority_change",
        emailJobs,
        client,
      );
    }

    if (editableFieldChanges.includes("category_id")) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "category_changed",
        previousCategoryId,
        updates.category_id,
        "Kategori tiket diperbarui.",
        timestamp,
        client,
      );
    }

    const detailOnlyChanges = changedFieldLabels.filter((label) => !["prioritas", "kategori"].includes(label));

    if (detailOnlyChanges.length) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "ticket_updated",
        null,
        null,
        buildTicketUpdateDescription(detailOnlyChanges),
        timestamp,
        client,
      );

      await notifyTicketParticipants(
        { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
        currentProfile,
        "Detail tiket diperbarui",
        `Detail tiket ${currentTicket.ticket_number} diperbarui.`,
        "ticket_updated",
        emailJobs,
        client,
      );
    }

    if (hasFeedbackUpdate) {
      await insertTicketLog(
        ticketId,
        currentProfile.id,
        "feedback_submitted",
        previousRating ? String(previousRating) : null,
        nextRating ? String(nextRating) : null,
        previousRating || previousFeedback
          ? "Feedback penyelesaian tiket diperbarui."
          : "Feedback penyelesaian tiket ditambahkan.",
        timestamp,
        client,
      );

      if (currentTicket.assigned_to && currentTicket.assigned_to !== currentProfile.id) {
        await insertNotificationWithEmail(
          {
            userId: currentTicket.assigned_to,
            title: "Feedback tiket diperbarui",
            message: `User mengirim feedback untuk tiket ${currentTicket.ticket_number}.`,
            type: "ticket_feedback",
            relatedTicketId: ticketId,
            ticket: { ...currentTicket, id: ticketId, assigned_to: nextAssignee },
            emailJobs,
          },
          client,
        );
      }
    }

    const auditChanges = [];

    if (updates?.status && previousStatus !== updates.status) {
      auditChanges.push(`status ${previousStatus} -> ${updates.status}`);
    }

    if (Object.prototype.hasOwnProperty.call(updates || {}, "assigned_to") && previousAssignee !== nextAssignee) {
      auditChanges.push(nextAssignee ? "assignment teknisi diperbarui" : "assignment teknisi dilepas");
    }

    if (changedFieldLabels.length) {
      auditChanges.push(`detail tiket diperbarui (${changedFieldLabels.join(", ")})`);
    }

    if (hasFeedbackUpdate) {
      auditChanges.push("feedback penyelesaian diperbarui");
    }

    await insertAuditLog(
      {
        user_id: currentProfile.id,
        action: "update_ticket",
        module: "tickets",
        target_id: ticketId,
        description: auditChanges.length
          ? `Memperbarui ${currentTicket.ticket_number}: ${auditChanges.join(", ")}.`
          : `Memperbarui tiket ${currentTicket.ticket_number}.`,
        created_at: timestamp,
      },
      client,
    );

    return getTicketDetail(ticketId, currentProfile, client);
  });

  await flushTicketNotificationEmails(emailJobs);
  return ticket;
}

export async function addTicketAttachments(ticketId, attachments, currentProfile) {
  let emailJobs = null;

  const ticket = await withTransaction(async (client) => {
    if (!currentProfile?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    emailJobs = (await isEmailNotificationEnabled(client)) ? [] : null;

    const currentTicket = await findTicketRowById(ticketId, client);
    assertTicketVisible(currentTicket, currentProfile);

    const normalizedAttachments = normalizeAttachmentInput(attachments);

    if (!normalizedAttachments.length) {
      throw new Error("Pilih minimal satu file sebelum mengunggah lampiran.");
    }

    const timestamp = nowIso();
    await insertTicketAttachments(ticketId, currentProfile.id, normalizedAttachments, timestamp, client);
    await touchTicket(ticketId, timestamp, client);
    await insertTicketLog(
      ticketId,
      currentProfile.id,
      "attachment_added",
      null,
      String(normalizedAttachments.length),
      `${normalizedAttachments.length} lampiran tambahan diunggah.`,
      timestamp,
      client,
    );
    await notifyTicketParticipants(
      { ...currentTicket, id: ticketId },
      currentProfile,
      "Lampiran tiket diperbarui",
      `${normalizedAttachments.length} lampiran tambahan diunggah pada tiket ${currentTicket.ticket_number}.`,
      "attachment_added",
      emailJobs,
      client,
    );
    await insertAuditLog(
      {
        user_id: currentProfile.id,
        action: "add_ticket_attachment",
        module: "tickets",
        target_id: ticketId,
        description: `Menambahkan ${normalizedAttachments.length} lampiran pada tiket ${currentTicket.ticket_number}.`,
        created_at: timestamp,
      },
      client,
    );

    return getTicketDetail(ticketId, currentProfile, client);
  });

  await flushTicketNotificationEmails(emailJobs);
  return ticket;
}

export async function deleteTicket(ticketId, currentProfile) {
  const storedObjectKeys = [];

  const deletedId = await withTransaction(async (client) => {
    if (!currentProfile?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    assertAdminProfile(currentProfile, "Hanya admin yang dapat menghapus tiket.");

    const currentTicket = await findTicketRowById(ticketId, client);

    if (!currentTicket) {
      throw new Error("Tiket tidak ditemukan.");
    }

    const [ticketAttachmentRows, commentAttachmentRows] = await Promise.all([
      client
        .query(
          `
            select file_url
            from ticket_attachments
            where ticket_id = $1
          `,
          [ticketId],
        )
        .then((result) => result.rows),
      client
        .query(
          `
            select file_url
            from ticket_comment_attachments
            where ticket_id = $1
          `,
          [ticketId],
        )
        .then((result) => result.rows),
    ]);

    storedObjectKeys.push(
      ...(ticketAttachmentRows || []).map((row) => row.file_url),
      ...(commentAttachmentRows || []).map((row) => row.file_url),
    );

    await client.query("delete from notifications where related_ticket_id = $1", [ticketId]);
    await client.query("delete from tickets where id = $1", [ticketId]);
    await insertAuditLog(
      {
        user_id: currentProfile.id,
        action: "delete_ticket",
        module: "tickets",
        target_id: ticketId,
        description: `Menghapus tiket ${currentTicket.ticket_number}.`,
      },
      client,
    );

    return ticketId;
  });

  try {
    await deleteStoredObjects(storedObjectKeys);
  } catch (error) {
    console.error("Gagal menghapus object attachment dari storage:", error);
  }

  return deletedId;
}

export async function addComment(ticketId, payload, currentProfile) {
  let emailJobs = null;

  const ticket = await withTransaction(async (client) => {
    if (!currentProfile?.id) {
      throw new Error("Session user tidak tersedia.");
    }

    emailJobs = (await isEmailNotificationEnabled(client)) ? [] : null;

    const currentTicket = await findTicketRowById(ticketId, client);
    assertTicketVisible(currentTicket, currentProfile);

    const commentText = payload?.comment?.trim() || "";

    if (!commentText) {
      throw new Error("Komentar tiket wajib diisi.");
    }

    const timestamp = nowIso();
    const commentId = generateId("comment");
    const normalizedAttachments = normalizeAttachmentInput(payload?.attachments);

    await client.query(
      `
        insert into ticket_comments (id, ticket_id, user_id, comment, is_internal, created_at)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [commentId, ticketId, currentProfile.id, commentText, Boolean(payload?.is_internal), timestamp],
    );

    await insertCommentAttachments(ticketId, commentId, currentProfile.id, normalizedAttachments, timestamp, client);
    await touchTicket(ticketId, timestamp, client);
    await insertTicketLog(
      ticketId,
      currentProfile.id,
      "comment_added",
      null,
      null,
      normalizedAttachments.length
        ? `Komentar baru ditambahkan beserta ${normalizedAttachments.length} lampiran.`
        : "Komentar baru ditambahkan.",
      timestamp,
      client,
    );

    if (!payload?.is_internal && currentTicket.created_by && currentTicket.created_by !== currentProfile.id) {
      await insertNotificationWithEmail(
        {
          userId: currentTicket.created_by,
          title: "Komentar baru pada tiket",
          message: `Ada komentar baru pada tiket ${currentTicket.ticket_number}.`,
          type: "comment_added",
          relatedTicketId: ticketId,
          ticket: { ...currentTicket, id: ticketId },
          emailJobs,
        },
        client,
      );
    }

    if (currentTicket.assigned_to && currentTicket.assigned_to !== currentProfile.id) {
      await insertNotificationWithEmail(
        {
          userId: currentTicket.assigned_to,
          title: "Komentar baru pada tiket",
          message: `Ada komentar baru pada tiket ${currentTicket.ticket_number}.`,
          type: "comment_added",
          relatedTicketId: ticketId,
          ticket: { ...currentTicket, id: ticketId },
          emailJobs,
        },
        client,
      );
    }

    await insertAuditLog(
      {
        user_id: currentProfile.id,
        action: "add_ticket_comment",
        module: "tickets",
        target_id: ticketId,
        description: normalizedAttachments.length
          ? `Menambahkan komentar beserta ${normalizedAttachments.length} lampiran pada tiket ${currentTicket.ticket_number}.`
          : `Menambahkan komentar pada tiket ${currentTicket.ticket_number}.`,
        created_at: timestamp,
      },
      client,
    );

    return getTicketDetail(ticketId, currentProfile, client);
  });

  await flushTicketNotificationEmails(emailJobs);
  return ticket;
}

export async function listActiveAnnouncements(client = pool) {
  const result = await client.query(
    `
      select id, title, content, is_active, start_date, end_date, created_by, created_at, updated_at
      from announcements
      where is_active = true
        and start_date <= now()
        and end_date >= now()
      order by start_date desc, created_at desc, id asc
    `,
  );

  return buildAnnouncementRows(result.rows, client);
}

export async function listAdminAnnouncements(client = pool) {
  const result = await client.query(
    `
      select id, title, content, is_active, start_date, end_date, created_by, created_at, updated_at
      from announcements
      order by created_at desc, id asc
    `,
  );

  return buildAnnouncementRows(result.rows, client);
}

export async function saveAnnouncement(actorProfile, payload) {
  return withTransaction(async (client) => {
    assertAdminProfile(actorProfile, "Anda tidak memiliki akses untuk mengelola pengumuman internal.");

    const title = payload?.title?.trim() || "";
    const content = payload?.content?.trim() || "";
    const startDate = payload?.start_date || null;
    const endDate = payload?.end_date || null;

    if (!title) {
      throw new Error("Judul pengumuman wajib diisi.");
    }

    if (!content) {
      throw new Error("Isi pengumuman wajib diisi.");
    }

    if (!startDate || !endDate) {
      throw new Error("Tanggal mulai dan selesai wajib diisi.");
    }

    if (toTime(endDate) < toTime(startDate)) {
      throw new Error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
    }

    const timestamp = nowIso();
    const existingAnnouncement = payload?.id ? await findAnnouncementById(payload.id, client) : null;

    if (payload?.id && !existingAnnouncement) {
      throw new Error("Pengumuman tidak ditemukan.");
    }

    let savedAnnouncement = null;

    if (existingAnnouncement) {
      await client.query(
        `
          update announcements
          set
            title = $2,
            content = $3,
            is_active = $4,
            start_date = $5,
            end_date = $6,
            updated_at = $7
          where id = $1
        `,
        [payload.id, title, content, payload?.is_active !== false, startDate, endDate, timestamp],
      );

      savedAnnouncement = await findAnnouncementById(payload.id, client);
    } else {
      savedAnnouncement = {
        id: generateId("announcement"),
        title,
        content,
        is_active: payload?.is_active !== false,
        start_date: startDate,
        end_date: endDate,
        created_by: actorProfile.id,
        created_at: timestamp,
        updated_at: timestamp,
      };

      await client.query(
        `
          insert into announcements (id, title, content, is_active, start_date, end_date, created_by, created_at, updated_at)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          savedAnnouncement.id,
          savedAnnouncement.title,
          savedAnnouncement.content,
          savedAnnouncement.is_active,
          savedAnnouncement.start_date,
          savedAnnouncement.end_date,
          savedAnnouncement.created_by,
          savedAnnouncement.created_at,
          savedAnnouncement.updated_at,
        ],
      );
    }

    await insertAuditLog(
      {
        user_id: actorProfile.id,
        action: existingAnnouncement ? "update_announcement" : "create_announcement",
        module: "announcements",
        target_id: savedAnnouncement.id,
        description: existingAnnouncement
          ? `Memperbarui pengumuman ${savedAnnouncement.title}.`
          : `Membuat pengumuman ${savedAnnouncement.title}.`,
        created_at: timestamp,
      },
      client,
    );

    const [enrichedAnnouncement] = await buildAnnouncementRows([savedAnnouncement], client);
    return enrichedAnnouncement;
  });
}

export async function deleteAnnouncement(actorProfile, announcementId) {
  return withTransaction(async (client) => {
    assertAdminProfile(actorProfile, "Anda tidak memiliki akses untuk mengelola pengumuman internal.");

    if (!announcementId) {
      throw new Error("Pengumuman tidak valid.");
    }

    const existingAnnouncement = await findAnnouncementById(announcementId, client);

    if (!existingAnnouncement) {
      throw new Error("Pengumuman tidak ditemukan.");
    }

    await client.query("delete from announcements where id = $1", [announcementId]);
    await insertAuditLog(
      {
        user_id: actorProfile.id,
        action: "delete_announcement",
        module: "announcements",
        target_id: announcementId,
        description: `Menghapus pengumuman ${existingAnnouncement.title}.`,
      },
      client,
    );

    return announcementId;
  });
}

export async function listAuditLogs(client = pool) {
  const result = await client.query(
    `
      select id, user_id, action, module, target_id, description, ip_address, created_at
      from audit_logs
      order by created_at desc, id asc
    `,
  );
  const profilesMap = await fetchProfilesMap(result.rows.map((row) => row.user_id), client);

  return result.rows.map((log) => ({
    ...log,
    user: profilesMap.get(log.user_id) || null,
  }));
}

export async function getDashboardSummary(actorProfile, client = pool) {
  const [tickets, announcements] = await Promise.all([
    listTickets(actorProfile, {}, client),
    listActiveAnnouncements(client),
  ]);

  return buildDashboardSummaryFromData(tickets, announcements);
}

export async function getReportSummary(filters = {}, client = pool) {
  const [ticketRows, categories, technicians, profilesMap] = await Promise.all([
    client
      .query(
        `
          select
            id,
            ticket_number,
            title,
            priority,
            status,
            category_id,
            created_by,
            assigned_to,
            department,
            created_at,
            updated_at,
            resolved_at,
            closed_at,
            rating,
            sla_deadline
          from tickets
        `,
      )
      .then((result) => result.rows),
    listCategories(client),
    listProfiles("technician", client),
    client
      .query(
        `
          select id, full_name, email, role, department, position, specialization, phone, is_active, created_at, updated_at
          from profiles
        `,
      )
      .then((result) => new Map(result.rows.map((row) => [row.id, row]))),
  ]);
  const categoriesMap = new Map(categories.map((category) => [category.id, category]));
  const tickets = ticketRows.map((ticket) => ({
    ...ticket,
    category: categoriesMap.get(ticket.category_id) || null,
    creator: profilesMap.get(ticket.created_by) || null,
    assignee: profilesMap.get(ticket.assigned_to) || null,
  }));

  return buildReportSummaryFromData(tickets, categories, technicians, filters);
}
