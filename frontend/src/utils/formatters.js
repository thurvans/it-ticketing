import clsx from "clsx";
import { ROLE_LABELS } from "@/utils/constants";

export function cn(...inputs) {
  return clsx(inputs);
}

export function truncateText(value = "", maxLength = 24) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDue(value) {
  if (!value) {
    return "-";
  }

  const now = Date.now();
  const due = new Date(value).getTime();
  const diffHours = Math.round((due - now) / (1000 * 60 * 60));

  if (Number.isNaN(diffHours)) {
    return "-";
  }

  if (diffHours < 0) {
    return `${Math.abs(diffHours)} jam lewat SLA`;
  }

  if (diffHours < 24) {
    return `${diffHours} jam lagi`;
  }

  return `${Math.round(diffHours / 24)} hari lagi`;
}

export function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function humanizeRole(role) {
  return ROLE_LABELS[role] || role;
}

export function findOptionLabel(options = [], value, fallback = value) {
  return options.find((option) => option.value === value)?.label || fallback;
}

export function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function toSlug(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
