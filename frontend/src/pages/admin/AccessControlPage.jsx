import { useEffect, useState } from "react";
import { faFloppyDisk, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { saveRolePermissions } from "@/services/systemAccessService";
import { ROLE_LABELS } from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";
import { getDefaultRolePermissions, PERMISSION_MODULES } from "@/utils/systemAccess";

const ROLE_COLUMNS = ["user", "technician", "admin", "super_admin"];

export default function AccessControlPage() {
  const { profile } = useAuth();
  const { loading, reloadSystemAccess, rolePermissions } = useSystemAccess();
  const [draft, setDraft] = useState(getDefaultRolePermissions());
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(new Date().toISOString());
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    setDraft(rolePermissions);
    setUpdatedAt(new Date().toISOString());
  }, [rolePermissions]);

  function updatePermission(role, permissionKey, value) {
    if (role === "super_admin") {
      return;
    }

    setDraft((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [permissionKey]: value,
      },
    }));
  }

  function handleResetDefaults() {
    setDraft(getDefaultRolePermissions());
    setToast({
      open: true,
      message: "Rancangan hak akses dikembalikan ke pengaturan awal. Simpan jika ingin menerapkannya.",
      tone: "success",
    });
  }

  async function handleSavePermissions() {
    setSaving(true);

    try {
      await saveRolePermissions(draft, profile);
      await reloadSystemAccess(true);
      setUpdatedAt(new Date().toISOString());
      setToast({
        open: true,
        message: "Perubahan hak akses berhasil disimpan.",
        tone: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Perubahan hak akses belum berhasil disimpan.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Memuat pengaturan hak akses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions Role"
        description="Kelola hak akses per peran pengguna. Akses Super Administrator tetap dikunci penuh sebagai kontrol utama sistem."
        actions={[
          <ActionButton
            key="reset-default"
            label="Kembalikan Default"
            icon={faRotateLeft}
            onClick={handleResetDefaults}
            disabled={saving}
          />,
          <ActionButton
            key="save-permissions"
            label={saving ? "Menyimpan..." : "Simpan Perubahan"}
            icon={faFloppyDisk}
            tone="primary"
            onClick={handleSavePermissions}
            disabled={saving}
          />,
        ]}
      />

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900">
        Perubahan di halaman ini memengaruhi menu, halaman yang dapat dibuka, dan tindakan yang tersedia untuk tiap peran.
        Data terakhir dimuat pada <strong>{formatDateTime(updatedAt)}</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {ROLE_COLUMNS.map((role) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{ROLE_LABELS[role]}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              {Object.values(draft[role] || {}).filter(Boolean).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">hak akses aktif</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Modul</th>
              {ROLE_COLUMNS.map((role) => (
                <th
                  key={role}
                  className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {PERMISSION_MODULES.map((module) => (
              <tr key={module.key}>
                <td className="px-5 py-4 align-top">
                  <p className="font-semibold text-slate-950">{module.label}</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{module.description}</p>
                </td>
                {ROLE_COLUMNS.map((role) => {
                  const checked = Boolean(draft[role]?.[module.key]);
                  const disabled = role === "super_admin" || saving;

                  return (
                    <td key={`${module.key}-${role}`} className="px-5 py-4 text-center align-middle">
                      <label className="inline-flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          name={`permission_${role}_${module.key}`}
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => updatePermission(role, module.key, event.target.checked)}
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
