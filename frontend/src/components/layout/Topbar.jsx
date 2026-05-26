import { useEffect, useState } from "react";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import ProfileDropdown from "@/components/ui/ProfileDropdown";
import { usePageMeta } from "@/context/PageMetaContext";
import { useAuth } from "@/hooks/useAuth";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  subscribeToNotifications,
} from "@/services/ticketService";
import { APP_NAME } from "@/utils/constants";

export default function Topbar({ onToggleSidebar }) {
  const { profile } = useAuth();
  const { systemSettings } = useSystemAccess();
  const { pageMeta } = usePageMeta();
  const [notifications, setNotifications] = useState([]);
  const workspaceName = systemSettings.display_name || APP_NAME;
  const currentPageTitle = pageMeta.title || "IT Service Desk";

  useEffect(() => {
    async function loadNotifications() {
      if (!profile?.id) {
        return;
      }

      try {
        const data = await listNotifications(profile.id);
        setNotifications(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadNotifications();

    function handleNotificationsChanged(event) {
      const eventUserId = event?.detail?.userId;

      if (!eventUserId || eventUserId === profile?.id) {
        loadNotifications();
      }
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    const unsubscribeRealtime =
      systemSettings.enable_realtime_notifications !== false
        ? subscribeToNotifications(profile?.id, loadNotifications)
        : () => {};

    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
      unsubscribeRealtime();
    };
  }, [profile?.id, systemSettings.enable_realtime_notifications]);

  async function handleMarkAllRead() {
    try {
      const data = await markAllNotificationsRead(profile.id);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleNotificationOpen(notificationId) {
    if (!profile?.id || !notificationId) {
      return;
    }

    try {
      const data = await markNotificationRead(profile.id, notificationId);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
        <button
          type="button"
          className="btn-secondary h-10 w-10 rounded-xl p-0 sm:h-11 sm:w-11"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-[11px]">{workspaceName}</p>
          <h1 className="mt-1 truncate text-base font-semibold text-slate-950 sm:text-[1.45rem]" title={currentPageTitle}>
            {currentPageTitle}
          </h1>
          {pageMeta.description ? <p className="mt-1 hidden truncate text-sm text-slate-500 lg:block">{pageMeta.description}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onNotificationOpen={handleNotificationOpen}
          />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
