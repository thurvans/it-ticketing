import { useState } from "react";
import { faSliders } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Modal from "@/components/ui/Modal";
import { cn } from "@/utils/formatters";

export default function FilterPanel({
  title,
  description,
  actions,
  children,
  contentClassName,
  mobileCollapsible = false,
  defaultMobileOpen = false,
  mobileCollapsedLabel = "Buka Filter",
}) {
  const [mobileOpen, setMobileOpen] = useState(defaultMobileOpen);
  const hasHeader = Boolean(title || description || actions);
  const contentSpacingClassName = hasHeader ? "mt-3 sm:mt-4" : "";
  const mobileDialogTitle = title || "Filter";

  if (mobileCollapsible) {
    return (
      <>
        <div className="sm:hidden">
          <button
            type="button"
            className="panel flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
            onClick={() => setMobileOpen(true)}
            aria-label={mobileCollapsedLabel}
            title={mobileCollapsedLabel}
            aria-haspopup="dialog"
          >
            <div className="min-w-0">
              {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">{title}</p> : null}
              <p className="mt-1 text-sm leading-6 text-slate-600">{description || "Buka filter untuk mempersempit data yang ingin dilihat."}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <FontAwesomeIcon icon={faSliders} className="text-[15px]" />
            </span>
          </button>
        </div>

        <div className="hidden sm:block">
          <div className="panel p-4 sm:p-5">
            {hasHeader ? (
              <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:text-xs">{title}</p> : null}
                  {description ? <p className="mt-1 text-sm leading-5 text-slate-500 sm:leading-6">{description}</p> : null}
                </div>
                {actions ? <div className="flex flex-wrap items-start gap-1.5 sm:gap-2 lg:justify-end">{actions}</div> : null}
              </div>
            ) : null}

            <div className={cn(contentSpacingClassName, contentClassName)}>{children}</div>
          </div>
        </div>

        <Modal open={mobileOpen} title={mobileDialogTitle} onClose={() => setMobileOpen(false)} mobileSheet panelClassName="sm:max-w-3xl">
          {description ? <p className="mb-4 text-sm leading-6 text-slate-500">{description}</p> : null}
          {actions ? <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">{actions}</div> : null}
          <div className={contentClassName}>{children}</div>
        </Modal>
      </>
    );
  }

  return (
    <div className="panel p-4 sm:p-5">
      {hasHeader ? (
        <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:text-xs">{title}</p> : null}
            {description ? <p className="mt-1 text-sm leading-5 text-slate-500 sm:leading-6">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-start gap-1.5 sm:gap-2 lg:justify-end">{actions}</div> : null}
        </div>
      ) : null}

      <div className={cn(contentSpacingClassName, contentClassName)}>{children}</div>
    </div>
  );
}
