import { useEffect, useState } from "react";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import DataTable from "@/components/ui/DataTable";
import FilterPanel from "@/components/ui/FilterPanel";
import FilterDropdown from "@/components/ui/FilterDropdown";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import SearchInput from "@/components/ui/SearchInput";
import { listAuditLogs } from "@/services/adminService";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadLogs() {
      try {
        const rows = await listAuditLogs();
        setLogs(rows);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const moduleOptions = [
    { value: "All", label: "Semua Modul" },
    ...Array.from(new Set(logs.map((log) => log.module).filter(Boolean))).map((moduleName) => ({
      value: moduleName,
      label: moduleName,
    })),
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesQuery =
      !query ||
      [log.action, log.description, log.user?.full_name, log.ip_address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query.toLowerCase()));

    const matchesModule = moduleFilter === "All" || log.module === moduleFilter;

    return matchesQuery && matchesModule;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / DEFAULT_PAGE_SIZE));
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const pageRows = filteredLogs.slice(pageStart, pageStart + DEFAULT_PAGE_SIZE);
  const hasActiveFilters = Boolean(query || moduleFilter !== "All");
  function handleResetFilters() {
    setCurrentPage(1);
    setQuery("");
    setModuleFilter("All");
  }

  const columns = [
    {
      key: "time",
      header: "Waktu",
      render: (log) => formatDateTime(log.created_at),
    },
    {
      key: "user",
      header: "Pengguna",
      render: (log) => log.user?.full_name || "Sistem",
    },
    {
      key: "module",
      header: "Modul",
      render: (log) => log.module || "-",
    },
    {
      key: "action",
      header: "Aksi",
      render: (log) => log.action || "-",
    },
    {
      key: "description",
      header: "Deskripsi",
      render: (log) => (
        <div className="max-w-[320px] space-y-1">
          <p className="text-sm text-slate-700">{log.description || "-"}</p>
          <p className="text-xs text-slate-400">{log.ip_address || "-"}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Audit"
        description="Pantau jejak aktivitas penting untuk kebutuhan pengawasan, kepatuhan, dan penelusuran perubahan."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Aktivitas</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{logs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ditampilkan</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{pageRows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Modul</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{moduleOptions.length - 1}</p>
        </div>
      </div>

      <FilterPanel
        title="Saring Aktivitas"
        description="Cari aktivitas berdasarkan kata kunci atau modul terkait."
        actions={<ActionButton label="Atur Ulang Filter" icon={faRotateLeft} onClick={handleResetFilters} disabled={!hasActiveFilters} mobileIconOnly={false} />}
        mobileCollapsible
        contentClassName="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-3"
      >
          <SearchInput
            className="sm:col-span-2"
            value={query}
            onChange={(value) => {
              setCurrentPage(1);
              setQuery(value);
            }}
            placeholder="Cari tindakan, deskripsi, nama pengguna, atau alamat IP"
          />
          <FilterDropdown
            label="Modul"
            value={moduleFilter}
            onChange={(value) => {
              setCurrentPage(1);
              setModuleFilter(value);
            }}
            options={moduleOptions}
          />
      </FilterPanel>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={pageRows}
          currentPage={Math.min(currentPage, totalPages)}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          emptyTitle="Belum ada audit log"
          emptyText="Riwayat aktivitas akan muncul di sini setelah ada perubahan penting di sistem."
        />
      )}
    </div>
  );
}
