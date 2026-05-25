import { useEffect, useState } from "react";
import { faFloppyDisk, faPenToSquare, faXmark } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton, { InlineActionButton } from "@/components/ui/ActionButton";
import DataTable from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { listSlaSettings, saveSlaSetting } from "@/services/adminService";
import { PRIORITY_OPTIONS } from "@/utils/constants";

const emptySlaForm = {
  id: "",
  priority: PRIORITY_OPTIONS[0],
  response_time_hours: 1,
  resolution_time_hours: 4,
  is_active: true,
};

export default function SlaPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptySlaForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const rows = await listSlaSettings();
      setSettings(rows);
    } catch (loadError) {
      setToast({
        open: true,
        message: loadError.message || "Pengaturan SLA belum dapat dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(setting) {
    setError("");
    setForm({
      id: setting.id,
      priority: setting.priority,
      response_time_hours: setting.response_time_hours || 1,
      resolution_time_hours: setting.resolution_time_hours || 4,
      is_active: Boolean(setting.is_active),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if ((Number(form.response_time_hours) || 0) <= 0) {
      setError("Target waktu respons harus lebih besar dari 0 jam.");
      return;
    }

    if ((Number(form.resolution_time_hours) || 0) <= 0) {
      setError("Target waktu penyelesaian harus lebih besar dari 0 jam.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await saveSlaSetting({
        id: form.id || undefined,
        priority: form.priority,
        response_time_hours: Number(form.response_time_hours),
        resolution_time_hours: Number(form.resolution_time_hours),
        is_active: Boolean(form.is_active),
      }, profile);
      await loadSettings();
      setModalOpen(false);
      setToast({
        open: true,
        message: "Perubahan SLA berhasil disimpan.",
        tone: "success",
      });
    } catch (saveError) {
      setError(saveError.message || "Perubahan SLA belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "priority",
      header: "Prioritas",
      render: (setting) => <span className="font-semibold text-slate-950">{setting.priority}</span>,
    },
    {
      key: "response_time_hours",
      header: "Respons Awal",
      render: (setting) => `${setting.response_time_hours} jam`,
    },
    {
      key: "resolution_time_hours",
      header: "Penyelesaian",
      render: (setting) => `${setting.resolution_time_hours} jam`,
    },
    {
      key: "status",
      header: "Status",
      render: (setting) => (
        <span className={`badge ${setting.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
          {setting.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (setting) => (
        <InlineActionButton icon={faPenToSquare} label="Edit" tone="primary" onClick={() => openEditModal(setting)} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA"
        description="Atur waktu respons dan waktu penyelesaian tiket untuk setiap prioritas."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Target aktif</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {settings.filter((setting) => setting.is_active).length}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Respons tercepat</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {settings.length ? Math.min(...settings.map((setting) => setting.response_time_hours || 0)) : 0} jam
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Penyelesaian terlama</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {settings.length ? Math.max(...settings.map((setting) => setting.resolution_time_hours || 0)) : 0} jam
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={settings}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          emptyTitle="Belum ada konfigurasi SLA"
          emptyText="Tambahkan atau aktifkan SLA agar sistem dapat menghitung batas waktu setiap prioritas tiket."
        />
      )}

      <Modal
        open={modalOpen}
        title="Ubah SLA"
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Prioritas</span>
            <select
              name="priority"
              className="select"
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Waktu Respons (jam)</span>
              <input
                type="number"
                name="response_time_hours"
                min="1"
                className="input"
                value={form.response_time_hours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, response_time_hours: event.target.value }))
                }
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Waktu Penyelesaian (jam)</span>
              <input
                type="number"
                name="resolution_time_hours"
                min="1"
                className="input"
                value={form.resolution_time_hours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, resolution_time_hours: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Aktifkan SLA ini
          </label>

          {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton label="Batal" icon={faXmark} mobileIconOnly={false} onClick={() => setModalOpen(false)} />
            <ActionButton
              type="submit"
              label={submitting ? "Menyimpan..." : "Simpan Perubahan"}
              icon={faFloppyDisk}
              tone="primary"
              mobileIconOnly={false}
              disabled={submitting}
            />
          </div>
        </form>
      </Modal>

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ open: false, message: "", tone: "success" })}
      />
    </div>
  );
}
