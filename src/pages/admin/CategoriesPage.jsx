import { useEffect, useState } from "react";
import { faFloppyDisk, faPenToSquare, faPlus, faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton, { InlineActionButton } from "@/components/ui/ActionButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { deleteCategory, listCategories, saveCategory } from "@/services/adminService";

const emptyForm = {
  id: "",
  name: "",
  description: "",
  sort_order: 1,
  is_active: true,
};

export default function CategoriesPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const rows = await listCategories();
      setCategories(rows);
    } catch (loadError) {
      setToast({
        open: true,
        message: loadError.message || "Kategori tiket gagal dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setError("");
    setForm({
      ...emptyForm,
      sort_order: categories.length + 1,
    });
    setModalOpen(true);
  }

  function openEditModal(category) {
    setError("");
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
      sort_order: category.sort_order || 1,
      is_active: Boolean(category.is_active),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await saveCategory({
        id: form.id || undefined,
        name: form.name.trim(),
        description: form.description.trim(),
        sort_order: Number(form.sort_order) || 1,
        is_active: Boolean(form.is_active),
      }, profile);
      await loadCategories();
      setModalOpen(false);
      setToast({
        open: true,
        message: form.id ? "Kategori berhasil diperbarui." : "Kategori baru berhasil ditambahkan.",
        tone: "success",
      });
    } catch (saveError) {
      setError(saveError.message || "Kategori gagal disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory) {
      return;
    }

    setSubmitting(true);

    try {
      await deleteCategory(selectedCategory.id, profile);
      await loadCategories();
      setConfirmOpen(false);
      setSelectedCategory(null);
      setToast({
        open: true,
        message: "Kategori berhasil dihapus.",
        tone: "success",
      });
    } catch (deleteError) {
      setToast({
        open: true,
        message: deleteError.message || "Kategori gagal dihapus.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Kategori",
      render: (category) => (
        <div className="space-y-1">
          <p className="font-semibold text-slate-950">{category.name}</p>
          <p className="text-sm text-slate-500">{category.description || "Tanpa deskripsi"}</p>
        </div>
      ),
    },
    {
      key: "sort_order",
      header: "Urutan",
      render: (category) => category.sort_order || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (category) => (
        <span className={`badge ${category.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
          {category.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      render: (category) => (
        <div className="flex flex-wrap gap-3 text-sm">
          <InlineActionButton icon={faPenToSquare} label="Edit" tone="primary" onClick={() => openEditModal(category)} />
          <InlineActionButton
            icon={faTrashCan}
            label="Hapus"
            tone="danger"
            onClick={() => {
              setSelectedCategory(category);
              setConfirmOpen(true);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori Permasalahan"
        description="Kelola kategori masalah agar setiap tiket dapat dikelompokkan dan ditangani dengan lebih rapi."
        mobileFloatingAction={<ActionButton label="Tambah Kategori" icon={faPlus} tone="primary" onClick={openCreateModal} />}
        actions={[
          <ActionButton key="add-category" label="Tambah Kategori" icon={faPlus} tone="primary" onClick={openCreateModal} />,
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Total kategori</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{categories.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Kategori aktif</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {categories.filter((category) => category.is_active).length}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Kategori nonaktif</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {categories.filter((category) => !category.is_active).length}
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
          rows={categories}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          emptyTitle="Belum ada kategori"
          emptyText="Tambahkan kategori agar pengguna dapat memilih jenis masalah saat mengirim tiket."
        />
      )}

      <Modal
        open={modalOpen}
        title={form.id ? "Ubah Kategori" : "Tambah Kategori"}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nama Kategori</span>
            <input
              name="name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Deskripsi</span>
            <textarea
              name="description"
              className="textarea min-h-[120px]"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Urutan Tampil</span>
            <input
              type="number"
              name="sort_order"
              min="1"
              className="input"
              value={form.sort_order}
              onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
            />
          </label>

          <label className="inline-flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            />
            Kategori aktif dan bisa dipilih user
          </label>

          {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton label="Batal" icon={faXmark} mobileIconOnly={false} onClick={() => setModalOpen(false)} />
            <ActionButton
              type="submit"
              label={submitting ? "Menyimpan..." : "Simpan Kategori"}
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
        title="Hapus Kategori"
        description={`Kategori ${selectedCategory?.name || "ini"} akan dihapus permanen. Jika masih digunakan pada tiket, proses ini akan ditolak.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        tone="danger"
        onClose={() => {
          setConfirmOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
      />
    </div>
  );
}
