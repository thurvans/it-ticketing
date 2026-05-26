import { useEffect, useState } from "react";
import { faFloppyDisk, faPenToSquare, faXmark } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, humanizeRole } from "@/utils/formatters";

function buildProfileForm(profile) {
  return {
    full_name: profile?.full_name || "",
    department: profile?.department || "",
    position: profile?.position || "",
    specialization: profile?.specialization || "",
    phone: profile?.phone || "",
  };
}

function ProfileInfoItem({ label, value, valueClassName }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold text-slate-950 ${valueClassName || ""}`}>{value}</p>
    </div>
  );
}

export default function ProfilePage({ title, description }) {
  const { profile, updateProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });
  const [form, setForm] = useState(() => buildProfileForm(profile));

  useEffect(() => {
    setForm(buildProfileForm(profile));
  }, [profile]);

  const initials = (profile?.full_name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const showSpecialization = profile?.role === "technician" || Boolean(profile?.specialization);

  function openEditModal() {
    setForm(buildProfileForm(profile));
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await updateProfile(form);
      setModalOpen(false);
      setToast({
        open: true,
        message: "Perubahan profil berhasil disimpan.",
        tone: "success",
      });
    } catch (submitError) {
      setError(submitError.message || "Perubahan profil belum berhasil disimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        mobileFloatingAction={<ActionButton label="Ubah Profil" icon={faPenToSquare} tone="primary" onClick={openEditModal} />}
        actions={[
          <ActionButton key="edit-profile" label="Ubah Profil" icon={faPenToSquare} tone="primary" onClick={openEditModal} />,
        ]}
      />

      <div className="mx-auto max-w-5xl">
        <div className="panel p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">{profile?.full_name}</h2>
                <p className="mt-1 text-sm text-slate-500">{humanizeRole(profile?.role)}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{profile?.email}</p>
              </div>
            </div>

            <div className="badge bg-emerald-100 text-emerald-700">
              {profile?.is_active ? "Akun Aktif" : "Akun Nonaktif"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileInfoItem label="Email" value={profile?.email || "-"} />
            <ProfileInfoItem label="Peran" value={humanizeRole(profile?.role)} />
            <ProfileInfoItem
              label="Status"
              value={profile?.is_active ? "Aktif" : "Nonaktif"}
              valueClassName={profile?.is_active ? "text-emerald-700" : "text-slate-700"}
            />
            <ProfileInfoItem label="Departemen" value={profile?.department || "-"} />
            <ProfileInfoItem label="Jabatan" value={profile?.position || "-"} />
            {showSpecialization ? <ProfileInfoItem label="Spesialisasi" value={profile?.specialization || "-"} /> : null}
            <ProfileInfoItem label="Telepon" value={profile?.phone || "-"} />
            <ProfileInfoItem label="Update Profil" value={formatDateTime(profile?.updated_at)} />
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-500">
            Email dan peran akun dikelola oleh administrator. Anda cukup memperbarui data yang dipakai untuk komunikasi dan operasional sehari-hari.
          </p>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Ubah Profil"
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nama Lengkap</span>
            <input
              name="full_name"
              className="input"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Departemen</span>
              <input
                name="department"
                className="input"
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Jabatan</span>
              <input
                name="position"
                className="input"
                value={form.position}
                onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
              />
            </label>
          </div>

          {showSpecialization ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Spesialisasi</span>
              <input
                name="specialization"
                className="input"
                value={form.specialization}
                onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))}
              />
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nomor Telepon</span>
            <input
              name="phone"
              className="input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
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
