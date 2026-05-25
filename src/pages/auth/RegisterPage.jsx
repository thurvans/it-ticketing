import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useRef, useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "@/pages/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { ROLE_HOME } from "@/utils/constants";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { loading: accessLoading, systemSettings } = useSystemAccess();
  const submittingRef = useRef(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    department: "",
    position: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const registrationEnabled = systemSettings.allow_self_registration !== false;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const session = await register(form);

      if (session.profile && session.token) {
        navigate(ROLE_HOME[session.profile.role] || "/login", { replace: true });
        return;
      }

      setSuccessMessage(
        session.message || "Pendaftaran berhasil. Cek email Anda untuk mengaktifkan akun sebelum login.",
      );
    } catch (submitError) {
      setError(submitError.message || "Registrasi gagal diproses.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (accessLoading) {
    return (
      <AuthShell simple title="Daftar">
        <div className="flex min-h-[220px] items-center justify-center">
          <LoadingSpinner label="Memeriksa kebijakan registrasi..." />
        </div>
      </AuthShell>
    );
  }

  if (!registrationEnabled) {
    return (
      <AuthShell
        simple
        title="Registrasi Dinonaktifkan"
        description={`Pendaftaran mandiri untuk ${systemSettings.display_name} saat ini dimatikan oleh super admin.`}
        footer={
          <>
            Sudah punya akun? <Link className="font-semibold text-brand-700" to="/login">Masuk</Link>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
            Hubungi admin IT jika Anda memerlukan akun baru atau akses onboarding ke workspace ini.
          </p>
          <ActionButton to="/login" label="Kembali ke Login" icon={faArrowLeft} tone="primary" mobileIconOnly={false} fullWidth />
        </div>
      </AuthShell>
    );
  }

  if (successMessage) {
    return (
      <AuthShell
        simple
        title="Cek Email Anda"
        description="Aktivasi akun diperlukan sebelum Anda bisa masuk ke sistem."
        footer={
          <>
            Sudah aktif? <Link className="font-semibold text-brand-700" to="/login">Masuk</Link>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
            {successMessage}
          </p>
          <ActionButton to="/login" label="Kembali ke Login" icon={faArrowLeft} tone="primary" mobileIconOnly={false} fullWidth />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      simple
      title="Daftar"
      footer={
        <>
          Sudah punya akun? <Link className="font-semibold text-brand-700" to="/login">Masuk</Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Nama Lengkap</span>
          <input
            name="full_name"
            className="input"
            value={form.full_name}
            onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            className="input"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>

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

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Nomor Telepon</span>
          <input
            name="phone"
            className="input"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            className="input"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <ActionButton
          type="submit"
          label={submitting ? "Mendaftarkan akun..." : "Daftar Sekarang"}
          icon={faArrowRight}
          tone="primary"
          mobileIconOnly={false}
          fullWidth
          disabled={submitting}
        />
      </form>
    </AuthShell>
  );
}
