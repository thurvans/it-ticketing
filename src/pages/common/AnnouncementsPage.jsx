import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { listAnnouncements } from "@/services/ticketService";
import { formatDate } from "@/utils/formatters";

export default function AnnouncementsPage({ title, description }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const rows = await listAnnouncements();
        setAnnouncements(rows);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadAnnouncements();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-5">
          {announcements.length ? (
            announcements.map((announcement) => (
              <div key={announcement.id} className="panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{announcement.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Aktif {formatDate(announcement.start_date)} - {formatDate(announcement.end_date)}
                    </p>
                  </div>
                  <span className={announcement.is_active ? "badge bg-emerald-100 text-emerald-700" : "badge bg-slate-100 text-slate-700"}>
                    {announcement.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{announcement.content}</p>
              </div>
            ))
          ) : (
            <div className="panel px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-950">Belum ada pengumuman</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Informasi sistem dan pemberitahuan layanan akan tampil di halaman ini setelah diterbitkan.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
