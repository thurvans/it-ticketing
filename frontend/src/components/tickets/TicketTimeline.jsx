import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatDateTime } from "@/utils/formatters";

export default function TicketTimeline({ logs }) {
  return (
    <div className="panel p-4 sm:p-5 lg:p-6">
      <div className="mb-5">
        <h3 className="section-title">Riwayat Aktivitas</h3>
        <p className="section-copy mt-1">Perubahan status, penugasan, dan aktivitas penting pada tiket ini.</p>
      </div>

      <div className="space-y-5">
        {logs?.length ? (
          logs.map((log, index) => {
            const isLastItem = index === logs.length - 1;

            return (
              <div key={log.id} className="flex gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <FontAwesomeIcon icon={faCircle} className="text-[8px]" />
                  </div>
                  {!isLastItem ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                </div>
                <div className="pb-5 sm:pb-6">
                  <p className="text-sm font-semibold text-slate-950">{log.description}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.user?.full_name || "Sistem"} / {formatDateTime(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">Belum ada riwayat aktivitas untuk tiket ini.</p>
        )}
      </div>
    </div>
  );
}
