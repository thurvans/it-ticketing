import {
  faBullhorn,
  faChartColumn,
  faClipboardList,
  faClockRotateLeft,
  faFileCircleCheck,
  faGaugeHigh,
  faPeopleGroup,
  faRectangleList,
  faShieldHalved,
  faSliders,
  faTicket,
  faUserShield,
  faUsers,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";

function buildSection(label, items) {
  return { label, items };
}

export const profilePathByRole = {
  user: "/user/profile",
  technician: "/technician/profile",
  admin: "/admin/profile",
  super_admin: "/admin/profile",
};

export const navigationByRole = {
  user: {
    sections: [
      buildSection("Tiket", [
        { label: "Dashboard", path: "/user/dashboard", icon: faGaugeHigh, permissionKey: "dashboard_access" },
        { label: "Ajukan Tiket", path: "/user/tickets/create", icon: faTicket, permissionKey: "ticket_create" },
        { label: "Tiket Saya", path: "/user/tickets", icon: faRectangleList },
      ]),
      buildSection("Informasi", [
        { label: "Info Layanan", path: "/user/announcements", icon: faBullhorn },
      ]),
    ],
    footer: [],
  },
  technician: {
    sections: [
      buildSection("Operasional", [
        { label: "Dashboard", path: "/technician/dashboard", icon: faGaugeHigh, permissionKey: "dashboard_access" },
        { label: "Tiket Ditugaskan", path: "/technician/tickets", icon: faClipboardList },
        { label: "Tiket Aktif", path: "/technician/in-progress", icon: faWrench },
        { label: "Riwayat Tiket", path: "/technician/history", icon: faClockRotateLeft },
      ]),
      buildSection("Informasi", [
        { label: "Info Teknisi", path: "/technician/announcements", icon: faBullhorn },
      ]),
    ],
    footer: [],
  },
  admin: {
    sections: [
      buildSection("Operasional", [
        { label: "Dashboard", path: "/admin/dashboard", icon: faGaugeHigh, permissionKey: "dashboard_access" },
        { label: "Semua Tiket", path: "/admin/tickets", icon: faRectangleList },
        { label: "Laporan Tiket", path: "/admin/reports", icon: faChartColumn, permissionKey: "report_access" },
        { label: "Pengumuman Admin", path: "/admin/announcements", icon: faBullhorn, permissionKey: "announcement_management" },
      ]),
      buildSection("Master Data", [
        { label: "Data Pengguna", path: "/admin/users", icon: faUsers, permissionKey: "user_management" },
        { label: "Data Teknisi", path: "/admin/technicians", icon: faPeopleGroup, permissionKey: "technician_management" },
        { label: "Kategori Masalah", path: "/admin/categories", icon: faClipboardList, permissionKey: "category_management" },
        { label: "SLA", path: "/admin/sla", icon: faFileCircleCheck, permissionKey: "sla_management" },
      ]),
      buildSection("Sistem", [
        { label: "Riwayat Audit", path: "/admin/audit-logs", icon: faShieldHalved, permissionKey: "audit_log_access" },
        { label: "Ringkasan Sistem", path: "/admin/settings", icon: faSliders },
      ]),
    ],
    footer: [],
  },
  super_admin: {
    sections: [
      buildSection("Operasional", [
        { label: "Dashboard", path: "/admin/dashboard", icon: faGaugeHigh, permissionKey: "dashboard_access" },
        { label: "Semua Tiket", path: "/admin/tickets", icon: faRectangleList },
        { label: "Laporan Tiket", path: "/admin/reports", icon: faChartColumn, permissionKey: "report_access" },
        { label: "Pengumuman Admin", path: "/admin/announcements", icon: faBullhorn, permissionKey: "announcement_management" },
      ]),
      buildSection("Master Data", [
        { label: "Data Pengguna", path: "/admin/users", icon: faUsers, permissionKey: "user_management" },
        { label: "Data Teknisi", path: "/admin/technicians", icon: faPeopleGroup, permissionKey: "technician_management" },
        { label: "Kategori Masalah", path: "/admin/categories", icon: faClipboardList, permissionKey: "category_management" },
        { label: "SLA", path: "/admin/sla", icon: faFileCircleCheck, permissionKey: "sla_management" },
      ]),
      buildSection("Kontrol Sistem", [
        { label: "Riwayat Audit", path: "/admin/audit-logs", icon: faShieldHalved, permissionKey: "audit_log_access" },
        { label: "Pengaturan Sistem", path: "/super-admin/settings", icon: faSliders, permissionKey: "system_settings_manage" },
        { label: "Permissions Role", path: "/super-admin/access-control", icon: faUserShield, permissionKey: "permission_management" },
      ]),
    ],
    footer: [],
  },
};
