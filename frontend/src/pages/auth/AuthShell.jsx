import logoMark from "@/assets/logo-mark.svg";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { APP_NAME } from "@/utils/constants";

export default function AuthShell({ title, description, children, footer, simple = false }) {
  const { systemSettings } = useSystemAccess();
  const workspaceName = systemSettings.display_name || APP_NAME;
  const workspaceLogo = systemSettings.logo_signed_url?.trim() || systemSettings.logo_url?.trim() || logoMark;

  if (simple) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="panel p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-center gap-3">
              <img
                src={workspaceLogo}
                alt={workspaceName}
                className="h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain p-1"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = logoMark;
                }}
              />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-slate-950">{workspaceName}</p>
                <p className="text-xs text-slate-500">IT Service Desk</p>
              </div>
            </div>
            {title || description ? (
              <div className="mb-6 space-y-2 text-center">
                {title ? <h1 className="text-2xl font-bold text-slate-950">{title}</h1> : null}
                {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
              </div>
            ) : null}
            {children}
          </div>
          {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <img
              src={workspaceLogo}
              alt={workspaceName}
              className="h-14 w-14 rounded-2xl bg-white/10 object-contain p-1"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = logoMark;
              }}
            />
            <div>
              <p className="font-display text-2xl font-bold">{workspaceName}</p>
              <p className="text-sm text-slate-400">Pusat layanan TI untuk kebutuhan kerja harian</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Workspace Profesional</p>
              <h2 className="mt-4 text-4xl font-bold leading-tight text-white">
                Kelola tiket bantuan, prioritas layanan, dan tindak lanjut penanganan dari satu tempat.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Sistem ini membantu pengguna, teknisi, dan administrator menjaga proses layanan TI tetap rapi, terukur,
                dan mudah dipantau.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Akses Sesuai Peran",
                  copy: "Setiap pengguna melihat menu dan tanggung jawab yang relevan dengan perannya.",
                },
                {
                  title: "Alur Layanan Jelas",
                  copy: "Status, prioritas, dan penugasan tiket dirancang agar penanganan lebih tertata.",
                },
                {
                  title: "Data Tersimpan Aman",
                  copy: "Data akun dan tiket tersimpan terpusat sehingga mudah ditelusuri dan dipantau.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500">Dirancang agar rapi, responsif, dan nyaman digunakan di berbagai ukuran layar.</p>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-xl space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">IT Service Desk</p>
            <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
            <p className="text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <div className="panel p-6 sm:p-8">{children}</div>
          {footer ? <div className="text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
