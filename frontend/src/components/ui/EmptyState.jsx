import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInbox } from "@fortawesome/free-solid-svg-icons";

export default function EmptyState({
  title = "Belum ada data",
  description = "Data akan muncul di sini setelah tersedia.",
  action,
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <FontAwesomeIcon icon={faInbox} className="text-xl" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

