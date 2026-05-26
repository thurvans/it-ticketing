import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/utils/formatters";

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  mobileSheet = false,
  panelClassName,
  bodyClassName,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center bg-slate-950/45",
        mobileSheet ? "items-end px-0 py-0 sm:items-center sm:px-4 sm:py-6" : "items-center px-4 py-6",
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "panel flex w-full flex-col overflow-hidden shadow-2xl",
          mobileSheet
            ? "max-h-[92vh] rounded-b-none rounded-t-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
            : "max-h-[90vh] max-w-2xl",
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={cn("flex items-center justify-between border-b border-slate-200", mobileSheet ? "px-5 py-4 sm:px-6" : "px-6 py-4")}>
          <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          <button type="button" className="btn-ghost h-10 w-10 rounded-xl p-0" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className={cn("overflow-y-auto", mobileSheet ? "px-5 py-5 sm:px-6" : "px-6 py-5", bodyClassName)}>{children}</div>
        {footer ? <div className={cn("border-t border-slate-200", mobileSheet ? "px-5 py-4 sm:px-6" : "px-6 py-4")}>{footer}</div> : null}
      </div>
    </div>
  );
}
