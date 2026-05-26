import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ActionButton from "@/components/ui/ActionButton";
import AuthShell from "@/pages/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await requestPasswordReset(email);
      setMessage(response?.message || "Jika email terdaftar, instruksi reset password telah dikirim.");
    } catch (submitError) {
      setError(submitError.message || "Gagal mengirim instruksi reset password.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      simple
      title="Lupa Password"
      footer={
        <>
          Kembali ke <Link className="font-semibold text-brand-700" to="/login">login</Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input name="email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <ActionButton
          type="submit"
          label={submitting ? "Mengirim..." : "Kirim Instruksi Reset"}
          icon={faPaperPlane}
          tone="primary"
          mobileIconOnly={false}
          fullWidth
          disabled={submitting}
        />
      </form>
    </AuthShell>
  );
}
