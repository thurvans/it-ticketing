import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import ActionButton from "@/components/ui/ActionButton";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">404</p>
        <h1 className="mt-3 text-3xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Route yang Anda cari belum tersedia atau sudah berubah. Kembali ke halaman utama untuk melanjutkan pekerjaan.
        </p>
        <div className="mt-6">
          <ActionButton to="/login" label="Kembali ke Login" icon={faArrowLeft} tone="primary" mobileIconOnly={false} />
        </div>
      </div>
    </div>
  );
}
