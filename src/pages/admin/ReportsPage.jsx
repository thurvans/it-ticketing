import { useEffect, useState } from "react";
import {
  faArrowsRotate,
  faFileExcel,
  faRotateLeft,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import {
  HorizontalBarDistributionChart,
  PieDistributionChart,
  RatingStarsChart,
  TrendAreaChart,
  VerticalBarDistributionChart,
} from "@/components/admin/ReportCharts";
import PageHeader from "@/components/common/PageHeader";
import ActionButton from "@/components/ui/ActionButton";
import FilterDropdown from "@/components/ui/FilterDropdown";
import FilterPanel from "@/components/ui/FilterPanel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useSystemAccess } from "@/hooks/useSystemAccess";
import { listCategories, listTechnicians, getReportSummary } from "@/services/adminService";
import { downloadExcelFile } from "@/utils/exporters";
import { formatDateTime } from "@/utils/formatters";

const TREND_TABS = [
  {
    value: "daily",
    label: "Harian",
    title: "Tren Harian",
    description: "Pergerakan jumlah tiket per hari pada periode yang sedang Anda pilih.",
  },
  {
    value: "weekly",
    label: "Mingguan",
    title: "Tren Mingguan",
    description: "Ringkasan jumlah tiket per minggu untuk membantu membaca pola operasional.",
  },
  {
    value: "monthly",
    label: "Bulanan",
    title: "Tren Bulanan",
    description: "Perbandingan volume tiket per bulan untuk melihat ritme kerja dalam jangka lebih panjang.",
  },
];

function formatHours(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} jam`;
}

function formatRating(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value.toFixed(1)} / 5`;
}

function normalizeTrendGroupBy(value) {
  return TREND_TABS.some((item) => item.value === value) ? value : "daily";
}

function getDefaultFilters() {
  return {
    startDate: "",
    endDate: "",
    status: "All",
    priority: "All",
    categoryId: "All",
    assignedTo: "All",
    department: "All",
  };
}

function countAdvancedFilters(filters) {
  return [filters.categoryId, filters.assignedTo, filters.department].filter((value) => value && value !== "All").length;
}

function TrendTabs({ value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Grouping tren">
      {TREND_TABS.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={
            value === item.value
              ? "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm"
              : "rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          }
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function buildExportRows(summary, filters, trendItems, trendGroupBy) {
  return [
    { section: "filters", label: "startDate", value: filters.startDate || "-" },
    { section: "filters", label: "endDate", value: filters.endDate || "-" },
    { section: "filters", label: "status", value: filters.status || "All" },
    { section: "filters", label: "priority", value: filters.priority || "All" },
    { section: "filters", label: "categoryId", value: filters.categoryId || "All" },
    { section: "filters", label: "assignedTo", value: filters.assignedTo || "All" },
    { section: "filters", label: "department", value: filters.department || "All" },
    { section: "filters", label: "groupBy", value: trendGroupBy },
    { section: "overview", label: "totalTickets", value: summary.totalTickets },
    { section: "overview", label: "overdueTickets", value: summary.overdueTickets },
    { section: "overview", label: "completedToday", value: summary.completedToday },
    { section: "overview", label: "avgResolutionHours", value: summary.avgResolutionHours ?? "-" },
    { section: "overview", label: "avgRating", value: summary.avgRating ?? "-" },
    ...summary.byStatus.map((item) => ({ section: "status", label: item.label, value: item.value })),
    ...summary.byPriority.map((item) => ({ section: "priority", label: item.label, value: item.value })),
    ...summary.byCategory.map((item) => ({ section: "category", label: item.label, value: item.value })),
    ...summary.byTechnician.map((item) => ({ section: "technician", label: item.label, value: item.value })),
    ...summary.byDepartment.map((item) => ({ section: "department", label: item.label, value: item.value })),
    ...summary.ratingDistribution.map((item) => ({ section: "rating", label: item.label, value: item.value })),
    ...trendItems.map((item) => ({ section: `trend:${trendGroupBy}`, label: item.label, value: item.value })),
  ];
}

export default function ReportsPage() {
  const { systemSettings } = useSystemAccess();
  const defaultTrendGroupBy = normalizeTrendGroupBy(systemSettings.default_report_group_by);
  const [summary, setSummary] = useState(null);
  const [trendGroups, setTrendGroups] = useState({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [filters, setFilters] = useState(getDefaultFilters);
  const [activeTrendTab, setActiveTrendTab] = useState(defaultTrendGroupBy);
  const [trendTabTouched, setTrendTabTouched] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", tone: "success" });

  useEffect(() => {
    if (!trendTabTouched) {
      setActiveTrendTab((current) => (current === defaultTrendGroupBy ? current : defaultTrendGroupBy));
    }
  }, [defaultTrendGroupBy, trendTabTouched]);

  async function loadReport(showRefreshingState = false) {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [dailySummary, weeklySummary, monthlySummary, categoryRows, technicianRows] = await Promise.all([
        getReportSummary({ ...filters, groupBy: "daily" }),
        getReportSummary({ ...filters, groupBy: "weekly" }),
        getReportSummary({ ...filters, groupBy: "monthly" }),
        listCategories(),
        listTechnicians(),
      ]);

      setSummary(dailySummary || weeklySummary || monthlySummary);
      setTrendGroups({
        daily: dailySummary?.trend || [],
        weekly: weeklySummary?.trend || [],
        monthly: monthlySummary?.trend || [],
      });
      setCategories(categoryRows);
      setTechnicians(technicianRows);
      setGeneratedAt(new Date().toISOString());
    } catch (error) {
      console.error(error);
      setToast({
        open: true,
        message: error.message || "Laporan tiket gagal dimuat.",
        tone: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filters]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleTrendTabChange(value) {
    setTrendTabTouched(true);
    setActiveTrendTab(value);
  }

  function handleResetFilters() {
    setFilters(getDefaultFilters());
    setShowAdvancedFilters(false);
  }

  function handleExportExcel() {
    if (!summary) {
      return;
    }

    downloadExcelFile(
      "laporan-ticketing",
      buildExportRows(summary, filters, trendGroups[activeTrendTab] || [], activeTrendTab),
      "Laporan Ticketing",
    );
    setToast({
      open: true,
      message: "Laporan Excel berhasil diekspor.",
      tone: "success",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Menyusun ringkasan laporan..." />
      </div>
    );
  }

  if (!summary) {
    return <div className="panel p-6 text-sm text-rose-700">Laporan tiket gagal dimuat.</div>;
  }

  const departmentOptions = [
    { value: "All", label: "Semua Departemen" },
    ...summary.departments.map((department) => ({ value: department, label: department })),
  ];
  const statusOptions = [{ value: "All", label: "Semua Status" }, ...summary.byStatus.map((item) => ({ value: item.label, label: item.label }))];
  const priorityOptions = [{ value: "All", label: "Semua Prioritas" }, ...summary.byPriority.map((item) => ({ value: item.label, label: item.label }))];
  const categoryOptions = [{ value: "All", label: "Semua Kategori" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  const technicianOptions = [
    { value: "All", label: "Semua Teknisi" },
    ...technicians.map((technician) => ({ value: technician.id, label: technician.full_name })),
  ];
  const activeTrendItems = trendGroups[activeTrendTab] || [];
  const activeTrend = TREND_TABS.find((item) => item.value === activeTrendTab) || TREND_TABS[0];
  const activeAdvancedFilters = countAdvancedFilters(filters);
  const hasQuickFilters = Boolean(filters.startDate || filters.endDate || filters.status !== "All" || filters.priority !== "All");
  const hasAnyFilters = hasQuickFilters || activeAdvancedFilters > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Tiket"
        description="Pantau statistik tiket melalui filter, grafik distribusi, dan tren operasional."
        actions={[
          <ActionButton
            key="refresh-report"
            label={refreshing ? "Memuat Ulang..." : "Perbarui Data"}
            icon={faArrowsRotate}
            disabled={refreshing}
            onClick={() => loadReport(true)}
          />,
          <ActionButton key="export-excel" label="Unduh Excel" icon={faFileExcel} tone="primary" onClick={handleExportExcel} />,
        ]}
      />

      <FilterPanel
        title="Filter Laporan Tiket"
        description="Fokuskan laporan berdasarkan periode, status, dan prioritas. Buka filter tambahan bila diperlukan."
        mobileCollapsible
        actions={
          <>
            <ActionButton
              label={showAdvancedFilters ? "Sembunyikan Filter Tambahan" : `Filter Tambahan${activeAdvancedFilters ? ` (${activeAdvancedFilters})` : ""}`}
              icon={faSliders}
              onClick={() => setShowAdvancedFilters((current) => !current)}
              mobileIconOnly={false}
            />
            <ActionButton label="Atur Ulang Filter" icon={faRotateLeft} onClick={handleResetFilters} disabled={!hasAnyFilters} mobileIconOnly={false} />
          </>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:gap-1.5 sm:rounded-2xl sm:px-3.5 sm:py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">Tanggal Mulai</span>
            <input
              type="date"
              name="startDate"
              className="input h-9 border-slate-200 bg-white/90 px-2.5 text-[13px] shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:h-10 sm:px-3 sm:text-sm"
              value={filters.startDate}
              onChange={(event) => handleFilterChange("startDate", event.target.value)}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:gap-1.5 sm:rounded-2xl sm:px-3.5 sm:py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">Tanggal Akhir</span>
            <input
              type="date"
              name="endDate"
              className="input h-9 border-slate-200 bg-white/90 px-2.5 text-[13px] shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:h-10 sm:px-3 sm:text-sm"
              value={filters.endDate}
              onChange={(event) => handleFilterChange("endDate", event.target.value)}
            />
          </label>
          <FilterDropdown
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={statusOptions}
          />
          <FilterDropdown
            label="Prioritas"
            value={filters.priority}
            onChange={(value) => handleFilterChange("priority", value)}
            options={priorityOptions}
          />
        </div>

        {showAdvancedFilters ? (
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 md:mt-3 md:gap-3 xl:grid-cols-3">
            <FilterDropdown
              label="Kategori"
              value={filters.categoryId}
              onChange={(value) => handleFilterChange("categoryId", value)}
              options={categoryOptions}
            />
            <FilterDropdown
              label="Teknisi"
              value={filters.assignedTo}
              onChange={(value) => handleFilterChange("assignedTo", value)}
              options={technicianOptions}
            />
            <FilterDropdown
              label="Departemen"
              value={filters.department}
              onChange={(value) => handleFilterChange("department", value)}
              options={departmentOptions}
            />
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <span>
            Ringkasan terakhir diperbarui pada <strong>{formatDateTime(generatedAt)}</strong>.
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Tampilan tren aktif: {activeTrend.label}
          </span>
        </div>
      </FilterPanel>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Total tiket</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{summary.totalTickets}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Melewati SLA</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{summary.overdueTickets}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Selesai hari ini</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{summary.completedToday}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Rata-rata penyelesaian</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{formatHours(summary.avgResolutionHours)}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm text-slate-500">Rating rata-rata</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{formatRating(summary.avgRating)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PieDistributionChart
          title="Sebaran Status"
          items={summary.byStatus}
          description="Pantau sebaran tiket pada setiap tahap penanganan."
          emptyText="Belum ada distribusi status untuk ditampilkan."
        />
        <VerticalBarDistributionChart
          title="Sebaran Prioritas"
          items={summary.byPriority}
          description="Lihat komposisi tiket berdasarkan tingkat urgensi saat ini."
          emptyText="Belum ada distribusi prioritas untuk ditampilkan."
        />
        <HorizontalBarDistributionChart
          title="Sebaran Kategori"
          items={summary.byCategory}
          description="Membantu melihat area masalah yang paling sering muncul."
          emptyText="Belum ada distribusi kategori untuk ditampilkan."
        />
        <HorizontalBarDistributionChart
          title="Sebaran Teknisi"
          items={summary.byTechnician}
          description="Pantau penugasan dan persebaran tiket ke setiap teknisi."
          emptyText="Belum ada distribusi teknisi untuk ditampilkan."
        />
        <HorizontalBarDistributionChart
          title="Sebaran Departemen"
          items={summary.byDepartment}
          description="Menunjukkan departemen yang paling banyak mengirim tiket."
          emptyText="Belum ada distribusi departemen untuk ditampilkan."
        />
        <RatingStarsChart
          title="Rating Kepuasan"
          items={summary.ratingDistribution}
          description="Ringkasan penilaian pengguna terhadap penyelesaian tiket."
          averageRating={summary.avgRating}
          emptyText="Belum ada rating kepuasan yang masuk."
        />
      </div>

      <TrendAreaChart
        title={activeTrend.title}
        description={activeTrend.description}
        items={activeTrendItems}
        emptyText="Belum ada data tren untuk grouping ini."
        actions={<TrendTabs value={activeTrendTab} onChange={handleTrendTabChange} />}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ open: false, message: "", tone: "success" })}
      />
    </div>
  );
}
