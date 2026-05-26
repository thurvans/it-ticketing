import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/utils/constants";

const completedStatuses = new Set(["Resolved", "Closed", "Rejected"]);

function toTime(value) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isSameDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
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
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(date);
}

function formatMonthlyLabel(date) {
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date);
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

export function getPriorityRank(priority) {
  return PRIORITY_OPTIONS.indexOf(priority);
}

export function getStatusRank(status) {
  return STATUS_OPTIONS.indexOf(status);
}

export function isTicketOverdue(ticket, referenceDate = new Date()) {
  const deadlineTime = toTime(ticket?.sla_deadline);

  if (!deadlineTime || completedStatuses.has(ticket?.status)) {
    return false;
  }

  return deadlineTime < referenceDate.getTime();
}

export function getTicketResolutionHours(ticket) {
  const createdTime = toTime(ticket?.created_at);
  const resolvedTime = toTime(ticket?.closed_at || ticket?.resolved_at);

  if (!createdTime || !resolvedTime || resolvedTime < createdTime) {
    return null;
  }

  return (resolvedTime - createdTime) / (1000 * 60 * 60);
}

export function calculateAverageResolutionHours(tickets) {
  const durations = tickets.map(getTicketResolutionHours).filter((value) => value !== null);

  if (!durations.length) {
    return null;
  }

  return durations.reduce((total, value) => total + value, 0) / durations.length;
}

export function calculateAverageRating(tickets) {
  const ratings = tickets.map((ticket) => Number(ticket.rating)).filter((value) => Number.isFinite(value) && value > 0);

  if (!ratings.length) {
    return null;
  }

  return ratings.reduce((total, value) => total + value, 0) / ratings.length;
}

export function countTicketsCompletedToday(tickets, referenceDate = new Date()) {
  return tickets.filter((ticket) => {
    const completionDate = ticket?.closed_at || ticket?.resolved_at;

    if (!completionDate) {
      return false;
    }

    return isSameDay(new Date(completionDate), referenceDate);
  }).length;
}

export function filterTicketsCollection(tickets, filters = {}) {
  const query = normalizeText(filters.query);
  const startTime = toTime(filters.startDate ? `${filters.startDate}T00:00:00` : null);
  const endTime = toTime(filters.endDate ? `${filters.endDate}T23:59:59` : null);

  return tickets.filter((ticket) => {
    const matchesQuery =
      !query ||
      [
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
      matchesQuery &&
      matchesStatus &&
      matchesPriority &&
      matchesCategory &&
      matchesTechnician &&
      matchesDepartment &&
      matchesStart &&
      matchesEnd
    );
  });
}

export function sortTicketsCollection(tickets, sortBy = "latest") {
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

export function summarizeByLabel(items, getLabel) {
  const counts = items.reduce((accumulator, item) => {
    const label = getLabel(item) || "-";
    accumulator.set(label, (accumulator.get(label) || 0) + 1);
    return accumulator;
  }, new Map());

  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

export function buildTrendSeries(tickets, options = {}) {
  const { groupBy = "daily", field = "created_at", limit = 7 } = options;
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

    const bucket = getTrendBucket(date, groupBy);
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
