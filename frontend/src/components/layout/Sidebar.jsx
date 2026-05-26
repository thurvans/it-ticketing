import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
import logoMark from "@/assets/logo-mark.svg";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { navigationByRole } from "@/utils/navigation";
import { APP_NAME, ROLE_LABELS } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/formatters";

export default function Sidebar({ mobileOpen, desktopOpen, onCloseMobile }) {
  const { profile } = useAuth();
  const { hasPermission, systemSettings } = useSystemAccess();
  const desktopCollapsed = !desktopOpen;
  const navigationConfig = navigationByRole[profile?.role] || { sections: [], footer: [] };
  const navigationSections = (navigationConfig.sections || [])
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => !item.permissionKey || hasPermission(item.permissionKey)),
    }))
    .filter((section) => section.items.length);
  const footerItems = (navigationConfig.footer || []).filter((item) => !item.permissionKey || hasPermission(item.permissionKey));
  const workspaceName = systemSettings.display_name || APP_NAME;
  const workspaceLogo = systemSettings.logo_signed_url?.trim() || systemSettings.logo_url?.trim() || logoMark;

  function renderNavigationItem(item, { footer = false } = {}) {
    return (
      <NavLink
        key={`${item.label}-${item.path}`}
        to={item.path}
        onClick={onCloseMobile}
        title={item.label}
        aria-label={item.label}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
            isActive
              ? "bg-white text-slate-950 shadow-sm shadow-slate-950/10"
              : footer
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-slate-300 hover:bg-white/8 hover:text-white",
            desktopCollapsed ? "lg:justify-center lg:px-3" : "lg:justify-start",
          )
        }
      >
        <FontAwesomeIcon icon={item.icon} className="w-4" />
        <span className={cn("min-w-0 truncate", desktopCollapsed ? "lg:hidden" : "")}>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <>
      {mobileOpen ? <div className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} /> : null}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-slate-950 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-slate-200 shadow-2xl shadow-slate-950/30 transition-[width,transform,padding] duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen
            ? "w-[min(86vw,320px)] px-4 sm:px-5 lg:translate-x-0 lg:w-[280px] lg:px-5"
            : "w-[min(86vw,320px)] px-4 sm:px-5 lg:translate-x-0 lg:w-[88px] lg:px-3",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] py-3.5",
            desktopCollapsed ? "px-4 lg:justify-center lg:px-3" : "px-4",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={workspaceLogo}
              alt={workspaceName}
              className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = logoMark;
              }}
            />
            <div className={cn("min-w-0", desktopCollapsed ? "lg:hidden" : "")}>
              <p className="truncate font-display text-lg font-bold text-white">{workspaceName}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                {ROLE_LABELS[profile?.role] || "Sistem"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onCloseMobile}
            aria-label="Tutup sidebar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          <div className="space-y-5">
            {navigationSections.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <p
                  className={cn(
                    "px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500",
                    desktopCollapsed ? "lg:hidden" : "",
                  )}
                >
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => renderNavigationItem(item))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {footerItems.length ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="space-y-1">
              {footerItems.map((item) => renderNavigationItem(item, { footer: true }))}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
