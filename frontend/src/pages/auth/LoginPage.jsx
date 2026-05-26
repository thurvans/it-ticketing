import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ActionButton from "@/components/ui/ActionButton";
import AuthShell from "@/pages/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { ROLE_HOME } from "@/utils/constants";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { systemSettings } = useSystemAccess();
  const submittingRef = useRef(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const flashMessage = location.state?.message || "";
  const registrationEnabled = systemSettings.allow_self_registration !== false;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      const session = await signIn(form);
      const redirectPath = location.state?.from?.pathname || ROLE_HOME[session.profile.role] || "/login";
      navigate(redirectPath, { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Login gagal. Periksa kembali email dan password.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      simple
      title="Masuk"
      footer={(
        <>
          {registrationEnabled ? (
            <>
              Belum punya akun? <Link className="font-semibold text-brand-700" to="/register">Daftar</Link>
            </>
          ) : (
            "Registrasi mandiri saat ini dinonaktifkan."
          )}
        </>
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            className="input"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="nama@perusahaan.com"
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
            placeholder="Minimal 8 karakter"
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {flashMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{flashMessage}</p> : null}

        <div className="flex items-center justify-between gap-3">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand-700">
            Lupa password?
          </Link>
        </div>

        <ActionButton
          type="submit"
          label={submitting ? "Memproses login..." : "Masuk"}
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
