import { faFloppyDisk, faXmark } from "@fortawesome/free-solid-svg-icons";
import ActionButton from "@/components/ui/ActionButton";
import Modal from "@/components/ui/Modal";

export default function ProfileEditorModal({
  open,
  title,
  form,
  error,
  submitting,
  onClose,
  onSubmit,
  onChange,
  roleOptions,
  showSpecialization = false,
  passwordRequired = false,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Nama Lengkap</span>
            <input
              name="full_name"
              className="input"
              value={form.full_name}
              onChange={(event) => onChange("full_name", event.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              className="input"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </label>

          {roleOptions?.length ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Peran</span>
              <select name="role" className="select" value={form.role} onChange={(event) => onChange("role", event.target.value)}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Departemen</span>
            <input
              name="department"
              className="input"
              value={form.department}
              onChange={(event) => onChange("department", event.target.value)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Jabatan</span>
            <input
              name="position"
              className="input"
              value={form.position}
              onChange={(event) => onChange("position", event.target.value)}
            />
          </label>

          {showSpecialization ? (
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Spesialisasi</span>
              <input
                name="specialization"
                className="input"
                value={form.specialization}
                onChange={(event) => onChange("specialization", event.target.value)}
              />
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nomor Telepon</span>
            <input name="phone" className="input" value={form.phone} onChange={(event) => onChange("phone", event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              {passwordRequired ? "Kata Sandi Awal" : "Kata Sandi Baru"}
            </span>
            <input
              type="password"
              name="password"
              className="input"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder={passwordRequired ? "Wajib diisi untuk akun baru" : "Kosongkan jika tidak ingin mengubah"}
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={(event) => onChange("is_active", event.target.checked)}
          />
          Akun aktif dan dapat digunakan untuk masuk
        </label>

        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label="Batal" icon={faXmark} mobileIconOnly={false} onClick={onClose} />
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
  );
}
