import { faCircleCheck, faCircleExclamation, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const iconByTone = {
  success: faCircleCheck,
  error: faCircleExclamation,
  warning: faTriangleExclamation,
};

const toneByClass = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export default function Toast({ open, message, tone = "success", onClose }) {
  if (!open || !message) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-panel ${toneByClass[tone] || toneByClass.success}`}>
        <div className="flex items-start gap-3">
          <FontAwesomeIcon icon={iconByTone[tone] || iconByTone.success} className="mt-1" />
          <div className="flex-1 text-sm font-medium">{message}</div>
          <button type="button" className="text-xs font-semibold uppercase" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

