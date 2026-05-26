import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "@/pages/auth/AuthShell";
import ActionButton from "@/components/ui/ActionButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

export default function ActivateAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activateAccount } = useAuth();
  const [error, setError] = useState("");
  const token = searchParams.get("token") || "";

  useEffect(() => {
    let ignore = false;

    async function runActivation() {
      if (!token) {
        setError("Token aktivasi tidak ditemukan atau tidak valid.");
        return;
      }

      try {
        const response = await activateAccount(token);

        if (ignore) {
          return;
        }

        navigate("/login", {
          replace: true,
          state: {
            message: response?.message || "Akun berhasil diaktivasi. Silakan login.",
          },
        });
      } catch (activationError) {
        if (!ignore) {
          setError(activationError.message || "Aktivasi akun gagal diproses.");
        }
      }
    }

    runActivation();

    return () => {
      ignore = true;
    };
  }, [activateAccount, navigate, token]);

  if (!error) {
    return (
      <AuthShell
        simple
        title="Mengaktifkan Akun"
        description="Kami sedang memverifikasi link aktivasi Anda."
      >
        <div className="flex min-h-[220px] items-center justify-center">
          <LoadingSpinner label="Memproses aktivasi akun..." />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      simple
      title="Aktivasi Gagal"
      description="Link aktivasi sudah kedaluwarsa atau tidak lagi valid."
      footer={(
        <>
          Kembali ke <Link className="font-semibold text-brand-700" to="/login">login</Link>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="rounded-2xl bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
          {error}
        </p>
        <ActionButton to="/login" label="Kembali ke Login" icon={faArrowLeft} tone="primary" mobileIconOnly={false} fullWidth />
      </div>
    </AuthShell>
  );
}
