import { ATTACHMENT_MAX_MB } from "./attachmentRules.js";

export const DEFAULT_APP_NAME = "IT Ticketing System";
export const DEFAULT_WORKSPACE_NAME = "IT Ticketing System";
export const TICKET_NUMBER_PREFIX = "TIKET";
export const PROFILE_ID_LENGTH = 6;
export const PROFILE_ID_START = 100001;

export const ROLES = ["user", "technician", "admin", "super_admin"];

export const ROLE_LABELS = {
  user: "Pengguna",
  technician: "Teknisi",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

export const ROLE_HOME = {
  user: "/user/dashboard",
  technician: "/technician/dashboard",
  admin: "/admin/dashboard",
  super_admin: "/super-admin/settings",
};

export const STATUS_OPTIONS = [
  "Open",
  "Assigned",
  "In Progress",
  "Waiting User",
  "Resolved",
  "Closed",
  "Rejected",
];

export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
export const REPORT_GROUP_BY_OPTIONS = ["daily", "weekly", "monthly"];

export const PERMISSION_MODULES = [
  { key: "dashboard_access", label: "Dashboard", description: "Akses ke ringkasan utama workspace." },
  { key: "ticket_create", label: "Buat Tiket", description: "Membuat tiket baru." },
  { key: "ticket_comment", label: "Komentar Tiket", description: "Menambahkan komentar pada tiket yang dapat diakses." },
  { key: "ticket_update_status", label: "Ubah Status", description: "Mengubah status penanganan tiket." },
  { key: "ticket_assign", label: "Tugaskan Teknisi", description: "Menetapkan tiket kepada teknisi." },
  { key: "ticket_delete", label: "Hapus Tiket", description: "Menghapus tiket beserta relasi datanya." },
  { key: "user_management", label: "Kelola Pengguna", description: "Mengelola akun pengguna dan peran terkait." },
  { key: "technician_management", label: "Kelola Teknisi", description: "Mengelola akun teknisi dan beban kerjanya." },
  { key: "category_management", label: "Kategori Masalah", description: "Mengelola kategori permasalahan layanan TI." },
  { key: "sla_management", label: "SLA", description: "Mengelola target waktu respons dan penyelesaian tiket." },
  { key: "announcement_management", label: "Pengumuman", description: "Mengelola pengumuman internal tim TI." },
  { key: "report_access", label: "Laporan", description: "Mengakses statistik dan mengunduh laporan." },
  { key: "audit_log_access", label: "Riwayat Audit", description: "Melihat jejak audit aktivitas sistem." },
  { key: "system_settings_manage", label: "Pengaturan Sistem", description: "Mengubah konfigurasi utama sistem." },
  { key: "role_management", label: "Kelola Peran", description: "Mengubah peran dan tingkat akses akun lain." },
  { key: "permission_management", label: "Hak Akses", description: "Mengatur hak akses untuk setiap peran pengguna." },
];

export const DEFAULT_SYSTEM_SETTINGS = {
  display_name: DEFAULT_WORKSPACE_NAME,
  logo_url: "",
  allow_self_registration: true,
  attachment_limit_mb: ATTACHMENT_MAX_MB,
  enable_realtime_notifications: true,
  enable_email_notifications: false,
  default_report_group_by: "daily",
};

export const DEFAULT_ROLE_PERMISSIONS = {
  user: {
    dashboard_access: true,
    ticket_create: true,
    ticket_comment: true,
    ticket_update_status: false,
    ticket_assign: false,
    ticket_delete: false,
    user_management: false,
    technician_management: false,
    category_management: false,
    sla_management: false,
    announcement_management: false,
    report_access: false,
    audit_log_access: false,
    system_settings_manage: false,
    role_management: false,
    permission_management: false,
  },
  technician: {
    dashboard_access: true,
    ticket_create: false,
    ticket_comment: true,
    ticket_update_status: true,
    ticket_assign: false,
    ticket_delete: false,
    user_management: false,
    technician_management: false,
    category_management: false,
    sla_management: false,
    announcement_management: false,
    report_access: false,
    audit_log_access: false,
    system_settings_manage: false,
    role_management: false,
    permission_management: false,
  },
  admin: {
    dashboard_access: true,
    ticket_create: false,
    ticket_comment: true,
    ticket_update_status: true,
    ticket_assign: true,
    ticket_delete: true,
    user_management: true,
    technician_management: true,
    category_management: true,
    sla_management: true,
    announcement_management: true,
    report_access: true,
    audit_log_access: true,
    system_settings_manage: false,
    role_management: false,
    permission_management: false,
  },
  super_admin: PERMISSION_MODULES.reduce((accumulator, module) => {
    accumulator[module.key] = true;
    return accumulator;
  }, {}),
};

export function buildTicketNumberPrefix(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = `${referenceDate.getMonth() + 1}`.padStart(2, "0");
  return `${TICKET_NUMBER_PREFIX}-${year}${month}-`;
}

export function getNextProfileId(existingIds = []) {
  const numericIds = (existingIds || [])
    .map((value) => String(value || "").trim())
    .filter((value) => /^\d{6}$/.test(value))
    .map((value) => Number.parseInt(value, 10));

  const nextValue = Math.max(PROFILE_ID_START - 1, ...numericIds) + 1;

  if (nextValue > 999999) {
    throw new Error("ID profile 6 digit sudah habis. Perlu perluasan format ID.");
  }

  return String(nextValue).padStart(PROFILE_ID_LENGTH, "0");
}

export function cloneJson(value) {
  if (value == null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

export function getDefaultSystemSettings() {
  return cloneJson(DEFAULT_SYSTEM_SETTINGS);
}

export function getDefaultRolePermissions() {
  return cloneJson(DEFAULT_ROLE_PERMISSIONS);
}
