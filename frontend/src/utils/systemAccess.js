import {
  DEFAULT_SYSTEM_SETTINGS,
  PERMISSION_MODULES,
  REPORT_GROUP_BY_OPTIONS,
  getDefaultRolePermissions,
  getDefaultSystemSettings,
} from "@shared/workspaceSchema";

export { PERMISSION_MODULES, getDefaultRolePermissions, getDefaultSystemSettings };

const REPORT_GROUP_BY_LABELS = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

export const SYSTEM_SETTING_FIELDS = [
  {
    key: "display_name",
    label: "Nama Sistem",
    type: "text",
    description: "Nama yang tampil di sidebar, halaman masuk, dan area utama aplikasi.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.display_name,
  },
  {
    key: "logo_url",
    label: "Logo Sistem",
    type: "text",
    inputType: "url",
    placeholder: "https://perusahaan-anda.co.id/logo-sistem.svg",
    description: "Unggah logo resmi perusahaan atau isi URL manual. Kosongkan jika ingin memakai logo standar aplikasi.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.logo_url,
    fullWidth: true,
  },
  {
    key: "allow_self_registration",
    label: "Pendaftaran Akun Mandiri",
    type: "boolean",
    description: "Izinkan pengguna membuat akun sendiri melalui halaman pendaftaran.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.allow_self_registration,
  },
  {
    key: "attachment_limit_mb",
    label: "Batas Ukuran Lampiran (MB)",
    type: "number",
    description: "Ukuran maksimum file gambar yang dapat diunggah pada tiket.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.attachment_limit_mb,
  },
  {
    key: "enable_realtime_notifications",
    label: "Notifikasi Real-Time",
    type: "boolean",
    description: "Tampilkan pembaruan notifikasi secara langsung saat ada aktivitas baru.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.enable_realtime_notifications,
  },
  {
    key: "enable_email_notifications",
    label: "Notifikasi Email",
    type: "boolean",
    description: "Kirim pemberitahuan melalui email untuk aktivitas penting ketika fitur email aktif.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.enable_email_notifications,
  },
  {
    key: "default_report_group_by",
    label: "Tampilan Laporan Default",
    type: "select",
    description: "Atur cara data laporan dikelompokkan saat halaman laporan dibuka.",
    defaultValue: DEFAULT_SYSTEM_SETTINGS.default_report_group_by,
    options: REPORT_GROUP_BY_OPTIONS.map((value) => ({
      value,
      label: REPORT_GROUP_BY_LABELS[value] || value,
    })),
  },
];

export function normalizeSystemSettings(value) {
  return {
    ...getDefaultSystemSettings(),
    ...(value || {}),
  };
}

export function normalizeRolePermissions(value) {
  const defaults = getDefaultRolePermissions();

  return Object.entries(defaults).reduce((accumulator, [role, permissions]) => {
    accumulator[role] = {
      ...permissions,
      ...(value?.[role] || {}),
    };
    return accumulator;
  }, {});
}
