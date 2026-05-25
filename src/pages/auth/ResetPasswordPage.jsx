import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ActionButton from "@/components/ui/ActionButton";
import AuthShell from "@/pages/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPasswordWithToken } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token") || "";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setError("Token reset password tidak ditemukan atau tidak valid.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password belum sama.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await resetPasswordWithToken({ token, password });
      navigate("/login", {
        replace: true,
        state: {
          message: response?.message || "Password berhasil diperbarui. Silakan login kembali.",
        },
      });
    } catch (submitError) {
      setError(submitError.message || "Gagal memperbarui password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Atur password baru"
      description="Gunakan password yang kuat agar akses ke sistem tiket tetap aman."
      footer={
        <>
          Kembali ke <Link className="font-semibold text-brand-700" to="/login">login</Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Password Baru</span>
          <input name="password" type="password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Konfirmasi Password</span>
          <input
            type="password"
            name="confirm_password"
            className="input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {!token ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Link reset password tidak lengkap. Gunakan tautan terbaru dari email Anda.
          </p>
        ) : null}

        <ActionButton
          type="submit"
          label={submitting ? "Menyimpan password..." : "Simpan Password Baru"}
          icon={faFloppyDisk}
          tone="primary"
          mobileIconOnly={false}
          fullWidth
          disabled={submitting || !token}
        />
      </form>
    </AuthShell>
  );
}
