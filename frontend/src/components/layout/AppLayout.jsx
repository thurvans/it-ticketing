import { useEffect, useMemo, useState } from "react";
import { PageMetaProvider } from "@/context/PageMetaContext";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [pageMeta, setPageMeta] = useState({ title: "", description: "" });
  const pageMetaValue = useMemo(() => ({ pageMeta, setPageMeta }), [pageMeta]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", mobileSidebarOpen);

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [mobileSidebarOpen]);

  function handleToggleSidebar() {
    if (window.innerWidth >= 1024) {
      setDesktopSidebarOpen((current) => !current);
      return;
    }

    setMobileSidebarOpen((current) => !current);
  }

  return (
    <PageMetaProvider value={pageMetaValue}>
      <div className="min-h-screen bg-slate-25">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          desktopOpen={desktopSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <div className={desktopSidebarOpen ? "min-h-screen transition-[padding] duration-300 lg:pl-[280px]" : "min-h-screen transition-[padding] duration-300 lg:pl-[88px]"}>
          <Topbar onToggleSidebar={handleToggleSidebar} />
          <main className="px-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PageMetaProvider>
  );
}
