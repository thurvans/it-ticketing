import { useEffect, useMemo, useRef, useState } from "react";
import { faArrowRotateLeft, faFloppyDisk, faUpload } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import logoMark from "@/assets/logo-mark.svg";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import {
  APP_NAME,
  PRIORITY_OPTIONS,
  ROLE_LABELS,
  STATUS_OPTIONS,
} from "@/utils/constants";
import { saveSystemSettings, uploadWorkspaceLogo } from "@/services/systemAccessService";
import { SYSTEM_SETTING_FIELDS } from "@/utils/systemAccess";
import { WORKSPACE_LOGO_MAX_MB } from "@shared/workspaceLogoRules";

function countEnabledPermissions(permissions) {
  return Object.values(permissions || {}).filter(Boolean).length;
}

function isAbsoluteUrl(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim());
}

export default function SettingsPage({ mode = "overview" }) {
  const { profile } = useAuth();
  const { loading, reloadSystemAccess, rolePermissions, systemSettings } = useSystemAccess();
  const [form, setForm] = useState(systemSettings);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });
  const logoInputRef = useRef(null);

  const isManageMode = mode === "manage" && profile?.role === "super_admin";
  const workspaceName = systemSettings.display_name || APP_NAME;
  const previewLogoUrl = form.logo_signed_url?.trim() || form.logo_url?.trim() || logoMark;
  const permissionSummary = useMemo(
    () =>
      Object.entries(rolePermissions).map(([role, permissions]) => ({
        role,
        enabled: countEnabledPermissions(permissions),
      })),
    [rolePermissions],
  );

  useEffect(() => {
    setForm(systemSettings);
  }, [systemSettings]);

  function updateFormValue(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleLogoImageError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = logoMark;
  }

  async function handleLogoFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setLogoUploading(true);

    try {
      const uploadedLogo = await uploadWorkspaceLogo(file, profile);
      setForm((current) => ({
        ...current,
        logo_url: uploadedLogo.file_url || "",
        logo_signed_url: uploadedLogo.signed_url || uploadedLogo.file_url || "",
      }));
      setToast({
        open: true,
        message: "Logo berhasil diunggah. Klik Simpan Perubahan untuk menerapkannya.",
        tone: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Upload logo gagal diproses.",
        tone: "error",
      });
    } finally {
      setLogoUploading(false);
    }
  }

  function handleResetLogo() {
    setForm((current) => ({
      ...current,
      logo_url: "",
      logo_signed_url: "",
    }));
  }

  async function handleSaveSettings() {
    setSaving(true);

    try {
      await saveSystemSettings(form, profile);
      await reloadSystemAccess(true);
      setToast({
        open: true,
        message: "Perubahan pengaturan berhasil disimpan.",
        tone: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Perubahan pengaturan belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Memuat pengaturan sistem..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isManageMode ? "Pengaturan Sistem" : "Ringkasan Sistem"}
        description={
          isManageMode
            ? "Kelola identitas sistem, kebijakan akun, notifikasi, dan preferensi laporan dari satu halaman."
            : "Lihat konfigurasi utama yang sedang aktif pada sistem ini."
        }
        actions={[
          isManageMode ? (
            <ActionButton
              key="save-settings"
              label={saving ? "Menyimpan..." : "Simpan Perubahan"}
              icon={faFloppyDisk}
              tone="primary"
              disabled={saving}
              onClick={handleSaveSettings}
            />
          ) : null,
        ].filter(Boolean)}
      />

      {!isManageMode ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-sm leading-6 text-slate-600 shadow-sm">
          <p>
            Halaman ini menampilkan ringkasan pengaturan yang sedang berlaku. Perubahan hanya dapat dilakukan oleh
            <strong> Super Administrator</strong>.
          </p>
          {profile?.role === "super_admin" ? (
            <p className="mt-2">
              Buka <Link className="font-semibold text-brand-700" to="/super-admin/settings">Pengaturan Sistem</Link> atau{" "}
              <Link className="font-semibold text-brand-700" to="/super-admin/access-control">Permissions Role</Link>
              {" "}untuk melakukan perubahan.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <h2 className="section-title">Alur Layanan</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tahap Penanganan</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <span key={status} className="badge bg-slate-100 text-slate-700">
                    {status}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tingkat Prioritas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((priority) => (
                  <span key={priority} className="badge bg-brand-50 text-brand-700">
                    {priority}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="section-title">Ringkasan Hak Akses</h2>
          <p className="section-copy mt-1">
            Gambaran jumlah hak akses aktif pada masing-masing peran pengguna.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {permissionSummary.map((item) => (
              <div key={item.role} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{ROLE_LABELS[item.role] || item.role}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.enabled}</p>
                <p className="mt-1 text-xs text-slate-500">hak akses aktif</p>
              </div>
            ))}
          </div>
        </div>

        {isManageMode ? (
          <div className="panel p-6 xl:col-span-2">
            <h2 className="section-title">Konfigurasi Sistem</h2>
            <p className="section-copy mt-1">
              Perubahan di bawah ini memengaruhi identitas sistem, pendaftaran akun, notifikasi, laporan, dan kebijakan lampiran.
            </p>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {SYSTEM_SETTING_FIELDS.map((field) => {
                if (field.key === "logo_url") {
                  return (
                    <div key={field.key} className="space-y-3 xl:col-span-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{field.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{field.description}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                            <img
                              src={previewLogoUrl}
                              alt={form.display_name?.trim() || workspaceName}
                              className="h-full w-full object-contain"
                              onError={handleLogoImageError}
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap gap-3">
                              <ActionButton
                                label={logoUploading ? "Mengunggah..." : "Unggah Logo"}
                                icon={faUpload}
                                tone="secondary"
                                mobileIconOnly={false}
                                disabled={logoUploading || saving}
                                onClick={() => logoInputRef.current?.click()}
                              />
                              <ActionButton
                                label="Gunakan Logo Standar"
                                icon={faArrowRotateLeft}
                                tone="ghost"
                                mobileIconOnly={false}
                                disabled={logoUploading || saving}
                                onClick={handleResetLogo}
                              />
                            </div>

                            <input
                              ref={logoInputRef}
                              type="file"
                              name="logo_file"
                              className="hidden"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp,.png,.jpg,.jpeg,.svg,.webp"
                              onChange={handleLogoFileChange}
                            />

                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                URL Logo
                              </span>
                              <input
                                type="url"
                                name="logo_url"
                                className="input"
                                value={isAbsoluteUrl(form.logo_url) ? form.logo_url : ""}
                                placeholder={field.placeholder}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    logo_url: event.target.value,
                                    logo_signed_url: event.target.value,
                                  }))
                                }
                              />
                            </label>

                            <div className="text-xs leading-5 text-slate-500">
                              <p>Format yang didukung: PNG, JPG, SVG, atau WebP hingga {WORKSPACE_LOGO_MAX_MB} MB.</p>
                              <p>
                                {form.logo_url?.trim()
                                  ? isAbsoluteUrl(form.logo_url)
                                    ? "Logo saat ini berasal dari URL manual yang Anda masukkan."
                                    : "Logo saat ini berasal dari file yang diunggah ke sistem."
                                  : "Logo standar aplikasi akan digunakan jika belum ada logo yang dipilih."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (field.type === "boolean") {
                  return (
                    <label
                      key={field.key}
                      className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <input
                        type="checkbox"
                        name={field.key}
                        checked={Boolean(form[field.key])}
                        onChange={(event) => updateFormValue(field.key, event.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-950">{field.label}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-500">{field.description}</span>
                      </span>
                    </label>
                  );
                }

                if (field.type === "select") {
                  return (
                    <label key={field.key} className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                      <select
                        name={field.key}
                        className="select"
                        value={form[field.key]}
                        onChange={(event) => updateFormValue(field.key, event.target.value)}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs leading-5 text-slate-500">{field.description}</p>
                    </label>
                  );
                }

                return (
                  <label key={field.key} className={field.fullWidth ? "space-y-2 xl:col-span-2" : "space-y-2"}>
                    <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                    <input
                      type={field.type === "number" ? "number" : field.inputType || "text"}
                      name={field.key}
                      min={field.type === "number" ? 1 : undefined}
                      className="input"
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        updateFormValue(
                          field.key,
                          field.type === "number" ? event.target.valueAsNumber || field.defaultValue : event.target.value,
                        )
                      }
                    />
                    <p className="text-xs leading-5 text-slate-500">{field.description}</p>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ open: false, message: "", tone: "success" })}
      />
    </div>
  );
}
