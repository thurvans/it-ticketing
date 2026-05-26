import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/utils/formatters";
import { getTicketDetailPath } from "@/utils/routeHelpers";

export default function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onNotificationOpen,
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

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

  async function handleNotificationClick(notification) {
    if (notification?.id && onNotificationOpen) {
      await onNotificationOpen(notification.id);
    }

    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button type="button" className="btn-secondary h-10 w-10 rounded-xl p-0 sm:h-11 sm:w-11" onClick={() => setOpen(!open)}>
        <span className="relative">
          <FontAwesomeIcon icon={faBell} />
          {unreadCount ? (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </span>
      </button>

      {open ? (
        <div className="panel absolute right-0 z-40 mt-3 w-[min(92vw,360px)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-950">Notifikasi</h3>
              <p className="text-xs text-slate-500">Pembaruan penting terkait tiket dan tindak lanjut layanan.</p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-brand-700"
              onClick={async () => {
                await onMarkAllRead?.();
                setOpen(false);
              }}
            >
              Tandai dibaca
            </button>
          </div>

          <div className="max-h-[min(65vh,28rem)] space-y-3 overflow-y-auto pr-1">
            {notifications?.length ? (
              notifications.map((notification) => {
                const notificationBodyClass = `rounded-xl border px-4 py-3 ${
                  notification.is_read ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"
                }`;

                if (notification.related_ticket_id) {
                  return (
                    <Link
                      key={notification.id}
                      to={getTicketDetailPath(profile?.role, notification.related_ticket_id)}
                      className={`block transition hover:border-brand-300 ${notificationBodyClass}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.created_at)}</p>
                    </Link>
                  );
                }

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={`block w-full text-left transition hover:border-brand-300 ${notificationBodyClass}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.created_at)}</p>
                  </button>
                );
              })
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Belum ada notifikasi baru.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
