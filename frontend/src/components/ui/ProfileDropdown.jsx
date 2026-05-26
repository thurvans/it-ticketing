import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  faArrowRightFromBracket,
  faChevronDown,
  faUserGear,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/hooks/useAuth";
import { cn, getInitials, humanizeRole } from "@/utils/formatters";
import { profilePathByRole } from "@/utils/navigation";

export default function ProfileDropdown() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const profilePath = profilePathByRole[profile?.role];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await signOut();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm transition hover:border-slate-300 sm:px-3"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Buka menu profil"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 sm:h-11 sm:w-11">
          {getInitials(profile?.full_name)}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-sm font-semibold text-slate-950">{profile?.full_name}</p>
          <p className="truncate text-xs text-slate-500">{humanizeRole(profile?.role)}</p>
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={cn(
            "text-xs text-slate-400 transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>

      {open ? (
        <div className="panel absolute right-0 z-40 mt-3 w-[min(88vw,16rem)] p-2">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-950">{profile?.full_name}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{humanizeRole(profile?.role)}</p>
          </div>

          <div className="mt-2 space-y-1">
            {profilePath ? (
              <Link
                to={profilePath}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setOpen(false)}
              >
                <FontAwesomeIcon icon={faUserGear} className="w-4" />
                <span>Profil</span>
              </Link>
            ) : null}

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
