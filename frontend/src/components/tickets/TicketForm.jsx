import { faFloppyDisk, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import FileUpload from "@/components/tickets/FileUpload";
import { PRIORITY_OPTIONS } from "@/utils/constants";

const initialForm = {
  title: "",
  category_id: "",
  priority: "Medium",
  description: "",
  department: "",
  location: "",
  contact_number: "",
  attachments: [],
};

export default function TicketForm({
  categories,
  defaultValues,
  onSubmit,
  onSaveDraft,
  submitting,
  draftSaving = false,
  submitLabel = "Submit Tiket",
  submitIcon = faPaperPlane,
  showAttachments = true,
}) {
  const [form, setForm] = useState({ ...initialForm, ...defaultValues });
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.title.trim()) {
      return "Judul masalah wajib diisi.";
    }

    if (!form.category_id) {
      return "Kategori tiket wajib dipilih.";
    }

    if (form.description.trim().length < 20) {
      return "Deskripsi masalah minimal 20 karakter.";
    }

    if (!form.priority) {
      return "Prioritas tiket wajib dipilih.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationMessage = validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    await onSubmit(form);
  }

  async function handleSaveDraft() {
    if (!onSaveDraft) {
      return;
    }

    setError("");
    await onSaveDraft(form);
  }

  return (
    <form className="panel p-4 sm:p-5 lg:p-6" onSubmit={handleSubmit}>
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-950">Detail permintaan</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Isi informasi inti, dampak, lokasi, dan lampiran agar proses triase lebih cepat.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Judul Masalah</span>
          <input
            name="title"
            className="input"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Contoh: Tidak bisa akses email kantor"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Kategori</span>
          <select
            name="category_id"
            className="select"
            value={form.category_id}
            onChange={(event) => updateField("category_id", event.target.value)}
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Prioritas</span>
          <select name="priority" className="select" value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Departemen</span>
          <input
            name="department"
            className="input"
            value={form.department}
            onChange={(event) => updateField("department", event.target.value)}
            placeholder="Finance"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Lokasi</span>
          <input
            name="location"
            className="input"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Jakarta HQ - Lantai 5"
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Deskripsi Masalah</span>
          <textarea
            name="description"
            className="textarea min-h-[140px]"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Jelaskan kendala secara detail, langkah yang sudah dicoba, dan dampak bisnisnya."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Nomor Kontak</span>
          <input
            name="contact_number"
            className="input"
            value={form.contact_number}
            onChange={(event) => updateField("contact_number", event.target.value)}
            placeholder="0812-xxxx-xxxx"
          />
        </label>

        {showAttachments ? (
          <div className="space-y-2 lg:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Lampiran</span>
            <FileUpload
              inputName="ticket_attachments"
              files={form.attachments}
              onChange={(selectedFiles) => updateField("attachments", [...form.attachments, ...selectedFiles])}
              onRemove={(index) =>
                updateField(
                  "attachments",
                  form.attachments.filter((_, fileIndex) => fileIndex !== index),
                )
              }
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onSaveDraft ? (
          <ActionButton
            label={draftSaving ? "Menyimpan Draft..." : "Simpan Draft"}
            icon={faFloppyDisk}
            tone="secondary"
            mobileIconOnly={false}
            className="w-full sm:w-auto"
            disabled={draftSaving || submitting}
            onClick={handleSaveDraft}
          />
        ) : null}
        <ActionButton
          type="submit"
          label={submitting ? "Menyimpan..." : submitLabel}
          icon={submitIcon}
          tone="primary"
          mobileIconOnly={false}
          className="w-full sm:w-auto"
          disabled={submitting}
        />
      </div>
    </form>
  );
}
