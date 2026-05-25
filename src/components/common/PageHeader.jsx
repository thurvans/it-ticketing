import { cloneElement, isValidElement, useEffect } from "react";
import { usePageMeta } from "@/context/PageMetaContext";
import { cn } from "@/utils/formatters";

export default function PageHeader({ title, description, actions, mobileFloatingAction }) {
  const { setPageMeta } = usePageMeta();
  const mobileFab =
    mobileFloatingAction && isValidElement(mobileFloatingAction)
      ? cloneElement(mobileFloatingAction, {
          className: cn("fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 !h-14 !w-14 rounded-2xl shadow-xl shadow-brand-900/20 sm:hidden", mobileFloatingAction.props.className),
          mobileIconOnly: true,
          fullWidth: false,
        })
      : null;

  useEffect(() => {
    setPageMeta({ title, description: description || "" });

    return () => {
      setPageMeta({ title: "", description: "" });
    };
  }, [description, setPageMeta, title]);

  return (
    <>
      {actions ? (
        <div className={mobileFloatingAction ? "hidden flex-wrap items-stretch justify-end gap-2 sm:flex" : "flex flex-wrap items-stretch justify-end gap-2"}>
          {actions}
        </div>
      ) : null}
      {mobileFab}
    </>
  );
}
