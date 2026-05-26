import { useEffect, useState } from "react";
import { faBullhorn, faFloppyDisk, faPenToSquare, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { deleteAnnouncement, listAdminAnnouncements, saveAnnouncement } from "@/services/adminService";
import { formatDate } from "@/utils/formatters";

const emptyForm = {
  id: "",
  title: "",
  content: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

function toDateInputValue(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function AdminAnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      const rows = await listAdminAnnouncements();
      setAnnouncements(rows);
    } catch (loadError) {
      setToast({
        open: true,
        message: loadError.message || "Pengumuman gagal dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setError("");
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(announcement) {
    setError("");
    setForm({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      start_date: toDateInputValue(announcement.start_date),
      end_date: toDateInputValue(announcement.end_date),
      is_active: Boolean(announcement.is_active),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Judul pengumuman wajib diisi.");
      return;
    }

    if (!form.content.trim()) {
      setError("Isi pengumuman wajib diisi.");
      return;
    }

    if (!form.start_date || !form.end_date) {
      setError("Tanggal mulai dan selesai wajib diisi.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await saveAnnouncement(
        {
          id: form.id || undefined,
          title: form.title.trim(),
          content: form.content.trim(),
          start_date: new Date(`${form.start_date}T00:00:00`).toISOString(),
          end_date: new Date(`${form.end_date}T23:59:59`).toISOString(),
          is_active: Boolean(form.is_active),
        },
        profile,
      );
      await loadAnnouncements();
      setModalOpen(false);
      setToast({
        open: true,
        message: form.id ? "Pengumuman berhasil diperbarui." : "Pengumuman baru berhasil dibuat.",
        tone: "success",
      });
    } catch (saveError) {
      setError(saveError.message || "Pengumuman gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAnnouncement() {
    if (!selectedAnnouncement) {
      return;
    }

    setSubmitting(true);

    try {
      await deleteAnnouncement(selectedAnnouncement.id, profile);
      await loadAnnouncements();
      setConfirmOpen(false);
      setSelectedAnnouncement(null);
      setToast({
        open: true,
        message: "Pengumuman berhasil dihapus.",
        tone: "success",
      });
    } catch (deleteError) {
      setToast({
        open: true,
        message: deleteError.message || "Pengumuman gagal dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengumuman"
        description="Kelola pengumuman maintenance, gangguan, dan informasi internal sistem untuk admin dan teknisi."
        mobileFloatingAction={<ActionButton label="Tambah Pengumuman" icon={faBullhorn} tone="primary" onClick={openCreateModal} />}
        actions={[
          <ActionButton key="new-announcement" label="Tambah Pengumuman" icon={faBullhorn} tone="primary" onClick={openCreateModal} />,
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{announcements.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Aktif</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {announcements.filter((announcement) => announcement.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nonaktif</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {announcements.filter((announcement) => !announcement.is_active).length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : !announcements.length ? (
        <div className="panel px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-slate-950">Belum ada pengumuman</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Buat pengumuman untuk maintenance, gangguan layanan, atau informasi penting internal.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{announcement.title}</h2>
                    <span
                      className={`badge ${
                        announcement.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {announcement.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Aktif {formatDate(announcement.start_date)} sampai {formatDate(announcement.end_date)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                    Dibuat oleh {announcement.creator?.full_name || "Sistem"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    label="Edit"
                    icon={faPenToSquare}
                    tone="secondary"
                    mobileIconOnly={false}
                    onClick={() => openEditModal(announcement)}
                  />
                  <ActionButton
                    label="Hapus"
                    icon={faTrashCan}
                    tone="danger"
                    mobileIconOnly={false}
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      setConfirmOpen(true);
                    }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{announcement.content}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? "Edit Pengumuman" : "Buat Pengumuman"}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Judul</span>
            <input
              name="title"
              className="input"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Isi Pengumuman</span>
            <textarea
              name="content"
              className="textarea min-h-[160px]"
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Tanggal Mulai</span>
              <input
                type="date"
                name="start_date"
                className="input"
                value={form.start_date}
                onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Tanggal Selesai</span>
              <input
                type="date"
                name="end_date"
                className="input"
                value={form.end_date}
                onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
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
            Tampilkan sebagai pengumuman aktif
          </label>

          {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton label="Batal" icon={faXmark} mobileIconOnly={false} onClick={() => setModalOpen(false)} />
            <ActionButton
              type="submit"
              label={submitting ? "Menyimpan..." : "Simpan Pengumuman"}
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

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Pengumuman"
        description={`Pengumuman ${selectedAnnouncement?.title || "ini"} akan dihapus permanen dari sistem. Lanjutkan?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        tone="danger"
        onClose={() => {
          setConfirmOpen(false);
          setSelectedAnnouncement(null);
        }}
        onConfirm={handleDeleteAnnouncement}
      />
    </div>
  );
}
